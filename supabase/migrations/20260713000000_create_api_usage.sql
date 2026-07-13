-- Server-only quota storage for the two quiz generation endpoints.
-- Apply this migration through the team's normal Supabase migration workflow.
-- The mobile app must never create or alter this table.

create table if not exists public.api_usage (
  id bigint generated always as identity primary key,
  device_id_hash text not null,
  endpoint text not null,
  usage_date date not null default ((now() at time zone 'utc')::date),
  created_at timestamptz not null default now(),
  constraint api_usage_endpoint_check
    check (endpoint in ('quiz/generate', 'quiz/generate-mixed'))
);

-- Fail instead of silently adopting an incompatible manually created table.
do $$
declare
  endpoint_constraint_definition text;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'api_usage'
      and column_name = 'id'
      and data_type = 'bigint'
      and is_nullable = 'NO'
      and is_identity = 'YES'
      and identity_generation = 'ALWAYS'
  ) then
    raise exception 'public.api_usage.id does not match the quota contract';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'api_usage'
      and column_name = 'device_id_hash'
      and data_type = 'text'
      and is_nullable = 'NO'
  ) then
    raise exception 'public.api_usage.device_id_hash does not match the quota contract';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'api_usage'
      and column_name = 'endpoint'
      and data_type = 'text'
      and is_nullable = 'NO'
  ) then
    raise exception 'public.api_usage.endpoint does not match the quota contract';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'api_usage'
      and column_name = 'usage_date'
      and data_type = 'date'
      and is_nullable = 'NO'
      and column_default is not null
  ) then
    raise exception 'public.api_usage.usage_date does not match the quota contract';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'api_usage'
      and column_name = 'created_at'
      and data_type = 'timestamp with time zone'
      and is_nullable = 'NO'
      and column_default is not null
  ) then
    raise exception 'public.api_usage.created_at does not match the quota contract';
  end if;

  if not exists (
    select 1
    from pg_constraint as constraint_record
    join pg_class as table_record
      on table_record.oid = constraint_record.conrelid
    join pg_namespace as schema_record
      on schema_record.oid = table_record.relnamespace
    where schema_record.nspname = 'public'
      and table_record.relname = 'api_usage'
      and constraint_record.contype = 'p'
      and pg_get_constraintdef(constraint_record.oid) = 'PRIMARY KEY (id)'
  ) then
    raise exception 'public.api_usage.id must be the primary key';
  end if;

  select pg_get_constraintdef(constraint_record.oid)
  into endpoint_constraint_definition
  from pg_constraint as constraint_record
  join pg_class as table_record
    on table_record.oid = constraint_record.conrelid
  join pg_namespace as schema_record
    on schema_record.oid = table_record.relnamespace
  where schema_record.nspname = 'public'
    and table_record.relname = 'api_usage'
    and constraint_record.contype = 'c'
    and constraint_record.conname = 'api_usage_endpoint_check';

  if endpoint_constraint_definition is null
    or position('quiz/generate-mixed' in endpoint_constraint_definition) = 0
    or position(
      'quiz/generate' in replace(
        endpoint_constraint_definition,
        'quiz/generate-mixed',
        ''
      )
    ) = 0
  then
    raise exception 'public.api_usage endpoint constraint does not match the quota contract';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'api_usage'
  ) then
    raise exception 'public.api_usage must not expose client RLS policies';
  end if;
end
$$;

create index if not exists idx_api_usage_device_day
  on public.api_usage (device_id_hash, usage_date);

create index if not exists idx_api_usage_device_day_endpoint
  on public.api_usage (device_id_hash, usage_date, endpoint);

create index if not exists idx_api_usage_global_day
  on public.api_usage (usage_date);

alter table public.api_usage enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'api_usage'
      and indexname = 'idx_api_usage_device_day'
      and regexp_replace(indexdef, '\s+', '', 'g') like '%(device_id_hash,usage_date)'
  ) then
    raise exception 'idx_api_usage_device_day does not match the quota contract';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'api_usage'
      and indexname = 'idx_api_usage_device_day_endpoint'
      and regexp_replace(indexdef, '\s+', '', 'g') like '%(device_id_hash,usage_date,endpoint)'
  ) then
    raise exception 'idx_api_usage_device_day_endpoint does not match the quota contract';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'api_usage'
      and indexname = 'idx_api_usage_global_day'
      and regexp_replace(indexdef, '\s+', '', 'g') like '%(usage_date)'
  ) then
    raise exception 'idx_api_usage_global_day does not match the quota contract';
  end if;

  if not exists (
    select 1
    from pg_class as table_record
    join pg_namespace as schema_record
      on schema_record.oid = table_record.relnamespace
    where schema_record.nspname = 'public'
      and table_record.relname = 'api_usage'
      and table_record.relrowsecurity
  ) then
    raise exception 'row level security must be enabled on public.api_usage';
  end if;
end
$$;

comment on table public.api_usage is
  'Server-only quiz quota usage. Apply schema changes through Supabase migrations, never from the mobile app.';
