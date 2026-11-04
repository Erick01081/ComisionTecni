create table if not exists public.recibos_consecutivos (
  numero bigint generated always as identity (start with 500 increment by 1) primary key,
  creado_en timestamptz not null default now()
);

alter table public.recibos_consecutivos enable row level security;

revoke all on public.recibos_consecutivos from anon, authenticated;
grant insert, select on public.recibos_consecutivos to service_role;
grant usage, select on sequence public.recibos_consecutivos_numero_seq to service_role;
