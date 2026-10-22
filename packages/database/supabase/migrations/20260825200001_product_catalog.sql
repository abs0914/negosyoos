-- Module 11: Product Catalog. Products are tenant-owned and may optionally be scoped to a Branch.

insert into public.module_definitions (key,name,description,category,icon,minimum_plan,configuration_schema,version,manifest,status)
values ('product_catalog','Product Catalog','Manage products, services, variants, pricing, tax, barcodes, and catalog classifications.','operations','package','starter',
  '{"properties":{"default_unit":{"type":"enum","label":"Default unit","options":["piece","box","pack","kg","gram","liter","meter"],"default":"piece"},"default_tax_rate":{"type":"number","label":"Default tax rate (%)","minimum":0,"maximum":100,"default":12}},"additionalProperties":false}',1,'{}','published')
on conflict (key) do update set name=excluded.name,description=excluded.description,category=excluded.category,icon=excluded.icon,minimum_plan=excluded.minimum_plan,configuration_schema=excluded.configuration_schema,version=excluded.version,status=excluded.status,updated_at=now();

create table public.product_categories (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160), description text check (char_length(description)<=500),
  status text not null default 'active' check (status in ('active','inactive')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,organization_id)
);
create unique index product_categories_name_unique on public.product_categories(organization_id,lower(name));
create table public.product_brands (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160), description text check (char_length(description)<=500),
  status text not null default 'active' check (status in ('active','inactive')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,organization_id)
);
create unique index product_brands_name_unique on public.product_brands(organization_id,lower(name));
create table public.products (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid, product_type text not null check(product_type in ('product','service')), name text not null check(char_length(btrim(name)) between 1 and 160),
  description text check(char_length(description)<=5000), category_id uuid, brand_id uuid,
  default_unit text not null check(default_unit in ('piece','box','pack','kg','gram','liter','meter')),
  selling_price numeric(16,4) not null check(selling_price>=0), cost_price numeric(16,4) not null check(cost_price>=0),
  tax_type text not null check(tax_type in ('exclusive','inclusive','exempt','zero_rated')), tax_rate numeric(6,3) not null check(tax_rate between 0 and 100),
  status text not null default 'draft' check(status in ('draft','active','inactive')), has_variants boolean not null default false,
  created_by uuid not null references auth.users(id), updated_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,organization_id), foreign key(branch_id,organization_id) references public.branches(id,organization_id) on delete restrict,
  foreign key(category_id,organization_id) references public.product_categories(id,organization_id) on delete restrict,
  foreign key(brand_id,organization_id) references public.product_brands(id,organization_id) on delete restrict,
  check(tax_type not in ('exempt','zero_rated') or tax_rate=0)
);
create table public.product_variants (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, product_id uuid not null,
  name text not null check(char_length(btrim(name)) between 1 and 120), sku text not null check(char_length(btrim(sku)) between 1 and 100), barcode text check(char_length(barcode) between 1 and 100),
  attributes jsonb not null default '{}' check(jsonb_typeof(attributes)='object'), unit text check(unit in ('piece','box','pack','kg','gram','liter','meter')),
  selling_price numeric(16,4) check(selling_price>=0), cost_price numeric(16,4) check(cost_price>=0), status text not null default 'active' check(status in ('active','inactive')),
  sort_order integer not null default 0 check(sort_order between 0 and 99), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,organization_id), foreign key(product_id,organization_id) references public.products(id,organization_id) on delete cascade
);
create unique index product_variants_sku_unique on public.product_variants(organization_id,lower(sku));
create unique index product_variants_barcode_unique on public.product_variants(organization_id,lower(barcode)) where barcode is not null;
create index product_variants_product_order_idx on public.product_variants(product_id,sort_order);
create index product_variants_barcode_search_idx on public.product_variants(organization_id,barcode) where barcode is not null;
create table public.product_images (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, product_id uuid not null,
  url text not null check(char_length(url) between 1 and 2000), alt_text text check(char_length(alt_text)<=200), sort_order integer not null default 0 check(sort_order between 0 and 19),
  is_primary boolean not null default false, created_at timestamptz not null default now(), unique(id,organization_id),
  foreign key(product_id,organization_id) references public.products(id,organization_id) on delete cascade
);
create unique index product_images_one_primary on public.product_images(product_id) where is_primary;

create trigger set_updated_at before update on public.product_categories for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.product_brands for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.products for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.product_variants for each row execute function private.set_updated_at();
create trigger prevent_tenant_reassignment before update on public.product_categories for each row execute function private.prevent_tenant_reassignment();
create trigger prevent_tenant_reassignment before update on public.product_brands for each row execute function private.prevent_tenant_reassignment();
create trigger prevent_tenant_reassignment before update on public.products for each row execute function private.prevent_tenant_reassignment();
create trigger prevent_tenant_reassignment before update on public.product_variants for each row execute function private.prevent_tenant_reassignment();

insert into public.permissions(key,domain,action,description) values
 ('catalog.read','catalog','read','View products and services'),('catalog.manage','catalog','manage','Create and edit products, variants, categories, and brands'),
 ('catalog.import','catalog','import','Import catalog records from CSV'),('catalog.export','catalog','export','Export catalog records to CSV')
on conflict(key) do update set domain=excluded.domain,action=excluded.action,description=excluded.description;
create function private.install_catalog_permissions(requested_organization_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.role_permissions(role_id,permission_id) select role.id,permission.id from public.roles role cross join public.permissions permission
    where role.organization_id=requested_organization_id and role.key in ('owner','administrator','manager') and permission.key like 'catalog.%' on conflict do nothing;
  insert into public.role_permissions(role_id,permission_id) select role.id,permission.id from public.roles role join public.permissions permission on permission.key in ('catalog.read','catalog.export')
    where role.organization_id=requested_organization_id and role.key in ('cashier','staff','viewer') on conflict do nothing;
end; $$;
create function private.handle_main_branch_catalog_permissions() returns trigger language plpgsql security definer set search_path='' as $$ begin if new.code='main' then perform private.install_catalog_permissions(new.organization_id);end if;return new;end; $$;
create trigger zzz_install_catalog_permissions_on_main_branch after insert on public.branches for each row execute function private.handle_main_branch_catalog_permissions();
select private.install_catalog_permissions(id) from public.organizations;

create function private.catalog_module_enabled(requested_organization_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organization_modules module join public.module_definitions definition on definition.id=module.module_id
   where module.organization_id=requested_organization_id and module.is_enabled and definition.key='product_catalog'); $$;
create function private.can_read_catalog_product(requested_organization_id uuid,requested_product_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.catalog_module_enabled(requested_organization_id) and exists(select 1 from public.products product where product.id=requested_product_id and product.organization_id=requested_organization_id
   and private.can_business_permission(requested_organization_id,'catalog.read',product.branch_id)); $$;

alter table public.product_categories enable row level security; alter table public.product_brands enable row level security;
alter table public.products enable row level security; alter table public.product_variants enable row level security; alter table public.product_images enable row level security;
create policy product_categories_read on public.product_categories for select to authenticated using(private.catalog_module_enabled(organization_id) and private.can_business_permission(organization_id,'catalog.read',null));
create policy product_brands_read on public.product_brands for select to authenticated using(private.catalog_module_enabled(organization_id) and private.can_business_permission(organization_id,'catalog.read',null));
create policy products_read on public.products for select to authenticated using(private.catalog_module_enabled(organization_id) and private.can_business_permission(organization_id,'catalog.read',branch_id));
create policy product_variants_read on public.product_variants for select to authenticated using(private.can_read_catalog_product(organization_id,product_id));
create policy product_images_read on public.product_images for select to authenticated using(private.can_read_catalog_product(organization_id,product_id));

create function private.save_product_category(requested_organization_id uuid,requested_category_id uuid,requested_name text,requested_description text,requested_status text)
returns uuid language plpgsql security definer set search_path='' as $$ declare target_id uuid:=coalesce(requested_category_id,gen_random_uuid());begin
 if (select auth.uid()) is null or not private.catalog_module_enabled(requested_organization_id) or not private.can_business_permission(requested_organization_id,'catalog.manage',null) then raise exception 'Permission denied.' using errcode='42501';end if;
 if char_length(btrim(requested_name)) not between 1 and 160 or char_length(coalesce(requested_description,''))>500 or requested_status not in ('active','inactive') then raise exception 'Invalid category.' using errcode='22023';end if;
 if requested_category_id is not null and not exists(select 1 from public.product_categories where id=target_id and organization_id=requested_organization_id) then raise exception 'Category not found.' using errcode='22023';end if;
 insert into public.product_categories(id,organization_id,name,description,status) values(target_id,requested_organization_id,btrim(requested_name),nullif(btrim(requested_description),''),requested_status)
 on conflict(id) do update set name=excluded.name,description=excluded.description,status=excluded.status;return target_id;end; $$;
create function private.save_product_brand(requested_organization_id uuid,requested_brand_id uuid,requested_name text,requested_description text,requested_status text)
returns uuid language plpgsql security definer set search_path='' as $$ declare target_id uuid:=coalesce(requested_brand_id,gen_random_uuid());begin
 if (select auth.uid()) is null or not private.catalog_module_enabled(requested_organization_id) or not private.can_business_permission(requested_organization_id,'catalog.manage',null) then raise exception 'Permission denied.' using errcode='42501';end if;
 if char_length(btrim(requested_name)) not between 1 and 160 or char_length(coalesce(requested_description,''))>500 or requested_status not in ('active','inactive') then raise exception 'Invalid brand.' using errcode='22023';end if;
 if requested_brand_id is not null and not exists(select 1 from public.product_brands where id=target_id and organization_id=requested_organization_id) then raise exception 'Brand not found.' using errcode='22023';end if;
 insert into public.product_brands(id,organization_id,name,description,status) values(target_id,requested_organization_id,btrim(requested_name),nullif(btrim(requested_description),''),requested_status)
 on conflict(id) do update set name=excluded.name,description=excluded.description,status=excluded.status;return target_id;end; $$;

create function private.save_catalog_product(requested_organization_id uuid,requested_product_id uuid,requested_branch_id uuid,requested_product_type text,requested_name text,requested_description text,
 requested_category_id uuid,requested_brand_id uuid,requested_default_unit text,requested_selling_price numeric,requested_cost_price numeric,requested_tax_type text,requested_tax_rate numeric,
 requested_status text,requested_has_variants boolean,requested_variants jsonb,requested_images jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare target_id uuid:=coalesce(requested_product_id,gen_random_uuid());actor uuid:=(select auth.uid());item jsonb;position integer:=0;kept_variant_ids uuid[]:=array[]::uuid[];variant_id uuid;old_branch_id uuid;
begin
 if actor is null or not private.catalog_module_enabled(requested_organization_id) or not (private.can_business_permission(requested_organization_id,'catalog.manage',requested_branch_id) or private.can_business_permission(requested_organization_id,'catalog.import',requested_branch_id)) then raise exception 'Permission denied.' using errcode='42501';end if;
 if requested_product_id is not null then select branch_id into old_branch_id from public.products where id=target_id and organization_id=requested_organization_id for update;if not found then raise exception 'Product not found.' using errcode='22023';end if;
   if not (private.can_business_permission(requested_organization_id,'catalog.manage',old_branch_id) or private.can_business_permission(requested_organization_id,'catalog.import',old_branch_id)) then raise exception 'Permission denied.' using errcode='42501';end if;end if;
 if requested_branch_id is not null and not exists(select 1 from public.branches where id=requested_branch_id and organization_id=requested_organization_id and is_active) then raise exception 'Branch not found.' using errcode='22023';end if;
 if requested_category_id is not null and not exists(select 1 from public.product_categories where id=requested_category_id and organization_id=requested_organization_id) then raise exception 'Category not found.' using errcode='22023';end if;
 if requested_brand_id is not null and not exists(select 1 from public.product_brands where id=requested_brand_id and organization_id=requested_organization_id) then raise exception 'Brand not found.' using errcode='22023';end if;
 if requested_product_type not in ('product','service') or char_length(btrim(requested_name)) not between 1 and 160 or char_length(coalesce(requested_description,''))>5000
  or requested_default_unit not in ('piece','box','pack','kg','gram','liter','meter') or requested_selling_price<0 or requested_cost_price<0
  or requested_tax_type not in ('exclusive','inclusive','exempt','zero_rated') or requested_tax_rate not between 0 and 100 or (requested_tax_type in ('exempt','zero_rated') and requested_tax_rate<>0)
  or requested_status not in ('draft','active','inactive') or jsonb_typeof(requested_variants)<>'array' or jsonb_array_length(requested_variants) not between 1 and 100
  or (not requested_has_variants and jsonb_array_length(requested_variants)<>1) or jsonb_typeof(requested_images)<>'array' or jsonb_array_length(requested_images)>20 then raise exception 'Invalid product.' using errcode='22023';end if;
 insert into public.products(id,organization_id,branch_id,product_type,name,description,category_id,brand_id,default_unit,selling_price,cost_price,tax_type,tax_rate,status,has_variants,created_by,updated_by)
 values(target_id,requested_organization_id,requested_branch_id,requested_product_type,btrim(requested_name),nullif(btrim(requested_description),''),requested_category_id,requested_brand_id,requested_default_unit,requested_selling_price,requested_cost_price,requested_tax_type,requested_tax_rate,requested_status,requested_has_variants,actor,actor)
 on conflict(id) do update set branch_id=excluded.branch_id,product_type=excluded.product_type,name=excluded.name,description=excluded.description,category_id=excluded.category_id,brand_id=excluded.brand_id,default_unit=excluded.default_unit,selling_price=excluded.selling_price,cost_price=excluded.cost_price,tax_type=excluded.tax_type,tax_rate=excluded.tax_rate,status=excluded.status,has_variants=excluded.has_variants,updated_by=actor;
 for item in select value from jsonb_array_elements(requested_variants) loop
  if jsonb_typeof(item)<>'object' or item-array['id','name','sku','barcode','attributes','unit','sellingPrice','costPrice','status']::text[]<>'{}'::jsonb or not(item?&array['name','sku','attributes','status'])
   or char_length(btrim(item->>'name')) not between 1 and 120 or char_length(btrim(item->>'sku')) not between 1 and 100 or jsonb_typeof(item->'attributes')<>'object'
   or item->>'status' not in ('active','inactive') or (item?'unit' and item->>'unit' not in ('piece','box','pack','kg','gram','liter','meter')) then raise exception 'Invalid product variant.' using errcode='22023';end if;
  variant_id:=case when item?'id' then (item->>'id')::uuid else gen_random_uuid() end;
  if item?'id' and not exists(select 1 from public.product_variants where id=variant_id and product_id=target_id and organization_id=requested_organization_id) then raise exception 'Product variant not found.' using errcode='22023';end if;
  insert into public.product_variants(id,organization_id,product_id,name,sku,barcode,attributes,unit,selling_price,cost_price,status,sort_order)
  values(variant_id,requested_organization_id,target_id,btrim(item->>'name'),btrim(item->>'sku'),nullif(btrim(item->>'barcode'),''),item->'attributes',nullif(item->>'unit',''),case when item?'sellingPrice' then (item->>'sellingPrice')::numeric end,case when item?'costPrice' then (item->>'costPrice')::numeric end,item->>'status',position)
  on conflict(id) do update set name=excluded.name,sku=excluded.sku,barcode=excluded.barcode,attributes=excluded.attributes,unit=excluded.unit,selling_price=excluded.selling_price,cost_price=excluded.cost_price,status=excluded.status,sort_order=excluded.sort_order;
  kept_variant_ids:=array_append(kept_variant_ids,variant_id);position:=position+1;
 end loop;
 delete from public.product_variants where product_id=target_id and not(id=any(kept_variant_ids));
 delete from public.product_images where product_id=target_id;position:=0;
 for item in select value from jsonb_array_elements(requested_images) loop
  if jsonb_typeof(item)<>'object' or item-array['url','altText','isPrimary']::text[]<>'{}'::jsonb or not(item?&array['url','altText','isPrimary']) or char_length(item->>'url') not between 1 and 2000 or char_length(item->>'altText')>200 then raise exception 'Invalid product image.' using errcode='22023';end if;
  insert into public.product_images(organization_id,product_id,url,alt_text,sort_order,is_primary) values(requested_organization_id,target_id,item->>'url',nullif(btrim(item->>'altText'),''),position,(item->>'isPrimary')::boolean);position:=position+1;
 end loop;return target_id;
exception when unique_violation then raise exception 'SKU, barcode, category, or brand already exists.' using errcode='23505';when invalid_text_representation or numeric_value_out_of_range then raise exception 'Invalid product data.' using errcode='22023';end; $$;

create function public.save_product_category(requested_organization_id uuid,requested_category_id uuid,requested_name text,requested_description text,requested_status text) returns uuid language sql security definer set search_path='' as $$select private.save_product_category(requested_organization_id,requested_category_id,requested_name,requested_description,requested_status);$$;
create function public.save_product_brand(requested_organization_id uuid,requested_brand_id uuid,requested_name text,requested_description text,requested_status text) returns uuid language sql security definer set search_path='' as $$select private.save_product_brand(requested_organization_id,requested_brand_id,requested_name,requested_description,requested_status);$$;
create function public.save_catalog_product(requested_organization_id uuid,requested_product_id uuid,requested_branch_id uuid,requested_product_type text,requested_name text,requested_description text,requested_category_id uuid,requested_brand_id uuid,requested_default_unit text,requested_selling_price numeric,requested_cost_price numeric,requested_tax_type text,requested_tax_rate numeric,requested_status text,requested_has_variants boolean,requested_variants jsonb,requested_images jsonb) returns uuid language sql security definer set search_path='' as $$select private.save_catalog_product(requested_organization_id,requested_product_id,requested_branch_id,requested_product_type,requested_name,requested_description,requested_category_id,requested_brand_id,requested_default_unit,requested_selling_price,requested_cost_price,requested_tax_type,requested_tax_rate,requested_status,requested_has_variants,requested_variants,requested_images);$$;

revoke all on table public.product_categories,public.product_brands,public.products,public.product_variants,public.product_images from public,anon,authenticated;
grant select on table public.product_categories,public.product_brands,public.products,public.product_variants,public.product_images to authenticated;
revoke all on function private.install_catalog_permissions(uuid),private.handle_main_branch_catalog_permissions(),private.catalog_module_enabled(uuid),private.can_read_catalog_product(uuid,uuid),private.save_product_category(uuid,uuid,text,text,text),private.save_product_brand(uuid,uuid,text,text,text),private.save_catalog_product(uuid,uuid,uuid,text,text,text,uuid,uuid,text,numeric,numeric,text,numeric,text,boolean,jsonb,jsonb) from public,anon,authenticated;
grant execute on function private.catalog_module_enabled(uuid),private.can_read_catalog_product(uuid,uuid) to authenticated;
revoke all on function public.save_product_category(uuid,uuid,text,text,text),public.save_product_brand(uuid,uuid,text,text,text),public.save_catalog_product(uuid,uuid,uuid,text,text,text,uuid,uuid,text,numeric,numeric,text,numeric,text,boolean,jsonb,jsonb) from public,anon;
grant execute on function public.save_product_category(uuid,uuid,text,text,text),public.save_product_brand(uuid,uuid,text,text,text),public.save_catalog_product(uuid,uuid,uuid,text,text,text,uuid,uuid,text,numeric,numeric,text,numeric,text,boolean,jsonb,jsonb) to authenticated;

comment on table public.products is 'Business-owned products and services with optional Branch scope, pricing, tax, and status.';
comment on table public.product_variants is 'Sellable SKU and barcode variants with size, color, packaging, or other declarative attributes.';
