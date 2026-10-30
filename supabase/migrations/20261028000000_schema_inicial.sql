-- Painel de Finanças Pessoais — schema inicial (Fase 1)
-- 17 tabelas, todas com user_id + RLS (user_id = auth.uid()).
-- O sync grava com a service_role usando OWNER_USER_ID.

create extension if not exists pgcrypto;

-- Conexões do Meu Pluggy -------------------------------------------------------
create table public.connections (
  item_id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  institution_name text not null,
  connector_id integer,
  status text not null default 'UPDATED',
  last_updated_at timestamptz,
  consent_expires_at date,
  created_at timestamptz not null default now()
);

create table public.accounts (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id text not null references public.connections (item_id) on delete cascade,
  type text not null check (type in ('BANK', 'CREDIT')),
  subtype text,
  name text not null,
  number_last4 text,
  balance numeric(14, 2) not null default 0,
  credit_limit numeric(14, 2),
  available_credit numeric(14, 2),
  updated_at timestamptz not null default now()
);

-- Categorias -------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  kind text not null check (kind in ('expense', 'income', 'transfer', 'investment')),
  color text,
  icon text,
  parent_id uuid references public.categories (id) on delete set null,
  unique (user_id, slug)
);

create table public.category_map (
  pluggy_category_id text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (user_id, pluggy_category_id)
);

create table public.category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pattern text not null,
  category_id uuid not null references public.categories (id) on delete cascade,
  priority integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Transações -------------------------------------------------------------------
create table public.transactions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id text not null references public.accounts (id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric(14, 2) not null, -- negativo = saída
  type text check (type in ('DEBIT', 'CREDIT')),
  status text,
  pluggy_category_id text,
  category_id uuid references public.categories (id) on delete set null,
  category_locked boolean not null default false,
  is_internal_transfer boolean not null default false,
  merchant_name text,
  installment_number integer,
  total_installments integer,
  updated_at timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_account_idx on public.transactions (account_id);

create table public.credit_card_bills (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id text not null references public.accounts (id) on delete cascade,
  closing_date date,
  due_date date not null,
  total_amount numeric(14, 2) not null,
  minimum_payment numeric(14, 2)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  amount numeric(14, 2) not null check (amount >= 0),
  unique (user_id, category_id, month)
);

-- Investimentos ----------------------------------------------------------------
create table public.investments (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source text not null check (source in ('pluggy', 'b3')),
  item_id text references public.connections (item_id) on delete set null,
  name text not null,
  type text not null,
  subtype text,
  institution text,
  balance numeric(14, 2) not null,
  amount_original numeric(14, 2),
  amount_profit numeric(14, 2),
  due_date date,
  rate numeric,
  rate_type text,
  isin text,
  code text,
  updated_at timestamptz not null default now()
);

create table public.investment_transactions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  investment_id text not null references public.investments (id) on delete cascade,
  date date not null,
  type text not null check (type in ('aporte', 'resgate', 'rendimento')),
  amount numeric(14, 2) not null,
  quantity numeric
);

create table public.net_worth_snapshots (
  date date not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cash_total numeric(14, 2) not null,
  investments_total numeric(14, 2) not null,
  card_debt_total numeric(14, 2) not null,
  net_worth numeric(14, 2) not null,
  primary key (user_id, date)
);

-- CDI diário (público; mesmo assim protegido por usuário para simplificar RLS)
create table public.cdi_daily (
  date date primary key,
  rate_pct numeric not null -- taxa do dia, % a.d. (SGS 12)
);

-- Metas ------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null,
  target_date date not null,
  manual_amount numeric(14, 2),
  is_emergency_fund boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.goal_links (
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ref_type text not null check (ref_type in ('investment', 'account')),
  ref_id text not null,
  primary key (goal_id, ref_type, ref_id)
);

create table public.settings (
  key text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  value jsonb not null,
  primary key (user_id, key)
);

-- IA e operação ----------------------------------------------------------------
create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period date not null,
  trigger text not null check (trigger in ('auto', 'manual')),
  input_summary jsonb not null,
  content_md text not null,
  model text not null,
  tokens_in integer,
  tokens_out integer,
  created_at timestamptz not null default now()
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'ok', 'partial', 'error')),
  stats jsonb,
  error text
);

-- RLS --------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'connections','accounts','categories','category_map','category_rules','transactions',
    'credit_card_bills','budgets','investments','investment_transactions','net_worth_snapshots',
    'goals','goal_links','settings','ai_reports','sync_runs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "dono" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

alter table public.cdi_daily enable row level security;
create policy "leitura autenticada" on public.cdi_daily for select to authenticated using (true);

-- Views do dashboard (security_invoker = respeitam a RLS de quem consulta) ------
create view public.v_monthly_summary with (security_invoker = true) as
select
  user_id,
  date_trunc('month', date)::date as month,
  sum(amount) filter (where amount > 0 and not is_internal_transfer) as income,
  -sum(amount) filter (where amount < 0 and not is_internal_transfer) as expense,
  sum(amount) filter (where not is_internal_transfer) as net
from public.transactions
group by 1, 2;

create view public.v_spend_by_category with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.date)::date as month,
  t.category_id,
  -sum(t.amount) as spent
from public.transactions t
where t.amount < 0 and not t.is_internal_transfer
group by 1, 2, 3;

create view public.v_budget_progress with (security_invoker = true) as
select
  b.user_id,
  b.month,
  b.category_id,
  b.amount as budget,
  coalesce(s.spent, 0) as spent
from public.budgets b
left join public.v_spend_by_category s
  on s.user_id = b.user_id and s.month = b.month and s.category_id = b.category_id;
