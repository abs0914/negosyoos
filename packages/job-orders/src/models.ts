export type JobOrderStatus="new"|"accepted"|"in_progress"|"waiting"|"completed"|"released"|"cancelled";
export type JobOrderPriority="low"|"normal"|"high"|"urgent";
export interface JobOrderLabels{singular:string;plural:string;consumeInventory:boolean;consumptionTrigger:"manual"|"on_start"|"on_complete"}
export interface JobOrderStaff{id:string;displayName:string;status:"active"|"inactive"}
export interface JobOrderMaterialOption{productVariantId:string;inventoryItemId:string;inventoryLocationId:string;branchId:string;name:string;sku:string;locationName:string;available:number;unitCost:number}
export interface JobOrderSummary{id:string;jobNumber:string;customerId:string;customerName:string;customerMobile:string|null;staffName:string|null;branchId:string;branchName:string;serviceType:string;description:string;status:JobOrderStatus;priority:JobOrderPriority;startDate:string|null;dueDate:string|null;completedDate:string|null;laborTotal:number;materialTotal:number;createdAt:string}
export interface JobOrderLaborItem{id:string;description:string;hours:number;hourlyRate:number;amount:number}
export interface JobOrderMaterialItem{id:string;description:string;plannedQuantity:number;consumedQuantity:number;unitCost:number;amount:number;productVariantId:string;inventoryLocationId:string}
export interface JobOrderAttachment{id:string;path:string;fileName:string;mimeType:string;sizeBytes:number;createdAt:string}
export interface JobOrderAudit{id:string;event:string;fromStatus:string|null;toStatus:string|null;details:Readonly<Record<string,unknown>>;createdAt:string}
export interface JobOrderDetails{job:JobOrderSummary&{notes:string|null;assignedStaffId:string|null;serviceId:string|null};labor:readonly JobOrderLaborItem[];materials:readonly JobOrderMaterialItem[];attachments:readonly JobOrderAttachment[];audit:readonly JobOrderAudit[]}
