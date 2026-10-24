-- ==============================================================================
-- ReportWise: Supabase Database Schema & Storage Configuration (Debug / No-Auth Mode)
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. PROFILES TABLE
create table if not exists public.profiles (
  id text primary key default 'd3b00000-0000-4000-a000-000000000000',
  email text,
  full_name text,
  age integer check (age is null or (age >= 0 and age <= 125)),
  sex text check (sex in ('male', 'female', 'other')),
  diet_preference text check (diet_preference in ('veg', 'non-veg', 'vegan')),
  language text not null default 'en' check (language in ('en', 'hi')),
  consent_given_at timestamptz,
  keep_original_files boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast user queries
create index if not exists idx_profiles_email on public.profiles(email);

-- 3. REPORTS TABLE
-- Stores uploaded medical reports, extraction states, and AI interpretations
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'd3b00000-0000-4000-a000-000000000000',
  title text not null default 'Lab Report',
  report_date date,
  report_type text,
  status text not null default 'processing' 
    check (status in ('uploading', 'processing', 'extracted', 'analyzing', 'completed', 'failed')),
  storage_file_paths text[] not null default '{}',
  extracted_data jsonb,
  confirmed_data jsonb,
  analysis_data jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for fast queries
create index if not exists idx_reports_user_id on public.reports(user_id);
create index if not exists idx_reports_created_at on public.reports(created_at desc);
create index if not exists idx_reports_status on public.reports(status);

-- 4. AUTOMATIC TIMESTAMP TRIGGERS
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- 5. ROW LEVEL SECURITY (RLS) - Permissive for Debugging
alter table public.profiles enable row level security;
alter table public.reports enable row level security;

-- Profiles Policies
drop policy if exists "Debug allow profiles access" on public.profiles;
create policy "Debug allow profiles access"
  on public.profiles for all
  using (true)
  with check (true);

-- Reports Policies
drop policy if exists "Debug allow reports access" on public.reports;
create policy "Debug allow reports access"
  on public.reports for all
  using (true)
  with check (true);

-- 6. STORAGE CONFIGURATION & POLICIES
-- Create the private 'reports' bucket if it doesn't already exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reports',
  'reports',
  false,
  10485760, -- 10 MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

-- Storage RLS: Allow uploads and reads in reports bucket during debug mode
drop policy if exists "Debug allow storage upload" on storage.objects;
create policy "Debug allow storage upload"
  on storage.objects for insert
  with check (bucket_id = 'reports');

drop policy if exists "Debug allow storage select" on storage.objects;
create policy "Debug allow storage select"
  on storage.objects for select
  using (bucket_id = 'reports');

drop policy if exists "Debug allow storage delete" on storage.objects;
create policy "Debug allow storage delete"
  on storage.objects for delete
  using (bucket_id = 'reports');
