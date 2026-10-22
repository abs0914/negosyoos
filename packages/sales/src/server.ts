import "server-only";

import { requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { createClient } from "@negosyo-os/auth/server";
import { BusinessIdSchema } from "@negosyo-os/business";
import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import type { Json, Tables } from "@negosyo-os/database";
import type { PosCatalogItem, SaleLine, SalePayment, SalesCustomer, SalesDashboard, SalesTransaction } from "./models";
import { CustomerIdSchema, ReturnSaleSchema, SaleIdSchema, SaveCustomerSchema, SavePosTransactionSchema, VoidSaleSchema, type ReturnSaleInput, type SaveCustomerInput, type SavePosTransactionInput, type VoidSaleInput } from "./schemas";

type CustomerRow=Tables<"sales_customers">;type SaleRow=Tables<"sales_transactions">;type LineRow=Tables<"sales_lines">;type PaymentRow=Tables<"sales_payments">;
const fail=(message:string,cause:unknown)=>new AppError({code:ERROR_CODES.internal,message,status:500,cause,expose:false});
function mutation(error:{code?:string;message?:string}){if(error.code==="42501")return new AppError({code:ERROR_CODES.permissionDenied,message:"You cannot perform this sales operation.",status:403,cause:error});if(["22023","23505","P0001"].includes(error.code??""))return new AppError({code:ERROR_CODES.validationFailed,message:error.message??"Invalid sales operation.",status:400,cause:error});return fail("The sales operation failed.",error);}
function customer(row:CustomerRow):SalesCustomer{return{id:row.id,businessId:row.organization_id,name:row.name,phone:row.phone,email:row.email,transactionCount:row.transaction_count,totalSpend:Number(row.total_spend),lastTransactionAt:row.last_transaction_at,createdAt:row.created_at,updatedAt:row.updated_at};}
function line(row:LineRow):SaleLine{return{id:row.id,businessId:row.organization_id,saleId:row.sale_id,productVariantId:row.product_variant_id,inventoryItemId:row.inventory_item_id,productName:row.product_name,variantName:row.variant_name,sku:row.sku,quantity:Number(row.quantity),unitPrice:Number(row.unit_price),discountAmount:Number(row.discount_amount),subtotal:Number(row.subtotal),taxAmount:Number(row.tax_amount),total:Number(row.total),unitCost:Number(row.unit_cost),returnedQuantity:Number(row.returned_quantity)};}
function payment(row:PaymentRow):SalePayment{return{id:row.id,businessId:row.organization_id,saleId:row.sale_id,method:row.payment_method as SalePayment["method"],amount:Number(row.amount),reference:row.reference,status:row.status as SalePayment["status"],createdAt:row.created_at};}
function sale(row:SaleRow,lines:readonly SaleLine[]=[],payments:readonly SalePayment[]=[],assigned?:SalesCustomer|null):SalesTransaction{return{id:row.id,businessId:row.organization_id,branchId:row.branch_id,inventoryLocationId:row.inventory_location_id,customerId:row.customer_id,receiptNumber:row.receipt_number,status:row.status as SalesTransaction["status"],subtotal:Number(row.subtotal),discountTotal:Number(row.discount_total),taxTotal:Number(row.tax_total),total:Number(row.total),amountPaid:Number(row.amount_paid),changeAmount:Number(row.change_amount),currency:row.currency,clientTransactionId:row.client_transaction_id,clientCreatedAt:row.client_created_at,completedAt:row.completed_at,voidedAt:row.voided_at,createdBy:row.created_by,createdAt:row.created_at,updatedAt:row.updated_at,lines,payments,...(assigned!==undefined?{customer:assigned}:{})};}
async function reader(businessId:string){const id=BusinessIdSchema.parse(businessId);const client=await createClient();const user=await requireAuthenticatedUser(client);await requireCapability(user,PERMISSIONS.salesRead,{businessId:id},client);return{id,client};}
export async function listPosCatalog(businessId:string,locationId:string):Promise<readonly PosCatalogItem[]>{const{id,client}=await reader(businessId);const[products,variants,items,balances]=await Promise.all([client.from("products").select("id,name,default_unit,selling_price,tax_type,tax_rate").eq("organization_id",id).eq("status","active"),client.from("product_variants").select("id,product_id,name,sku,barcode,unit,selling_price,status").eq("organization_id",id).eq("status","active"),client.from("inventory_items").select("id,product_variant_id,is_tracked").eq("organization_id",id),client.from("stock_balances").select("inventory_item_id,quantity").eq("organization_id",id).eq("location_id",locationId)]);const error=products.error??variants.error??items.error??balances.error;if(error)throw fail("POS catalog could not be loaded.",error);const productMap=new Map((products.data??[]).map(value=>[value.id,value]));const inventoryMap=new Map((items.data??[]).map(value=>[value.product_variant_id,value]));const balanceMap=new Map((balances.data??[]).map(value=>[value.inventory_item_id,Number(value.quantity)]));return(variants.data??[]).flatMap(variant=>{const product=productMap.get(variant.product_id);if(!product)return[];const inventory=inventoryMap.get(variant.id);return[{id:variant.id,productId:product.id,name:product.name,variantName:variant.name,sku:variant.sku,barcode:variant.barcode,unit:variant.unit??product.default_unit,price:Number(variant.selling_price??product.selling_price),taxType:product.tax_type,taxRate:Number(product.tax_rate),availableQuantity:inventory?.is_tracked?balanceMap.get(inventory.id)??0:null}];});}
export async function listSalesCustomers(businessId:string){const{id,client}=await reader(businessId);const result=await client.from("sales_customers").select("*").eq("organization_id",id).order("name").limit(500);if(result.error)throw fail("Customers could not be loaded.",result.error);return result.data.map(customer);}
export async function listSales(businessId:string,limit=50){const{id,client}=await reader(businessId);const result=await client.from("sales_transactions").select("*").eq("organization_id",id).order("created_at",{ascending:false}).limit(Math.min(200,Math.max(1,limit)));if(result.error)throw fail("Sales could not be loaded.",result.error);return result.data.map(row=>sale(row));}
export async function getSale(businessId:string,saleId:string){const{id,client}=await reader(businessId);const parsed=SaleIdSchema.parse(saleId);const[result,lines,payments,customers]=await Promise.all([client.from("sales_transactions").select("*").eq("organization_id",id).eq("id",parsed).single(),client.from("sales_lines").select("*").eq("organization_id",id).eq("sale_id",parsed).order("created_at"),client.from("sales_payments").select("*").eq("organization_id",id).eq("sale_id",parsed).order("created_at"),client.from("sales_customers").select("*").eq("organization_id",id)]);const error=result.error??lines.error??payments.error??customers.error;if(error||!result.data)throw fail("Sale could not be loaded.",error);const assigned=result.data.customer_id?(customers.data??[]).find(value=>value.id===result.data.customer_id):undefined;return sale(result.data,(lines.data??[]).map(line),(payments.data??[]).map(payment),assigned?customer(assigned):null);}
export async function getSalesDashboard(businessId: string): Promise<SalesDashboard> {
  const { id, client } = await reader(businessId);
  // Business settings currently support Asia/Manila only (UTC+08, no DST).
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const start = new Date(`${today}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 86_400_000);
  let offset = 0;
  let expectedCount: number | null = null;
  let totalCentavos = 0;
  // Recent activity is a preview, never the source for a daily financial total.
  // Follow the actual returned length because the API may cap pages below 500.
  do {
    const result = await client.from("sales_transactions")
      .select("id,total", { count: "exact" })
      .eq("organization_id", id)
      .in("status", ["completed", "partially_returned", "returned", "refunded"])
      .gte("completed_at", start.toISOString())
      .lt("completed_at", end.toISOString())
      .order("completed_at").order("id")
      .range(offset, offset + 499);
    if (result.error || result.count === null || !result.data) {
      throw fail("Today's sales could not be calculated.", result.error);
    }
    if (expectedCount !== null && expectedCount !== result.count) {
      throw fail("Sales changed while calculating the daily total. Refresh to try again.", null);
    }
    expectedCount = result.count;
    if (!result.data.length && offset < expectedCount) {
      throw fail("The daily sales result was incomplete.", null);
    }
    for (const row of result.data) totalCentavos += Math.round(Number(row.total) * 100);
    offset += result.data.length;
  } while (offset < expectedCount);

  const recentSales = await listSales(id, 20);
  const todaySales = totalCentavos / 100;
  // Original completed receipt totals, including tax, before returns/refunds.
  // Net sales and profit are separate metrics with different definitions.
  return { todaySales, todayTransactions: offset, averageSale: offset ? todaySales / offset : 0, recentSales };
}
export async function saveSalesCustomer(businessId:string,input:SaveCustomerInput){const id=BusinessIdSchema.parse(businessId);const parsed=SaveCustomerSchema.parse(input);const client=await createClient();const{data,error}=await client.rpc("save_sales_customer",{requested_organization_id:id,requested_customer_id:(parsed.customerId??null) as string,requested_name:parsed.name,requested_phone:parsed.phone,requested_email:parsed.email});if(error)throw mutation(error);return CustomerIdSchema.parse(data);}
export async function savePosTransaction(businessId:string,input:SavePosTransactionInput){const id=BusinessIdSchema.parse(businessId);const parsed=SavePosTransactionSchema.parse(input);const client=await createClient();const{data,error}=await client.rpc("save_pos_transaction",{requested_organization_id:id,requested_sale_id:(parsed.saleId??null) as string,requested_branch_id:parsed.branchId,requested_inventory_location_id:parsed.inventoryLocationId,requested_customer_id:(parsed.customerId??null) as string,requested_status:parsed.status,requested_client_transaction_id:parsed.clientTransactionId,requested_client_created_at:parsed.clientCreatedAt,requested_lines:parsed.lines as unknown as Json,requested_payments:parsed.payments as unknown as Json});if(error)throw mutation(error);return SaleIdSchema.parse(data);}
export async function returnSale(businessId:string,input:ReturnSaleInput){const id=BusinessIdSchema.parse(businessId);const parsed=ReturnSaleSchema.parse(input);const client=await createClient();const{data,error}=await client.rpc("return_sale",{requested_organization_id:id,requested_sale_id:parsed.saleId,requested_reason:parsed.reason,requested_lines:parsed.lines as unknown as Json,requested_refund_payments:parsed.refundPayments as unknown as Json,requested_client_return_id:parsed.clientReturnId});if(error)throw mutation(error);return String(data);}
export async function voidSale(businessId:string,input:VoidSaleInput){const id=BusinessIdSchema.parse(businessId);const parsed=VoidSaleSchema.parse(input);const client=await createClient();const user=await requireAuthenticatedUser(client);await requireCapability(user,PERMISSIONS.salesVoid,{businessId:id},client);const{error}=await client.rpc("void_sale",{requested_organization_id:id,requested_sale_id:parsed.saleId,requested_reason:parsed.reason});if(error)throw mutation(error);}
