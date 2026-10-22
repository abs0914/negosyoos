import{z}from"zod";

export const AUDIT_SOURCES=["user","ai","workflow","system","api"]as const;
export const AuditSourceSchema=z.enum(AUDIT_SOURCES);
export const AuditEventIdSchema=z.uuid();
export const AuditObjectSchema=z.record(z.string(),z.unknown());
export const AuditIpMetadataSchema=z.strictObject({ipAddress:z.string().nullable(),userAgent:z.string().nullable(),requestId:z.string().nullable()});
export const AuditEventSchema=z.strictObject({id:z.uuid(),businessId:z.uuid(),branchId:z.uuid().nullable(),branchName:z.string().nullable(),userId:z.uuid().nullable(),userName:z.string().nullable(),action:z.string(),entity:z.string(),entityId:z.string().nullable(),before:AuditObjectSchema.nullable(),after:AuditObjectSchema.nullable(),timestamp:z.string(),ipMetadata:AuditIpMetadataSchema,source:AuditSourceSchema});
export const AuditFiltersSchema=z.strictObject({source:AuditSourceSchema.optional(),branchId:z.uuid().optional(),userId:z.uuid().optional(),entity:z.string().trim().regex(/^[a-z][a-z0-9_.-]{0,99}$/).optional(),action:z.string().trim().regex(/^[a-z][a-z0-9_.-]{0,99}$/).optional(),search:z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9 .:_-]+$/).optional(),from:z.iso.datetime({offset:true}).optional(),to:z.iso.datetime({offset:true}).optional(),page:z.number().int().positive().max(10000).default(1),pageSize:z.number().int().min(10).max(100).default(50)});
export const AuditEventPageSchema=z.strictObject({items:z.array(AuditEventSchema),page:z.number().int().positive(),pageSize:z.number().int().positive(),total:z.number().int().nonnegative(),pageCount:z.number().int().nonnegative()});

export type AuditSource=z.infer<typeof AuditSourceSchema>;export type AuditEvent=z.infer<typeof AuditEventSchema>;export type AuditFilters=z.infer<typeof AuditFiltersSchema>;export type AuditEventPage=z.infer<typeof AuditEventPageSchema>;
