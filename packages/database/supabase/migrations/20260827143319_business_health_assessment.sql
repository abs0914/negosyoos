-- Module 29: durable Business Health Assessments and shared BusinessProfile context.
create function private.business_health_scores_are_valid(value jsonb)returns boolean language plpgsql immutable set search_path=''as $$
declare key text;area text;begin
 if jsonb_typeof(value)<>'object'or not(value?&array['overallBusinessHealth','salesHealth','cashflow','inventory','customerManagement','operations','digitalReadiness','areas'])or jsonb_typeof(value->'areas')<>'object'then return false;end if;
 foreach key in array array['overallBusinessHealth','salesHealth','cashflow','inventory','customerManagement','operations','digitalReadiness']loop if jsonb_typeof(value->key)<>'number'or(value->>key)::numeric not between 0 and 100 then return false;end if;end loop;
 foreach area in array array['sales','profitability','cashflow','inventory','customers','operations','employees','digital_readiness','marketing','record_keeping']loop if jsonb_typeof(value->'areas'->area)<>'number'or(value->'areas'->>area)::numeric not between 0 and 100 then return false;end if;end loop;return true;
exception when others then return false;end;$$;
create function private.business_health_responses_are_valid(value jsonb)returns boolean language plpgsql immutable set search_path=''as $$
declare answer jsonb;answer_count integer:=0;begin if jsonb_typeof(value)<>'object'then return false;end if;for answer in select entry.value from jsonb_each(value)entry loop answer_count:=answer_count+1;if jsonb_typeof(answer)<>'number'or(answer#>>'{}')::integer not between 0 and 4 then return false;end if;end loop;return answer_count>=20;exception when others then return false;end;$$;

create table public.business_health_assessments(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id)on delete cascade,
 industry text not null check(industry in('retail_hardware','food_restaurant','salon_service','professional_services','repair_services','wholesale_distribution','other')),
 responses jsonb not null check(private.business_health_responses_are_valid(responses)),
 scores jsonb not null check(private.business_health_scores_are_valid(scores)),
 strengths text[]not null check(cardinality(strengths)between 1 and 3),priorities text[]not null check(cardinality(priorities)between 1 and 3),
 completed_by uuid not null references auth.users(id),completed_at timestamptz not null default now(),created_at timestamptz not null default now(),
 unique(id,organization_id)
);
create index business_health_assessments_history_idx on public.business_health_assessments(organization_id,completed_at desc);
create table public.business_profiles(
 organization_id uuid primary key references public.organizations(id)on delete cascade,
 profile jsonb not null default'{}'::jsonb check(jsonb_typeof(profile)='object'),
 latest_assessment_id uuid,updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now(),
 foreign key(latest_assessment_id,organization_id)references public.business_health_assessments(id,organization_id)on delete restrict
);
create trigger set_updated_at before update on public.business_profiles for each row execute function private.set_updated_at();

create function public.save_business_health_assessment(requested_organization_id uuid,requested_industry text,requested_responses jsonb,requested_scores jsonb,requested_strengths text[],requested_priorities text[])returns uuid
language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());assessment uuid;profile_value jsonb;
begin
 if actor is null or not(private.can_business_permission(requested_organization_id,'ai.manage',null)or private.can_business_permission(requested_organization_id,'settings.manage',null))then raise exception'Permission denied.'using errcode='42501';end if;
 if requested_industry not in('retail_hardware','food_restaurant','salon_service','professional_services','repair_services','wholesale_distribution','other')or not private.business_health_responses_are_valid(requested_responses)or not private.business_health_scores_are_valid(requested_scores)or cardinality(requested_strengths)not between 1 and 3 or cardinality(requested_priorities)not between 1 and 3 then raise exception'Invalid Business Health Assessment.'using errcode='22023';end if;
 insert into public.business_health_assessments(organization_id,industry,responses,scores,strengths,priorities,completed_by)values(requested_organization_id,requested_industry,requested_responses,requested_scores,requested_strengths,requested_priorities,actor)returning id into assessment;
 profile_value:=jsonb_build_object('assessmentId',assessment,'industry',requested_industry,'scores',requested_scores,'completedAt',now());
 insert into public.business_profiles(organization_id,profile,latest_assessment_id,updated_by)values(requested_organization_id,jsonb_build_object('healthAssessment',profile_value),assessment,actor)
 on conflict(organization_id)do update set profile=public.business_profiles.profile||jsonb_build_object('healthAssessment',profile_value),latest_assessment_id=assessment,updated_by=actor;
 update public.ai_business_interviews set profile=profile||jsonb_build_object('healthAssessment',profile_value)where organization_id=requested_organization_id and status='in_progress';
 return assessment;
end;$$;

create or replace function public.start_ai_business_interview(requested_organization_id uuid,initial_prompt text)returns uuid language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());interview uuid;initial_profile jsonb;
begin if actor is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;if char_length(btrim(initial_prompt))not between 1 and 3000 then raise exception'Invalid interview prompt.'using errcode='22023';end if;
 select profile into initial_profile from public.business_profiles where organization_id=requested_organization_id;initial_profile:=coalesce(initial_profile,'{}'::jsonb)||'{"salesChannels":[],"customerInteractions":[],"operationalProblems":[],"currentTools":[],"goals":[]}'::jsonb;
 insert into public.ai_business_interviews(organization_id,created_by,profile)values(requested_organization_id,actor,initial_profile)returning id into interview;
 insert into public.ai_business_interview_messages(organization_id,interview_id,role,stage,content)values(requested_organization_id,interview,'assistant','industry',btrim(initial_prompt));return interview;end;$$;

alter table public.business_health_assessments enable row level security;alter table public.business_profiles enable row level security;
create policy business_health_assessments_read on public.business_health_assessments for select to authenticated using(private.can_business_permission(organization_id,'ai.read',null)or private.can_business_permission(organization_id,'ai.manage',null)or private.can_business_permission(organization_id,'organization.read',null));
create policy business_profiles_read on public.business_profiles for select to authenticated using(private.can_business_permission(organization_id,'ai.read',null)or private.can_business_permission(organization_id,'ai.manage',null)or private.can_business_permission(organization_id,'organization.read',null));
revoke all on public.business_health_assessments,public.business_profiles from public,anon,authenticated;grant select on public.business_health_assessments,public.business_profiles to authenticated;
revoke all on function private.business_health_scores_are_valid(jsonb),private.business_health_responses_are_valid(jsonb)from public,anon,authenticated;
revoke all on function public.save_business_health_assessment(uuid,text,jsonb,jsonb,text[],text[])from public,anon;grant execute on function public.save_business_health_assessment(uuid,text,jsonb,jsonb,text[],text[])to authenticated;
comment on table public.business_health_assessments is'Immutable completed SME health assessments retained after onboarding.';
comment on table public.business_profiles is'Tenant BusinessProfile context shared by health assessment, Business OS recommendations, and AI onboarding.';
