import{z}from"zod";

export const NotificationSourceSchema=z.enum(["workflow","system","inventory","appointment","approval","billing","ai_recommendation"]);
export const NotificationChannelSchema=z.enum(["in_app","email","sms","messenger","viber","push"]);
export const ActiveNotificationChannelSchema=z.enum(["in_app","email"]);
export const NotificationPrioritySchema=z.enum(["low","normal","high","urgent"]);
export const NotificationDeliveryStatusSchema=z.enum(["pending","processing","sent","failed","skipped"]);
export const NotificationIdSchema=z.uuid();
export const NotificationTemplateIdSchema=z.uuid();
export const NotificationDeepLinkSchema=z.string().trim().max(500).regex(/^\/business\/[0-9a-f-]+(?:\/.*)?$/i).nullable();

export const NotificationDeliverySchema=z.strictObject({id:z.uuid(),channel:NotificationChannelSchema,status:NotificationDeliveryStatusSchema,attemptCount:z.number().int().nonnegative(),sentAt:z.string().nullable()});
export const NotificationSchema=z.strictObject({id:z.uuid(),businessId:z.uuid(),recipientUserId:z.uuid(),source:NotificationSourceSchema,title:z.string(),body:z.string(),deepLink:NotificationDeepLinkSchema,priority:NotificationPrioritySchema,data:z.record(z.string(),z.unknown()),readAt:z.string().nullable(),createdAt:z.string(),deliveries:z.array(NotificationDeliverySchema)});
export const NotificationTemplateSchema=z.strictObject({id:z.uuid(),businessId:z.uuid(),key:z.string(),name:z.string(),source:NotificationSourceSchema,channel:NotificationChannelSchema,subjectTemplate:z.string().nullable(),bodyTemplate:z.string(),deepLinkTemplate:z.string().nullable(),variableKeys:z.array(z.string()),isActive:z.boolean(),updatedAt:z.string()});
export const NotificationPreferenceSchema=z.strictObject({source:NotificationSourceSchema,channel:ActiveNotificationChannelSchema,isEnabled:z.boolean()});
export const SaveNotificationTemplateSchema=z.strictObject({templateId:NotificationTemplateIdSchema.optional(),key:z.string().trim().regex(/^[a-z][a-z0-9_]{0,79}$/),name:z.string().trim().min(1).max(120),source:NotificationSourceSchema,channel:ActiveNotificationChannelSchema,subjectTemplate:z.string().trim().min(1).max(200).optional(),bodyTemplate:z.string().trim().min(1).max(4000),deepLinkTemplate:z.string().trim().max(500).optional(),variableKeys:z.array(z.string().regex(/^[a-z][a-z0-9_]{0,63}$/)).max(30).default([]),isActive:z.boolean().default(true)});
export const DispatchNotificationSchema=z.strictObject({source:NotificationSourceSchema,recipientUserId:z.uuid().optional(),recipientRoleKey:z.string().regex(/^[a-z][a-z0-9_]*$/).optional(),title:z.string().trim().min(1).max(200),body:z.string().trim().min(1).max(4000),deepLink:z.string().trim().max(500).optional(),priority:NotificationPrioritySchema.default("normal"),data:z.record(z.string(),z.unknown()).default({}),idempotencyKey:z.string().trim().min(8).max(180)}).refine(value=>(value.recipientUserId===undefined)!==(value.recipientRoleKey===undefined),{message:"Choose one recipient user or role."});

export type NotificationSource=z.infer<typeof NotificationSourceSchema>;export type NotificationChannel=z.infer<typeof NotificationChannelSchema>;export type ActiveNotificationChannel=z.infer<typeof ActiveNotificationChannelSchema>;export type Notification=z.infer<typeof NotificationSchema>;export type NotificationTemplate=z.infer<typeof NotificationTemplateSchema>;export type NotificationPreference=z.infer<typeof NotificationPreferenceSchema>;export type SaveNotificationTemplate=z.infer<typeof SaveNotificationTemplateSchema>;export type DispatchNotification=z.infer<typeof DispatchNotificationSchema>;

export const NOTIFICATION_SOURCES=NotificationSourceSchema.options;
export const ACTIVE_NOTIFICATION_CHANNELS=ActiveNotificationChannelSchema.options;

export interface NotificationChannelMessage{deliveryId:string;businessId:string;notificationId:string;destination:string;subject:string;body:string;deepLink:string|null;idempotencyKey:string}
export interface NotificationChannelResult{providerMessageId:string;sentAt:string}
export interface NotificationChannelProvider{readonly channel:Exclude<NotificationChannel,"in_app">;send(message:NotificationChannelMessage):Promise<NotificationChannelResult>}
export interface EmailNotificationProvider extends NotificationChannelProvider{readonly channel:"email"}
export interface SmsNotificationProvider extends NotificationChannelProvider{readonly channel:"sms"}
export interface MessengerNotificationProvider extends NotificationChannelProvider{readonly channel:"messenger"}
export interface ViberNotificationProvider extends NotificationChannelProvider{readonly channel:"viber"}
export interface PushNotificationProvider extends NotificationChannelProvider{readonly channel:"push"}

export function renderNotificationTemplate(template:string,variables:Readonly<Record<string,string|number>>):string{return template.replace(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g,(_match,key:string)=>String(variables[key]??""));}
