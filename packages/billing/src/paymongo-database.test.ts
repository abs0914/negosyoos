import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Runs the real migration and existing settlement function against embedded PostgreSQL.
// Supabase auth/permission helpers are replaced by small tenant-scoped fixtures.
const db = new PGlite();
const org = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const migration = readFileSync(new URL("../../database/supabase/migrations/20260916063707_paymongo_checkout.sql", import.meta.url), "utf8");
const foundation = readFileSync(new URL("../../database/supabase/migrations/20260828052920_subscription_billing_architecture.sql", import.meta.url), "utf8");
const applyEvent = foundation.split(/\r?\n/).find(line => line.startsWith("create function public.apply_subscription_billing_event("))!;

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema private; create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
    create function private.can_business_permission(uuid,text,uuid) returns boolean language sql as $$select $1=auth.uid()$$;
    create function private.ensure_free_subscription(uuid) returns void language plpgsql as $$begin end$$;
    grant usage on schema private,auth to authenticated;
    create table public.organizations(id uuid primary key);
    create table public.plans(key text primary key,name text,description text,tier_rank integer,grace_period_days smallint);
    insert into public.plans values ('free_assessment','Free','Free',0,0),('starter','Starter','Starter',10,7),('pro','Pro','Pro',20,7),('growth','Growth','Growth',30,7),('multi_branch','Multi-branch','Multi',40,10);
    create table public.subscriptions(
      id uuid primary key default gen_random_uuid(),organization_id uuid unique references public.organizations(id),
      provider text not null default 'internal',plan_key text not null default 'free_assessment',status text not null default 'active',
      current_period_start timestamptz,current_period_end timestamptz,grace_period_end timestamptz,
      pending_plan_key text,cancel_at_period_end boolean default false,expired_at timestamptz,canceled_at timestamptz,
      version bigint default 1,entitlements jsonb not null default '{}'
    );
    create table public.usage_limits(plan_key text,usage_key text,limit_value bigint,period text);
    insert into public.usage_limits values ('multi_branch','max_branches',null,'current'),('starter','max_branches',1,'current');
    create table public.subscription_features(plan_key text,feature_key text,is_enabled boolean default true);
    insert into public.subscription_features values ('starter','sales',true),('multi_branch','sales',true);
    create table public.branches(id uuid primary key default gen_random_uuid(),organization_id uuid references public.organizations(id));
    create table public.organization_memberships(organization_id uuid,status text);
    create table public.sales_transactions(organization_id uuid,created_at timestamptz,status text);
    create table public.billing_events(id uuid primary key default gen_random_uuid(),organization_id uuid,subscription_id uuid,
      event_type text,provider text,external_event_id text,idempotency_key text,from_plan_key text,to_plan_key text,details jsonb,
      unique(provider,external_event_id),unique(organization_id,idempotency_key));
    insert into public.organizations values ('${org}'),('${other}');
    insert into public.subscriptions(organization_id) values ('${org}'),('${other}');
  `);
  await db.exec(applyEvent);
  await db.exec(migration);
}, 30000);
afterAll(async () => { await db.close(); });

async function checkout(options: { plan?: string; interval?: string; branches?: number; amount?: number } = {}) {
  const id = crypto.randomUUID();
  await db.query(`insert into public.payment_checkouts(id,organization_id,plan_key,billing_interval,branch_limit,amount_centavos,livemode)
    values($1,$2,$3,$4,$5,$6,false)`, [id, org, options.plan ?? "starter", options.interval ?? "monthly", options.branches ?? 1, options.amount ?? 49900]);
  return id;
}
async function settle(id: string, payment = "pay_" + id.replaceAll("-", ""), amount = 49900, mode = false, currency = "PHP", session = "cs_" + id.replaceAll("-", "")) {
  return db.query("select public.settle_paymongo_checkout($1,$2,$3,$4,$5,$6)", [id, session, payment, amount, currency, mode]);
}
async function transaction(run: () => Promise<void>) {
  await db.exec("begin");
  try { await run(); } finally { await db.exec("rollback"); }
}
async function subscription() { return (await db.query<{ plan_key: string; status: string; current_period_start: Date; current_period_end: Date; version: number; entitlements: Record<string, unknown> }>("select * from public.subscriptions where organization_id=$1", [org])).rows[0]!; }

describe("PayMongo database settlement", () => {
  it("activates the purchased plan only after confirmation, clearing trial-wide access", async () => transaction(async () => {
    await db.query("update public.subscriptions set entitlements=$1 where organization_id=$2", [{ trial: true, fullMvpAccess: true }, org]);
    const id = await checkout();
    expect((await subscription()).plan_key).toBe("free_assessment");
    await settle(id);
    const sub = await subscription();
    expect(sub.plan_key).toBe("starter"); expect(sub.status).toBe("active");
    expect(sub.entitlements).toEqual({ paymongoBranchLimit: 1, billingInterval: "monthly" });
    expect((await db.query("select status from public.payment_checkouts where id=$1", [id])).rows).toEqual([{ status: "paid" }]);
  }));
  it("deduplicates redelivery by payment and does not extend twice", async () => transaction(async () => {
    const id = await checkout(); await settle(id); const first = await subscription();
    await settle(id); expect(await subscription()).toEqual(first);
    expect((await db.query("select count(*)::int as n from public.billing_events")).rows[0]).toEqual({ n: 1 });
  }));
  it.each([
    [49899, false, "PHP"], [49900, true, "PHP"], [49900, false, "USD"],
  ] as const)("rejects an incorrect amount/mode/currency: %s %s %s", async (amount, mode, currency) => transaction(async () => {
    const id = await checkout();
    await expect(settle(id, "pay_invalid", amount, mode, currency)).rejects.toThrow("Payment does not match checkout");
  }));
  it("rejects a substituted checkout session", async () => transaction(async () => {
    const id = await checkout();
    await db.query("update public.payment_checkouts set provider_session_id='cs_original' where id=$1", [id]);
    await expect(settle(id)).rejects.toThrow("Payment does not match checkout");
  }));
  it("allows only one outstanding checkout per business", async () => transaction(async () => {
    await checkout(); await expect(checkout()).rejects.toThrow("payment_checkouts_one_pending");
  }));
  it("preserves prepaid time for same-plan renewal and supports annual calendar periods", async () => transaction(async () => {
    const first = await checkout(); await settle(first); const before = await subscription();
    const next = await checkout({ interval: "annual", amount: 499000 }); await settle(next, "pay_annual", 499000);
    const after = await subscription();
    expect(after.current_period_start).toEqual(before.current_period_end);
    expect(new Date(after.current_period_end).getUTCFullYear()).toBe(new Date(before.current_period_end).getUTCFullYear() + 1);
  }));
  it("enforces purchased extra-branch capacity and returns it in billing limits", async () => transaction(async () => {
    const id = await checkout({ plan: "multi_branch", branches: 4, amount: 624900 }); await settle(id, "pay_multi", 624900);
    await db.exec(`select set_config('test.actor','${org}',true)`);
    const result = await db.query<{ result: { limit: number } }>("select public.check_subscription_limit($1,'max_branches',0) as result", [org]);
    expect(result.rows[0]!.result.limit).toBe(4);
    for (let i = 0; i < 4; i++) await db.query("insert into public.branches(organization_id) values($1)", [org]);
    await expect(db.query("insert into public.branches(organization_id) values($1)", [org])).rejects.toThrow("branch capacity has been reached");
  }));
  it("rejects checkout capacity below existing branch usage", async () => transaction(async () => {
    await db.query("insert into public.branches(organization_id) values($1),($1)", [org]);
    await expect(checkout()).rejects.toThrow("does not cover the current branches");
  }));
  it("prevents branch growth beyond the pending checkout quote", async () => transaction(async () => {
    await checkout(); await db.query("insert into public.branches(organization_id) values($1)", [org]);
    await expect(db.query("insert into public.branches(organization_id) values($1)", [org])).rejects.toThrow("pending checkout");
  }));
  it("expires prepaid access before checking features", async () => transaction(async () => {
    const id = await checkout(); await settle(id);
    await db.query("update public.subscriptions set current_period_end=now()-interval '1 day' where organization_id=$1", [org]);
    await db.exec(`select set_config('test.actor','${org}',true)`);
    expect((await db.query("select private.subscription_feature_allowed($1,'sales') as allowed", [org])).rows[0]).toEqual({ allowed: false });
    expect((await subscription()).status).toBe("expired");
  }));
  it("prevents browser roles from settling payments", async () => transaction(async () => {
    const id = await checkout(); await db.exec("set local role authenticated");
    await expect(settle(id)).rejects.toThrow("permission denied");
  }));
  it("isolates checkout reads by business and denies anonymous access", async () => transaction(async () => {
    await checkout(); await db.exec(`set local role authenticated; select set_config('test.actor','${other}',true)`);
    expect((await db.query("select id from public.payment_checkouts")).rows).toEqual([]);
    await db.exec(`select set_config('test.actor','${org}',true)`);
    expect((await db.query("select id from public.payment_checkouts")).rows).toHaveLength(1);
    await db.exec("set local role anon");
    await expect(db.query("select id from public.payment_checkouts")).rejects.toThrow("permission denied");
  }));
});
