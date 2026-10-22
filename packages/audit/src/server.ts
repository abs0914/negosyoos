import"server-only";
import{requireAuthenticatedUser,requireCapability}from"@negosyo-os/auth";
import{createClient}from"@negosyo-os/auth/server";
import{BusinessIdSchema}from"@negosyo-os/business";
import{AppError,ERROR_CODES}from"@negosyo-os/core/errors";
import{PERMISSIONS}from"@negosyo-os/core/permissions";
import{AuditEventPageSchema,AuditFiltersSchema,type AuditEventPage,type AuditFilters}from"./index";

const failure=(cause:unknown)=>new AppError({code:ERROR_CODES.internal,message:"Audit events could not be loaded.",status:500,cause,expose:false});
type AuditRow={id:string;organization_id:string;branch_id:string|null;actor_user_id:string|null;action:string;entity_type:string;entity_id:string|null;before_data:unknown;after_data:unknown;ip_metadata:unknown;source:string;occurred_at:string};
export type AuditFilterOptions={branches:readonly{id:string;name:string}[];users:readonly{id:string;name:string}[]};

async function access(businessId:string){const id=BusinessIdSchema.parse(businessId),client=await createClient(),user=await requireAuthenticatedUser(client);await requireCapability(user,PERMISSIONS.auditRead,{businessId:id},client);return{id,client};}

export async function listAuditEvents(businessId:string,input:Partial<AuditFilters>={}):Promise<AuditEventPage>{
  const{id,client}=await access(businessId),filters=AuditFiltersSchema.parse(input);
  const offset=(filters.page-1)*filters.pageSize;
  let query=client.from("audit_events").select("id,organization_id,branch_id,actor_user_id,action,entity_type,entity_id,before_data,after_data,ip_metadata,source,occurred_at",{count:"exact"}).eq("organization_id",id).order("occurred_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+filters.pageSize-1);
  if(filters.source)query=query.eq("source",filters.source);
  if(filters.branchId)query=query.eq("branch_id",filters.branchId);
  if(filters.userId)query=query.eq("actor_user_id",filters.userId);
  if(filters.entity)query=query.eq("entity_type",filters.entity);
  if(filters.action)query=query.eq("action",filters.action);
  if(filters.from)query=query.gte("occurred_at",filters.from);
  if(filters.to)query=query.lte("occurred_at",filters.to);
  if(filters.search)query=query.or(`action.ilike.%${filters.search}%,entity_type.ilike.%${filters.search}%,entity_id.ilike.%${filters.search}%`);
  const result=await query;if(result.error)throw failure(result.error);
  const rows=result.data as AuditRow[],userIds=[...new Set(rows.flatMap(row=>row.actor_user_id?[row.actor_user_id]:[]))],branchIds=[...new Set(rows.flatMap(row=>row.branch_id?[row.branch_id]:[]))];
  const[profiles,branches]=await Promise.all([userIds.length?client.from("profiles").select("id,display_name").in("id",userIds):Promise.resolve({data:[],error:null}),branchIds.length?client.from("branches").select("id,name").eq("organization_id",id).in("id",branchIds):Promise.resolve({data:[],error:null})]);
  if(profiles.error||branches.error)throw failure(profiles.error??branches.error);
  const profileNames=new Map((profiles.data??[]).map(item=>[item.id,item.display_name])),branchNames=new Map((branches.data??[]).map(item=>[item.id,item.name])),total=result.count??0;
  return AuditEventPageSchema.parse({items:rows.map(row=>{const metadata=(row.ip_metadata??{})as Record<string,unknown>;return{id:row.id,businessId:row.organization_id,branchId:row.branch_id,branchName:row.branch_id?branchNames.get(row.branch_id)??null:null,userId:row.actor_user_id,userName:row.actor_user_id?profileNames.get(row.actor_user_id)??null:null,action:row.action,entity:row.entity_type,entityId:row.entity_id,before:row.before_data,after:row.after_data,timestamp:row.occurred_at,ipMetadata:{ipAddress:typeof metadata.ipAddress==="string"?metadata.ipAddress:null,userAgent:typeof metadata.userAgent==="string"?metadata.userAgent:null,requestId:typeof metadata.requestId==="string"?metadata.requestId:null},source:row.source};}),page:filters.page,pageSize:filters.pageSize,total,pageCount:Math.ceil(total/filters.pageSize)});
}

export async function listAuditFilterOptions(businessId:string):Promise<AuditFilterOptions>{const{id,client}=await access(businessId),[branches,memberships]=await Promise.all([client.from("branches").select("id,name").eq("organization_id",id).order("name"),client.from("organization_memberships").select("user_id").eq("organization_id",id).eq("status","active")]);if(branches.error||memberships.error)throw failure(branches.error??memberships.error);const ids=[...new Set((memberships.data??[]).map(item=>item.user_id))],profiles=ids.length?await client.from("profiles").select("id,display_name").in("id",ids):{data:[],error:null};if(profiles.error)throw failure(profiles.error);return{branches:branches.data??[],users:(profiles.data??[]).map(item=>({id:item.id,name:item.display_name||`User ${item.id.slice(0,8)}`})).sort((a,b)=>a.name.localeCompare(b.name))};}

const csv=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;
export async function exportAuditEventsCsv(businessId:string,input:Partial<Omit<AuditFilters,"page"|"pageSize">>={}){
  const lines=["timestamp,source,action,entity,entity_id,user_id,user_name,branch_id,branch_name,request_id,before,after"];
  for(let page=1;page<=100;page+=1){
    const result=await listAuditEvents(businessId,{...input,page,pageSize:100});
    for(const item of result.items)lines.push([item.timestamp,item.source,item.action,item.entity,item.entityId,item.userId,item.userName,item.branchId,item.branchName,item.ipMetadata.requestId,item.before?JSON.stringify(item.before):"",item.after?JSON.stringify(item.after):""].map(csv).join(","));
    if(page>=result.pageCount)break;
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
