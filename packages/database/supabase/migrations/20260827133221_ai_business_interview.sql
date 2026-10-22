-- Module 26: conversational, recommendation-only AI business interview.
create table public.ai_business_interviews(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id)on delete cascade,
 status text not null default'in_progress'check(status in('in_progress','completed','approved','rejected')),
 current_stage text not null default'industry'check(current_stage in('industry','size','branches','sales','inventory','customers','employees_workflows','operational_problems','current_tools','goals','complete')),
 profile jsonb not null default'{"salesChannels":[],"customerInteractions":[],"operationalProblems":[],"currentTools":[],"goals":[]}'check(jsonb_typeof(profile)='object'),
 recommendation jsonb check(recommendation is null or jsonb_typeof(recommendation)='object'),
 created_by uuid not null references auth.users(id),reviewed_by uuid references auth.users(id),completed_at timestamptz,reviewed_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,organization_id),
 check((status='in_progress'and current_stage<>'complete'and recommendation is null and completed_at is null)or(status in('completed','approved','rejected')and current_stage='complete'and recommendation is not null and completed_at is not null)),
 check((status in('approved','rejected'))=(reviewed_by is not null and reviewed_at is not null))
);
create table public.ai_business_interview_messages(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id)on delete cascade,
 interview_id uuid not null,role text not null check(role in('assistant','user')),stage text not null check(stage in('industry','size','branches','sales','inventory','customers','employees_workflows','operational_problems','current_tools','goals','complete')),
 content text not null check(char_length(btrim(content))between 1 and 3000),created_at timestamptz not null default now(),
 foreign key(interview_id,organization_id)references public.ai_business_interviews(id,organization_id)on delete cascade
);
create index ai_business_interviews_history_idx on public.ai_business_interviews(organization_id,created_at desc);
create index ai_business_interview_messages_thread_idx on public.ai_business_interview_messages(organization_id,interview_id,created_at,id);
create trigger set_updated_at before update on public.ai_business_interviews for each row execute function private.set_updated_at();

create function public.start_ai_business_interview(requested_organization_id uuid,initial_prompt text)returns uuid language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());interview uuid;
begin if actor is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;if char_length(btrim(initial_prompt))not between 1 and 3000 then raise exception'Invalid interview prompt.'using errcode='22023';end if;
 insert into public.ai_business_interviews(organization_id,created_by)values(requested_organization_id,actor)returning id into interview;
 insert into public.ai_business_interview_messages(organization_id,interview_id,role,stage,content)values(requested_organization_id,interview,'assistant','industry',btrim(initial_prompt));return interview;end;$$;

create function public.record_ai_business_interview_turn(requested_organization_id uuid,requested_interview_id uuid,expected_stage text,user_answer text,updated_profile jsonb,next_stage text,assistant_response text,generated_recommendation jsonb default null)returns void language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());interview public.ai_business_interviews%rowtype;
begin if actor is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;if expected_stage not in('industry','size','branches','sales','inventory','customers','employees_workflows','operational_problems','current_tools','goals')or next_stage<>(case expected_stage when'industry'then'size'when'size'then'branches'when'branches'then'sales'when'sales'then'inventory'when'inventory'then'customers'when'customers'then'employees_workflows'when'employees_workflows'then'operational_problems'when'operational_problems'then'current_tools'when'current_tools'then'goals'when'goals'then'complete'end)or jsonb_typeof(updated_profile)<>'object'or char_length(btrim(user_answer))not between 2 and 2000 or char_length(btrim(assistant_response))not between 1 and 3000 or(next_stage='complete')<>(generated_recommendation is not null and jsonb_typeof(generated_recommendation)='object')then raise exception'Invalid interview turn.'using errcode='22023';end if;
 select*into interview from public.ai_business_interviews where id=requested_interview_id and organization_id=requested_organization_id for update;if interview.id is null or interview.status<>'in_progress'or interview.current_stage<>expected_stage then raise exception'Interview changed; refresh before answering.'using errcode='P0001';end if;
 insert into public.ai_business_interview_messages(organization_id,interview_id,role,stage,content)values(requested_organization_id,interview.id,'user',expected_stage,btrim(user_answer)),(requested_organization_id,interview.id,'assistant',next_stage,btrim(assistant_response));
 update public.ai_business_interviews set profile=updated_profile,current_stage=next_stage,status=case when next_stage='complete'then'completed'else'in_progress'end,recommendation=generated_recommendation,completed_at=case when next_stage='complete'then now()else null end where id=interview.id;end;$$;

create function public.review_ai_business_interview(requested_organization_id uuid,requested_interview_id uuid,decision text)returns void language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());begin if actor is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;if decision not in('approved','rejected')then raise exception'Invalid recommendation decision.'using errcode='22023';end if;update public.ai_business_interviews set status=decision,reviewed_by=actor,reviewed_at=now()where id=requested_interview_id and organization_id=requested_organization_id and status='completed';if not found then raise exception'Recommendation is not awaiting review.'using errcode='P0001';end if;end;$$;

alter table public.ai_business_interviews enable row level security;alter table public.ai_business_interview_messages enable row level security;
create policy ai_business_interviews_read on public.ai_business_interviews for select to authenticated using(private.can_business_permission(organization_id,'ai.read',null)or private.can_business_permission(organization_id,'ai.manage',null));
create policy ai_business_interview_messages_read on public.ai_business_interview_messages for select to authenticated using(private.can_business_permission(organization_id,'ai.read',null)or private.can_business_permission(organization_id,'ai.manage',null));
revoke all on public.ai_business_interviews,public.ai_business_interview_messages from public,anon,authenticated;grant select on public.ai_business_interviews,public.ai_business_interview_messages to authenticated;
revoke all on function public.start_ai_business_interview(uuid,text),public.record_ai_business_interview_turn(uuid,uuid,text,text,jsonb,text,text,jsonb),public.review_ai_business_interview(uuid,uuid,text)from public,anon;grant execute on function public.start_ai_business_interview(uuid,text),public.record_ai_business_interview_turn(uuid,uuid,text,text,jsonb,text,text,jsonb),public.review_ai_business_interview(uuid,uuid,text)to authenticated;
comment on table public.ai_business_interviews is'Recommendation-only SME interviews. Approval records user intent but never applies configuration.';
