-- Editable website content (homepage manager). One row per key; the app falls back to built-in
-- defaults for anything not saved yet. Anyone can read (it's public website copy); only admins write.
create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  constraint site_settings_value_object check (jsonb_typeof(value) = 'object'),
  constraint site_settings_value_size check (octet_length(value::text) < 100000)
);

create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;
create policy "site_settings: public read" on public.site_settings for select using (true);
create policy "site_settings: admin write" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
