-- These sequence tables are mutated only by private SECURITY DEFINER helpers.
-- RLS intentionally has no client policies, so Data API callers fail closed.
alter table public.purchasing_document_counters enable row level security;
alter table public.delivery_counters enable row level security;
alter table public.appointment_counters enable row level security;
alter table public.employee_counters enable row level security;
alter table public.job_order_counters enable row level security;
alter table public.expense_number_counters enable row level security;
