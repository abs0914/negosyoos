"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { PosCatalogItem, SalesCustomer } from "@negosyo-os/sales";
import { calculateSaleLine, paymentSummary } from "@negosyo-os/sales";
import type { PosCommandResult } from "@negosyo-os/pos-sync";
import { enqueueRegisterClose, enqueueSaleCommand, getQueueSummary, initializeLocalRegister, loadCart, saveCart, saveCatalog, syncPendingCommands, type LocalRegisterState } from "@/lib/pos-offline";
import { BarcodeCamera } from "./barcode-camera";

type CartLine = { item: PosCatalogItem; quantity: number; discount: number };
const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function PosRegister({ businessId, branchId, branchCode, locationId, catalog, catalogRevision, customers }: {
  businessId: string; branchId: string; branchCode: string; locationId: string; catalog: readonly PosCatalogItem[]; catalogRevision: string; customers: readonly SalesCustomer[];
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [cartRestoredAt, setCartRestoredAt] = useState<string>();
  const [customerId, setCustomerId] = useState("");
  const [cash, setCash] = useState("");
  const [digital, setDigital] = useState("");
  const [digitalReference, setDigitalReference] = useState("");
  const [register, setRegister] = useState<LocalRegisterState>();
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [queue, setQueue] = useState({ pending: 0, issues: 0 });
  const [message, setMessage] = useState<{ tone: "success" | "warning" | "error"; text: string }>();
  const [lastResult, setLastResult] = useState<PosCommandResult>();
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [actualCash, setActualCash] = useState("");
  const barcode = useRef<HTMLInputElement>(null);

  const refreshQueue = useCallback(async () => {
    const summary = await getQueueSummary(businessId);
    setQueue({ pending: summary.pending, issues: summary.issues });
  }, [businessId]);

  const synchronize = useCallback(async () => {
    if (!navigator.onLine || syncing) return [];
    setSyncing(true);
    try {
      const results = await syncPendingCommands(businessId);
      const newest = results.at(-1);
      if (newest) setLastResult(newest);
      setOnline(true);
      await refreshQueue();
      return results;
    } catch (error) {
      setOnline(false);
      setMessage({ tone: "warning", text: error instanceof Error ? `Saved locally. ${error.message}` : "Saved locally; synchronization will retry." });
      return [];
    } finally { setSyncing(false); }
  }, [businessId, refreshQueue, syncing]);

  useEffect(() => {
    let active = true;
    async function start() {
      setOnline(navigator.onLine);
      const restored = await loadCart<CartLine[]>(businessId, locationId);
      if (active && restored?.value.length) { setCart(restored.value); setCartRestoredAt(restored.updatedAt); }
      if (active) setCartReady(true);
      await saveCatalog(businessId, locationId, catalogRevision, catalog);
      try {
        const state = await initializeLocalRegister({ businessId, branchId, branchCode, inventoryLocationId: locationId });
        if (active) setRegister(state);
      } catch (error) {
        if (active) setMessage({ tone: "error", text: error instanceof Error ? error.message : "Register initialization failed." });
      }
      if (active) { await refreshQueue(); if (navigator.onLine) void synchronize(); }
    }
    void start();
    const connectivity = () => { setOnline(navigator.onLine); if (navigator.onLine) void synchronize(); };
    const serviceWorkerMessage = (event: MessageEvent<{ type?: string }>) => { if (event.data?.type === "NEGOSYO_POS_SYNC_REQUESTED") void synchronize(); };
    window.addEventListener("online", connectivity); window.addEventListener("offline", connectivity);
    navigator.serviceWorker?.addEventListener("message", serviceWorkerMessage);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && navigator.onLine) void synchronize(); }, 30_000);
    return () => { active = false; window.removeEventListener("online", connectivity); window.removeEventListener("offline", connectivity); navigator.serviceWorker?.removeEventListener("message", serviceWorkerMessage); window.clearInterval(timer); };
  }, [businessId, branchId, branchCode, locationId, catalog, catalogRevision, refreshQueue, synchronize]);

  useEffect(() => { if (cartReady) void saveCart(businessId, locationId, cart); }, [businessId, cart, cartReady, locationId]);

  const filtered = useMemo(() => catalog.filter((item) => `${item.name} ${item.variantName} ${item.sku} ${item.barcode ?? ""}`.toLowerCase().includes(deferredQuery)).slice(0, 60), [catalog, deferredQuery]);
  const computed = cart.map((entry) => ({ ...entry, totals: calculateSaleLine(entry.item.price, entry.quantity, entry.discount, entry.item.taxType as "inclusive" | "exclusive" | "exempt" | "zero_rated", entry.item.taxRate) }));
  const total = computed.reduce((sum, line) => sum + line.totals.total, 0);
  const summary = paymentSummary(total, [{ amount: Number(cash) || 0 }, { amount: Number(digital) || 0 }]);

  function add(item: PosCatalogItem) {
    setCart((current) => {
      const found = current.find((line) => line.item.id === item.id);
      return found ? current.map((line) => line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { item, quantity: 1, discount: 0 }];
    });
    setQuery("");
  }

  function addCode(code: string) {
    const item = catalog.find((value) => value.barcode === code.trim() || value.sku === code.trim());
    if (item) { add(item); setMessage(undefined); } else setMessage({ tone: "warning", text: `No product matched “${code}”.` });
    if (barcode.current) barcode.current.value = "";
    setCameraOpen(false);
  }

  async function completeSale() {
    if (!register || !cart.length || !summary.sufficient || busy) return;
    if (Number(digital) > 0 && digitalReference.trim().length < 3) { setMessage({ tone: "error", text: "Enter the digital payment provider reference." }); return; }
    if (new Date(register.leaseExpiresAt).getTime() <= Date.now() && !navigator.onLine) { setMessage({ tone: "error", text: "This register’s offline authorization expired. Reconnect before completing the sale." }); return; }
    setBusy(true);
    try {
      const command = await enqueueSaleCommand({
        register, customerId: customerId || null,
        lines: cart.map((line) => ({ productVariantId: line.item.id, quantity: line.quantity, discountAmount: line.discount })),
        payments: [...(Number(cash) > 0 ? [{ method: "cash" as const, amount: Number(cash), reference: "" }] : []), ...(Number(digital) > 0 ? [{ method: "digital" as const, amount: Number(digital), reference: digitalReference.trim() }] : [])],
      });
      const provisional = command.envelope.payload.type === "sale.complete" ? command.envelope.payload.provisionalReceiptNumber : command.commandId;
      setCart([]); setCash(""); setDigital(""); setDigitalReference(""); setCustomerId("");
      setMessage({ tone: "success", text: `Sale recorded durably as ${provisional}.` });
      await refreshQueue();
      if (navigator.onLine) {
        const results = await synchronize();
        const result = results.find((item) => item.commandId === command.commandId);
        if (result?.status === "applied" || result?.status === "duplicate") setMessage({ tone: "success", text: `Sale synchronized as ${result.receiptNumber ?? provisional}.` });
      }
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : "Sale could not be recorded locally." }); }
    finally { setBusy(false); }
  }

  async function closeRegister() {
    if (!register || actualCash === "" || Number(actualCash) < 0) return;
    setBusy(true);
    try {
      await enqueueRegisterClose(register, Number(actualCash));
      setMessage({ tone: "success", text: "Register close was recorded and will reconcile after synchronization." });
      await refreshQueue();
      if (navigator.onLine) await synchronize();
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : "Register close could not be recorded." }); }
    finally { setBusy(false); }
  }

  const tone = message?.tone === "error" ? "border-red-300 bg-red-50 text-red-950" : message?.tone === "warning" ? "border-amber-300 bg-amber-50 text-amber-950" : "border-emerald-300 bg-emerald-50 text-emerald-950";
  return <div className="grid min-h-[calc(100vh-110px)] xl:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
    <section className="p-3 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2 text-xs"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`}/><b>{online ? "Cloud connected" : "Offline recording"}</b><span className="text-muted-foreground">{syncing ? "Synchronizing…" : `${queue.pending} pending · ${queue.issues} issues`}</span></div><button className="min-h-10 rounded-lg border px-3 font-semibold disabled:opacity-40" disabled={!online || syncing} onClick={() => void synchronize()}>Sync now</button></div>
      <div className="grid grid-cols-[1fr_auto] gap-2"><input autoFocus className="min-h-12 min-w-0 rounded-xl border bg-card px-4 text-base" onChange={(event) => setQuery(event.target.value)} placeholder="Search products…" value={query}/><button className="min-h-12 rounded-xl border px-4 font-semibold" onClick={() => setCameraOpen(true)}>Camera</button></div>
      <div className="mt-2 flex gap-2"><input className="min-h-11 min-w-0 flex-1 rounded-xl border bg-card px-4 font-mono" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCode(event.currentTarget.value); } }} placeholder="Scan barcode or enter SKU" ref={barcode}/><button className="rounded-xl bg-primary px-5 font-semibold text-primary-foreground" onClick={() => addCode(barcode.current?.value ?? "")}>Add</button></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4">{filtered.map((item) => <button className="min-h-28 rounded-xl border bg-card p-3 text-left active:scale-[.98] disabled:opacity-40" disabled={item.availableQuantity !== null && item.availableQuantity <= 0 && online} key={item.id} onClick={() => add(item)}><b className="line-clamp-2">{item.name}</b><span className="mt-1 block text-xs text-muted-foreground">{item.variantName} · {item.sku}</span><span className="mt-2 block font-semibold text-primary">{money.format(item.price)}</span><span className="text-xs text-muted-foreground">{item.availableQuantity === null ? "Service / untracked" : `${item.availableQuantity} last known`}</span></button>)}</div>
    </section>
    <aside className="order-first flex max-h-[75vh] flex-col border-b bg-card p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:p-5 xl:order-last xl:max-h-none xl:border-b-0 xl:border-l">
      <div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-primary">NegosyoOS POS</p><h1 className="text-xl font-semibold">Current sale</h1></div><Link className="min-h-11 content-center text-sm font-semibold text-primary" href={`/business/${businessId}/sales`}>History</Link></div>
      {cartRestoredAt ? <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-950">Recovered the cart saved {new Intl.DateTimeFormat("en-PH", { timeStyle: "short" }).format(new Date(cartRestoredAt))}.</p> : null}
      <select className="mt-3 min-h-11 rounded-lg border bg-background px-3" onChange={(event) => setCustomerId(event.target.value)} value={customerId}><option value="">Walk-in customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
      <div className="mt-3 max-h-[32vh] flex-1 space-y-2 overflow-y-auto">{computed.map((line) => <div className="rounded-xl border p-3" key={line.item.id}><div className="flex justify-between gap-2"><div><b>{line.item.name}</b><p className="text-xs text-muted-foreground">{line.item.variantName} · {money.format(line.item.price)}</p></div><b>{money.format(line.totals.total)}</b></div><div className="mt-2 grid grid-cols-[2.75rem_3rem_2.75rem_1fr_auto] items-center gap-1"><button className="h-11 rounded-lg border text-lg" onClick={() => setCart((current) => current.map((value) => value.item.id === line.item.id ? { ...value, quantity: Math.max(1, value.quantity - 1) } : value))}>−</button><span className="text-center font-semibold">{line.quantity}</span><button className="h-11 rounded-lg border text-lg" onClick={() => setCart((current) => current.map((value) => value.item.id === line.item.id ? { ...value, quantity: value.quantity + 1 } : value))}>+</button><input aria-label={`Discount for ${line.item.name}`} className="h-11 min-w-0 rounded-lg border px-2 text-sm" inputMode="decimal" min="0" onChange={(event) => setCart((current) => current.map((value) => value.item.id === line.item.id ? { ...value, discount: Number(event.target.value) } : value))} placeholder="Discount ₱" type="number" value={line.discount || ""}/><button aria-label="Remove line" className="h-11 px-3 text-destructive" onClick={() => setCart((current) => current.filter((value) => value.item.id !== line.item.id))}>×</button></div></div>)}{!cart.length ? <p className="py-8 text-center text-sm text-muted-foreground">Scan or tap a product to begin.</p> : null}</div>
      <div className="mt-3 border-t pt-3 text-sm"><div className="flex justify-between"><span>Tax</span><span>{money.format(computed.reduce((sum, line) => sum + line.totals.tax, 0))}</span></div><div className="mt-1 flex justify-between text-2xl font-semibold"><span>Total</span><span>{money.format(total)}</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-semibold">Cash<input className="mt-1 min-h-12 w-full rounded-lg border px-3 text-base" inputMode="decimal" min="0" onChange={(event) => setCash(event.target.value)} placeholder="₱0.00" type="number" value={cash}/></label><label className="text-xs font-semibold">Digital<input className="mt-1 min-h-12 w-full rounded-lg border px-3 text-base" inputMode="decimal" min="0" onChange={(event) => setDigital(event.target.value)} placeholder="₱0.00" type="number" value={digital}/></label></div>
        {Number(digital) > 0 ? <label className="mt-2 block text-xs font-semibold">Provider reference<input className="mt-1 min-h-12 w-full rounded-lg border px-3 text-base" onChange={(event) => setDigitalReference(event.target.value)} placeholder="e.g. GCash reference" value={digitalReference}/><span className="mt-1 block font-normal text-amber-700">Recorded offline digital payments remain pending until a manager verifies them.</span></label> : null}
        <p className="mt-2 text-right text-xs text-muted-foreground">Paid {money.format(summary.paid)} · Change {money.format(summary.change)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2"><button className="min-h-12 rounded-xl border font-semibold" disabled={!cart.length} onClick={() => setMessage({ tone: "success", text: "Cart is parked safely on this device." })}>Park cart</button><button className="min-h-12 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50" disabled={busy || !register || !cart.length || !summary.sufficient} onClick={() => void completeSale()}>{busy ? "Recording…" : online ? "Complete sale" : "Record offline"}</button></div>
        {message ? <div className={`mt-3 rounded-xl border p-3 text-sm ${tone}`}>{message.text}{lastResult?.saleId ? <><br/><Link className="font-semibold underline" href={`/business/${businessId}/sales/${lastResult.saleId}`}>Open canonical receipt</Link></> : null}</div> : null}
        <details className="mt-3 rounded-xl border p-3"><summary className="cursor-pointer text-sm font-semibold">Register and recovery</summary><dl className="mt-2 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-muted-foreground">Register</dt><dd>{register?.registerCode ?? "Initializing…"}</dd></div><div><dt className="text-muted-foreground">Offline through</dt><dd>{register ? new Intl.DateTimeFormat("en-PH", { dateStyle: "short", timeStyle: "short" }).format(new Date(register.leaseExpiresAt)) : "—"}</dd></div></dl><label className="mt-3 block text-xs font-semibold">Actual closing cash<input className="mt-1 min-h-11 w-full rounded-lg border px-3" inputMode="decimal" min="0" onChange={(event) => setActualCash(event.target.value)} type="number" value={actualCash}/></label><button className="mt-2 min-h-11 w-full rounded-lg border font-semibold disabled:opacity-40" disabled={!register || actualCash === "" || busy} onClick={() => void closeRegister()}>Close and reconcile register</button>{queue.issues ? <Link className="mt-2 block text-center text-sm font-semibold text-destructive underline" href={`/business/${businessId}/audit#pos-operations`}>{queue.issues} local command issue(s) need review</Link> : null}</details>
      </div>
    </aside>
    {cameraOpen ? <BarcodeCamera onClose={() => setCameraOpen(false)} onDetected={addCode}/> : null}
  </div>;
}
