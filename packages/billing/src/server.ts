import"server-only";import{requireAuthenticatedUser,requireCapability}from"@negosyo-os/auth";import{createClient}from"@negosyo-os/auth/server";import{BusinessIdSchema}from"@negosyo-os/business";import{AppError,ERROR_CODES}from"@negosyo-os/core/errors";import{PERMISSIONS}from"@negosyo-os/core/permissions";import{PlanKeySchema,PlanSchema,SubscriptionDashboardSchema,SubscriptionFeatureKeySchema,SubscriptionLimitResultSchema,SubscriptionOperationSchema,UsageLimitSchema,type Plan,type PlanKey,type SubscriptionDashboard,type SubscriptionFeatureKey,type SubscriptionOperation}from"./index";
import { beginPaymongoCheckout } from "./paymongo-server";
import { BillingIntervalSchema, checkoutQuote } from "./pricing";
import { PaymongoError } from "./paymongo";
export { checkoutAvailability } from "./paymongo";
export { receivePaymongoWebhook } from "./paymongo-server";
const fail=(message:string,cause:unknown)=>new AppError({code:ERROR_CODES.internal,message,status:500,cause,expose:false});async function access(businessId:string,manage=false){const id=BusinessIdSchema.parse(businessId),client=await createClient(),user=await requireAuthenticatedUser(client);await requireCapability(user,manage?PERMISSIONS.subscriptionManage:PERMISSIONS.subscriptionRead,{businessId:id},client);return{id,client};}
export async function listPlans():Promise<readonly Plan[]>{const client=await createClient(),[plans,features,limits]=await Promise.all([client.from("plans").select("key,name,description,tier_rank,grace_period_days").eq("is_active",true).eq("is_public",true).order("tier_rank"),client.from("subscription_features").select("plan_key,feature_key").eq("is_enabled",true),client.from("usage_limits").select("plan_key,usage_key,limit_value,period")]),error=plans.error??features.error??limits.error;if(error||!plans.data||!features.data||!limits.data)throw fail("Plans could not be loaded.",error);const featureRows=features.data,limitRows=limits.data;return plans.data.map(plan=>PlanSchema.parse({key:plan.key,name:plan.name,description:plan.description,tierRank:plan.tier_rank,gracePeriodDays:plan.grace_period_days,features:featureRows.filter(item=>item.plan_key===plan.key).map(item=>item.feature_key),limits:limitRows.filter(item=>item.plan_key===plan.key).map(item=>({key:item.usage_key,limit:item.limit_value===null?null:Number(item.limit_value),period:item.period}))}));}
export async function getSubscriptionDashboard(businessId:string):Promise<SubscriptionDashboard>{const{id,client}=await access(businessId),{data,error}=await client.rpc("get_subscription_dashboard",{requested_organization_id:id});if(error)throw fail("Subscription could not be loaded.",error);return SubscriptionDashboardSchema.parse(data);}
export async function requireSubscriptionFeature(businessId:string,feature:SubscriptionFeatureKey):Promise<void>{const id=BusinessIdSchema.parse(businessId),key=SubscriptionFeatureKeySchema.parse(feature),client=await createClient(),{error}=await client.rpc("assert_subscription_feature",{requested_organization_id:id,requested_feature_key:key});if(error)throw new AppError({code:ERROR_CODES.permissionDenied,message:"Your current subscription does not include this feature.",status:403,cause:error,expose:true});}
export async function checkSubscriptionLimit(businessId:string,usageKey:"max_branches"|"max_active_users"|"monthly_transactions",delta=0){const{id,client}=await access(businessId),input=UsageLimitSchema.shape.key.parse(usageKey),{data,error}=await client.rpc("check_subscription_limit",{requested_organization_id:id,requested_usage_key:input,requested_delta:delta});if(error)throw fail("Subscription limit could not be checked.",error);return SubscriptionLimitResultSchema.parse(data);}
export async function requestSubscriptionChange(businessId:string,operation:SubscriptionOperation,planKey?:PlanKey):Promise<string>{const{id,client}=await access(businessId,true),op=SubscriptionOperationSchema.parse(operation),current=await getSubscriptionDashboard(id),target=PlanKeySchema.parse(planKey??current.planKey),{data,error}=await client.rpc("request_subscription_change",{requested_organization_id:id,requested_operation:op,requested_plan_key:target,requested_idempotency_key:`request:${crypto.randomUUID()}`});if(error)throw new AppError({code:["22023","42501"].includes(error.code??"")?ERROR_CODES.conflict:ERROR_CODES.internal,message:error.code==="22023"?error.message??"Invalid subscription request.":"Subscription request could not be saved.",status:error.code==="42501"?403:error.code==="22023"?409:500,cause:error,expose:error.code==="22023"});return String(data);}

export async function startSubscriptionCheckout(businessId: string, planKey: string, intervalValue: string, branches: number) {
  const { id, client } = await access(businessId, true);
  const plan = PlanKeySchema.parse(planKey), interval = BillingIntervalSchema.parse(intervalValue);
  const quote = checkoutQuote(plan, interval, branches);
  await getSubscriptionDashboard(id); // Ensure the subscription exists before reserving a quote.
  const { data: target, error } = await client.from("plans").select("name").eq("key", plan).eq("is_active", true).eq("is_public", true).single();
  if (error || !target) throw new PaymongoError("This plan is unavailable.");
  const { count, error: countError } = await client.from("branches").select("id", { count: "exact", head: true }).eq("organization_id", id);
  if (countError || count === null) throw new PaymongoError("Branch capacity could not be checked.", 503);
  if (count > quote.branchLimit) throw new PaymongoError("Choose a plan and branch capacity that cover your existing branches.");
  return beginPaymongoCheckout(id, plan, target.name, interval, branches);
}

export async function listPaymentCheckouts(businessId: string) {
  const { id, client } = await access(businessId);
  const { data, error } = await client.from("payment_checkouts")
    .select("id,plan_key,billing_interval,branch_limit,amount_centavos,status,checkout_url,created_at,paid_at,period_end")
    .eq("organization_id", id).order("created_at", { ascending: false }).limit(20);
  if (error) throw fail("Payment history could not be loaded.", error);
  return data;
}
