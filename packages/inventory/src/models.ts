export const STOCK_MOVEMENT_TYPES=["purchase","sale","return","adjustment","transfer_in","transfer_out","opening_balance","wastage"] as const;
export type StockMovementType=(typeof STOCK_MOVEMENT_TYPES)[number];
export interface InventoryLocation{id:string;businessId:string;branchId:string;code:string;name:string;type:"store"|"stockroom"|"warehouse";isActive:boolean;createdAt:string;updatedAt:string}
export interface InventoryItem{id:string;businessId:string;productVariantId:string;lowStockThreshold:number;reorderLevel:number;isTracked:boolean;createdAt:string;updatedAt:string;variantName?:string;sku?:string;productName?:string}
export interface StockBalance{id:string;businessId:string;inventoryItemId:string;locationId:string;quantity:number;averageUnitCost:number;inventoryValue:number;lastMovementAt:string|null;updatedAt:string}
export interface StockMovement{id:string;businessId:string;inventoryItemId:string;locationId:string;movementType:StockMovementType;quantityDelta:number;unitCost:number;balanceAfter:number;transferId:string|null;adjustmentId:string|null;referenceType:string|null;referenceId:string|null;notes:string|null;occurredAt:string;createdBy:string;createdAt:string}
export interface StockTransfer{id:string;businessId:string;fromLocationId:string;toLocationId:string;status:"draft"|"completed"|"cancelled";notes:string|null;completedAt:string|null;createdBy:string;createdAt:string}
export interface StockAdjustment{id:string;businessId:string;locationId:string;reason:string;physicalCount:boolean;status:"draft"|"pending_approval"|"approved"|"posted"|"rejected"|"cancelled";approvalRequestId:string|null;postedAt:string|null;createdBy:string;createdAt:string}
export interface InventoryDashboard{currentInventoryValue:number;lowStockCount:number;outOfStockCount:number;slowMovingCount:number;recentMovements:readonly StockMovement[]}
export interface InventoryOverviewRow{item:InventoryItem;location:InventoryLocation;balance:StockBalance|null}
