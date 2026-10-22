import { z } from "zod";
import { CATALOG_UNITS, PRODUCT_STATUSES, PRODUCT_TYPES, TAX_TYPES } from "./models";
const id=z.uuid(); const label=z.string().trim().min(1).max(160); const money=z.coerce.number().finite().min(0).max(999_999_999.9999);
export const ProductIdSchema=id; export const CategoryIdSchema=id; export const BrandIdSchema=id;
export const ProductVariantInputSchema=z.strictObject({ id:id.optional(),name:z.string().trim().min(1).max(120),sku:z.string().trim().min(1).max(100),barcode:z.string().trim().max(100).default(""),attributes:z.record(z.string().trim().min(1).max(40),z.string().trim().min(1).max(120)).default({}),unit:z.enum(CATALOG_UNITS).optional(),sellingPrice:money.optional(),costPrice:money.optional(),status:z.enum(["active","inactive"]).default("active") });
export const ProductImageInputSchema=z.strictObject({url:z.url().max(2_000),altText:z.string().trim().max(200).default(""),isPrimary:z.boolean().default(false)});
export const SaveProductInputSchema=z.strictObject({ productId:id.optional(),branchId:id.nullable().default(null),type:z.enum(PRODUCT_TYPES),name:label,description:z.string().trim().max(5_000).default(""),categoryId:id.nullable().default(null),brandId:id.nullable().default(null),defaultUnit:z.enum(CATALOG_UNITS),sellingPrice:money,costPrice:money,taxType:z.enum(TAX_TYPES),taxRate:z.coerce.number().finite().min(0).max(100),status:z.enum(PRODUCT_STATUSES),hasVariants:z.boolean(),variants:z.array(ProductVariantInputSchema).min(1).max(100),images:z.array(ProductImageInputSchema).max(20).default([]) }).superRefine((product,context)=>{
  if(!product.hasVariants&&product.variants.length!==1)context.addIssue({code:"custom",path:["variants"],message:"A product without variants must have one default SKU."});
  if(new Set(product.variants.map((variant)=>variant.sku.toLowerCase())).size!==product.variants.length)context.addIssue({code:"custom",path:["variants"],message:"SKUs must be unique."});
  const barcodes=product.variants.map((variant)=>variant.barcode).filter(Boolean).map((value)=>value.toLowerCase());if(new Set(barcodes).size!==barcodes.length)context.addIssue({code:"custom",path:["variants"],message:"Barcodes must be unique."});
  if(product.images.filter((image)=>image.isPrimary).length>1)context.addIssue({code:"custom",path:["images"],message:"Choose at most one primary image."});
  if(["exempt","zero_rated"].includes(product.taxType)&&product.taxRate!==0)context.addIssue({code:"custom",path:["taxRate"],message:"Exempt and zero-rated products require a zero tax rate."});
});
export const SaveCategoryInputSchema=z.strictObject({categoryId:id.optional(),name:label,description:z.string().trim().max(500).default(""),status:z.enum(["active","inactive"]).default("active")});
export const SaveBrandInputSchema=z.strictObject({brandId:id.optional(),name:label,description:z.string().trim().max(500).default(""),status:z.enum(["active","inactive"]).default("active")});
export const CatalogQuerySchema=z.strictObject({search:z.string().trim().max(120).default(""),barcode:z.string().trim().max(100).default(""),status:z.enum(PRODUCT_STATUSES).optional(),branchId:id.optional()});
export type SaveProductInput=z.input<typeof SaveProductInputSchema>; export type SaveCategoryInput=z.input<typeof SaveCategoryInputSchema>; export type SaveBrandInput=z.input<typeof SaveBrandInputSchema>;
