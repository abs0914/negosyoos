export type AppointmentStatus="scheduled"|"confirmed"|"arrived"|"in_progress"|"completed"|"cancelled"|"no_show";
export interface AppointmentStaff{id:string;businessId:string;membershipId:string;userId:string;displayName:string;status:"active"|"inactive";color:string}
export interface AppointmentService{id:string;name:string;durationMinutes:number;price:number;branchId:string|null}
export interface Appointment{id:string;businessId:string;branchId:string;appointmentNumber:string;customerId:string;customerName:string;customerMobile:string|null;serviceId:string;serviceName:string;staffId:string;staffName:string;staffColor:string;date:string;startTime:string;endTime:string;status:AppointmentStatus;notes:string|null;createdAt:string;updatedAt:string}
export interface AppointmentAuditRecord{id:string;event:string;fromStatus:string|null;toStatus:string|null;actorId:string;details:Readonly<Record<string,unknown>>;createdAt:string}
export interface AppointmentDetails{appointment:Appointment;audit:readonly AppointmentAuditRecord[]}
export interface AppointmentQuery{startDate:string;endDate:string;branchId?:string;staffId?:string;customerId?:string}
