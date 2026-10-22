alter table public.business_settings
  add column primary_color text not null default '#043f8d',
  add column secondary_color text not null default '#df1a2c',
  add column accent_color text not null default '#f9b405',
  add constraint business_settings_primary_color_hex check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  add constraint business_settings_secondary_color_hex check (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  add constraint business_settings_accent_color_hex check (accent_color ~ '^#[0-9a-fA-F]{6}$');

comment on column public.business_settings.primary_color is 'Business workspace primary brand color as a six-digit hex value.';
comment on column public.business_settings.secondary_color is 'Business workspace secondary brand color as a six-digit hex value.';
comment on column public.business_settings.accent_color is 'Business workspace accent brand color as a six-digit hex value.';

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'organization-assets';

drop policy if exists organization_assets_insert on storage.objects;
drop policy if exists organization_assets_update on storage.objects;
drop policy if exists organization_assets_delete on storage.objects;

create policy organization_assets_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'organization-assets'
    and private.has_organization_permission(private.storage_organization_id(name), 'settings.manage')
  );
create policy organization_assets_update on storage.objects for update to authenticated
  using (
    bucket_id = 'organization-assets'
    and private.has_organization_permission(private.storage_organization_id(name), 'settings.manage')
  )
  with check (
    bucket_id = 'organization-assets'
    and private.has_organization_permission(private.storage_organization_id(name), 'settings.manage')
  );
create policy organization_assets_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'organization-assets'
    and private.has_organization_permission(private.storage_organization_id(name), 'settings.manage')
  );
