-- Metadata-driven, user-specific progress for the Negosyo Coach.
create table public.negosyo_coach_progress(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id)on delete cascade,
  user_id uuid not null references auth.users(id)on delete cascade,
  playbook_key text not null check(playbook_key~'^[a-z][a-z0-9_]{0,79}$'),
  last_task_key text check(last_task_key is null or last_task_key~'^[a-z][a-z0-9_]{0,79}$'),
  dismissed_at timestamptz,
  completed_at timestamptz,
  started_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(organization_id,user_id,playbook_key)
);

create index negosyo_coach_progress_user_idx
on public.negosyo_coach_progress(organization_id,user_id,updated_at desc);

create trigger set_updated_at before update on public.negosyo_coach_progress
for each row execute function private.set_updated_at();

create trigger capture_business_audit_event after insert or update or delete on public.negosyo_coach_progress
for each row execute function private.capture_business_audit_event();

alter table public.negosyo_coach_progress enable row level security;
create policy negosyo_coach_progress_read_own on public.negosyo_coach_progress
for select to authenticated
using(user_id=(select auth.uid())and private.can_business_permission(organization_id,'organization.read',null));

create function public.save_negosyo_coach_progress(
  requested_organization_id uuid,
  requested_playbook_key text,
  requested_last_task_key text default null,
  requested_dismissed boolean default false,
  requested_completed boolean default false
)returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());target_id uuid;
begin
  if actor is null or not private.can_business_permission(requested_organization_id,'organization.read',null)then
    raise exception'Permission denied.'using errcode='42501';
  end if;
  if requested_playbook_key!~'^[a-z][a-z0-9_]{0,79}$'
    or(requested_last_task_key is not null and requested_last_task_key!~'^[a-z][a-z0-9_]{0,79}$')then
    raise exception'Invalid coach progress.'using errcode='22023';
  end if;
  insert into public.negosyo_coach_progress(
    organization_id,user_id,playbook_key,last_task_key,dismissed_at,completed_at
  )values(
    requested_organization_id,actor,requested_playbook_key,requested_last_task_key,
    case when requested_dismissed then clock_timestamp()else null end,
    case when requested_completed then clock_timestamp()else null end
  )
  on conflict(organization_id,user_id,playbook_key)do update set
    last_task_key=coalesce(excluded.last_task_key,public.negosyo_coach_progress.last_task_key),
    dismissed_at=excluded.dismissed_at,
    completed_at=coalesce(excluded.completed_at,public.negosyo_coach_progress.completed_at)
  returning id into target_id;
  return target_id;
end$$;

revoke all on table public.negosyo_coach_progress from public,anon,authenticated;
grant select on table public.negosyo_coach_progress to authenticated;
revoke all on function public.save_negosyo_coach_progress(uuid,text,text,boolean,boolean)from public,anon,authenticated;
grant execute on function public.save_negosyo_coach_progress(uuid,text,text,boolean,boolean)to authenticated;

comment on table public.negosyo_coach_progress is'User-specific presentation state for metadata-defined onboarding playbooks; task completion is derived from real tenant records.';
