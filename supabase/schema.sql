-- ==============================================================================
-- ReportWise: Supabase Database Schema, Google Auth & Storage Configuration
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. PROFILES TABLE
-- Stores user demographic settings, language preference, and profile details
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
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

-- Safely migrate legacy text columns to uuid if they were created before auth integration
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'id' and data_type = 'text'
  ) then
    alter table public.profiles alter column id type uuid using id::uuid;
  end if;

  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'reports' and column_name = 'user_id' and data_type = 'text'
  ) then
    alter table public.reports alter column user_id type uuid using user_id::uuid;
  end if;
exception
  when others then
    null;
end $$;

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

-- 5. AUTOMATIC PROFILE CREATION TRIGGER (GOOGLE OAUTH)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, language)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'en'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. ROW LEVEL SECURITY (RLS) - Patient Isolation Policies
alter table public.profiles enable row level security;
alter table public.reports enable row level security;

-- Profiles Policies (Native UUID = UUID comparison)
drop policy if exists "Debug allow profiles access" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- Reports Policies (Native UUID = UUID comparison)
drop policy if exists "Debug allow reports access" on public.reports;
drop policy if exists "Users can view own reports" on public.reports;
create policy "Users can view own reports"
  on public.reports for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own reports" on public.reports;
create policy "Users can insert own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own reports" on public.reports;
create policy "Users can update own reports"
  on public.reports for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own reports" on public.reports;
create policy "Users can delete own reports"
  on public.reports for delete
  using (auth.uid() = user_id);

-- 7. STORAGE CONFIGURATION & POLICIES
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

-- Storage RLS: Restrict uploads, reads, and deletes to the user's dedicated folder
-- storage.foldername(name)[1] returns the root folder (user ID as text)
drop policy if exists "Debug allow storage upload" on storage.objects;
drop policy if exists "Debug allow storage select" on storage.objects;
drop policy if exists "Debug allow storage delete" on storage.objects;

drop policy if exists "Users can upload own report files" on storage.objects;
create policy "Users can upload own report files"
  on storage.objects for insert
  with check (
    bucket_id = 'reports' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own report files" on storage.objects;
create policy "Users can read own report files"
  on storage.objects for select
  using (
    bucket_id = 'reports' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own report files" on storage.objects;
create policy "Users can delete own report files"
  on storage.objects for delete
  using (
    bucket_id = 'reports' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
