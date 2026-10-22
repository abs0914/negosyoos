export const PRODUCT_TYPES = ["product", "service"] as const;
export const PRODUCT_STATUSES = ["draft", "active", "inactive"] as const;
export const CATALOG_UNITS = ["piece", "box", "pack", "kg", "gram", "liter", "meter"] as const;
export const TAX_TYPES = ["exclusive", "inclusive", "exempt", "zero_rated"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number]; export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type CatalogUnit = (typeof CATALOG_UNITS)[number]; export type TaxType = (typeof TAX_TYPES)[number];
export interface ProductCategory { id:string; businessId:string; name:string; description:string|null; status:"active"|"inactive"; createdAt:string; updatedAt:string }
export interface ProductBrand { id:string; businessId:string; name:string; description:string|null; status:"active"|"inactive"; createdAt:string; updatedAt:string }
export interface ProductVariant { id:string; businessId:string; productId:string; name:string; sku:string; barcode:string|null; attributes:Readonly<Record<string,string>>; unit:CatalogUnit|null; sellingPrice:number|null; costPrice:number|null; status:"active"|"inactive"; sortOrder:number; createdAt:string; updatedAt:string }
export interface ProductImage { id:string; businessId:string; productId:string; url:string; altText:string|null; sortOrder:number; isPrimary:boolean; createdAt:string }
export interface CatalogProduct { id:string; businessId:string; branchId:string|null; type:ProductType; name:string; description:string|null; categoryId:string|null; brandId:string|null; defaultUnit:CatalogUnit; sellingPrice:number; costPrice:number; taxType:TaxType; taxRate:number; status:ProductStatus; hasVariants:boolean; createdBy:string; updatedBy:string; createdAt:string; updatedAt:string; category?:ProductCategory|null; brand?:ProductBrand|null; variants:readonly ProductVariant[]; images:readonly ProductImage[] }
export interface CatalogListItem extends CatalogProduct { primarySku:string; primaryBarcode:string|null }
export interface ProductVariantInput { id?:string; name:string; sku:string; barcode?:string; attributes:Readonly<Record<string,string>>; unit?:CatalogUnit; sellingPrice?:number; costPrice?:number; status:"active"|"inactive" }
export interface ProductImageInput { url:string; altText?:string; isPrimary:boolean }
