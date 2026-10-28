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
  using (auth.uid() = id)
  with check (auth.uid() = id);

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
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

-- ==============================================================================
-- 8. ASK REPORTWISE CHAT CONVERSATIONS & MESSAGES (USER-SCOPED)
-- ==============================================================================

-- Conversations Table
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_conversations_user_id on public.chat_conversations(user_id);
create index if not exists idx_chat_conversations_updated_at on public.chat_conversations(updated_at desc);

-- Chat Messages Table
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  feedback text check (feedback is null or feedback in ('helpful', 'unhelpful')),
  created_at timestamptz not null default now()
);

-- Migration logic for legacy report-scoped chat_messages if they exist:
do $$
begin
  -- Check if legacy report_id column exists
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'chat_messages' and column_name = 'report_id'
  ) then
    -- Make report_id nullable
    alter table public.chat_messages alter column report_id drop not null;

    -- Ensure conversation_id column exists
    if not exists (
      select 1 from information_schema.columns 
      where table_schema = 'public' and table_name = 'chat_messages' and column_name = 'conversation_id'
    ) then
      alter table public.chat_messages add column conversation_id uuid references public.chat_conversations(id) on delete cascade;
    end if;

    -- Migrate existing messages into one conversation per old report
    insert into public.chat_conversations (id, user_id, title, created_at, updated_at)
    select 
      gen_random_uuid(),
      m.user_id,
      coalesce(r.title, 'Report Discussion'),
      min(m.created_at),
      max(m.created_at)
    from public.chat_messages m
    left join public.reports r on r.id = m.report_id
    where m.conversation_id is null and m.report_id is not null
    group by m.user_id, m.report_id, r.title;

    -- Link messages to the newly created conversation
    update public.chat_messages m
    set conversation_id = c.id
    from public.chat_conversations c
    where m.conversation_id is null 
      and m.user_id = c.user_id;

    -- Drop report_id or keep it nullable
    alter table public.chat_messages alter column report_id drop not null;
  end if;
exception
  when others then
    null;
end $$;

-- Enforce not null on conversation_id for clean schemas if safe
do $$
begin
  if not exists (
    select 1 from public.chat_messages where conversation_id is null
  ) then
    alter table public.chat_messages alter column conversation_id set not null;
  end if;
exception
  when others then
    null;
end $$;

create index if not exists idx_chat_messages_conversation_id on public.chat_messages(conversation_id, created_at asc);
create index if not exists idx_chat_messages_user_id on public.chat_messages(user_id);

-- Updated_at trigger for conversations
drop trigger if exists set_chat_conversations_updated_at on public.chat_conversations;
create trigger set_chat_conversations_updated_at
  before update on public.chat_conversations
  for each row execute function public.set_updated_at();

-- RLS: Enable row level security
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

-- Policies for chat_conversations
drop policy if exists "Users can view own conversations" on public.chat_conversations;
create policy "Users can view own conversations"
  on public.chat_conversations for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own conversations" on public.chat_conversations;
create policy "Users can insert own conversations"
  on public.chat_conversations for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own conversations" on public.chat_conversations;
create policy "Users can update own conversations"
  on public.chat_conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own conversations" on public.chat_conversations;
create policy "Users can delete own conversations"
  on public.chat_conversations for delete
  using (auth.uid() = user_id);

-- Policies for chat_messages
drop policy if exists "Users can view own messages" on public.chat_messages;
create policy "Users can view own messages"
  on public.chat_messages for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own messages" on public.chat_messages;
create policy "Users can insert own messages"
  on public.chat_messages for insert
  with check (
    auth.uid() = user_id and
    (conversation_id is null or exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    ))
  );

drop policy if exists "Users can update own messages" on public.chat_messages;
create policy "Users can update own messages"
  on public.chat_messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own messages" on public.chat_messages;
create policy "Users can delete own messages"
  on public.chat_messages for delete
  using (auth.uid() = user_id);

-- ==============================================================================
-- 9. USER FEEDBACK TABLE
-- ==============================================================================
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  category text not null default 'general',
  rating text,
  message text not null,
  recipient_email text not null default 'samarmehta845@gmail.com',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- RLS: Enable row level security
alter table public.feedback enable row level security;

-- Policies for feedback: Anyone (authenticated or guest) can submit feedback with strict user_id checking
drop policy if exists "Anyone can submit feedback" on public.feedback;
create policy "Anyone can submit feedback"
  on public.feedback for insert
  with check (
    (auth.uid() is not null and user_id = auth.uid()) or
    (auth.uid() is null and user_id is null)
  );

-- Users can view their own submitted feedback
drop policy if exists "Users can view own feedback" on public.feedback;
create policy "Users can view own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

-- ==============================================================================
-- 10. RATE LIMITING & ABUSE PREVENTION
-- ==============================================================================
create table if not exists public.rate_limits (
  key text not null,
  bucket text not null,
  count int not null default 1,
  window_start timestamptz not null default now(),
  primary key (key, bucket)
);

create index if not exists idx_rate_limits_window_start on public.rate_limits(window_start);

alter table public.rate_limits enable row level security;

-- Rate limits are accessed via SECURITY DEFINER functions only; revoke direct public access
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_key text,
  p_bucket text,
  p_limit int,
  p_window_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_interval interval := (p_window_seconds || ' seconds')::interval;
  v_rec public.rate_limits%rowtype;
begin
  -- Lock or insert initial record
  insert into public.rate_limits (key, bucket, count, window_start)
  values (p_key, p_bucket, 1, v_now)
  on conflict (key, bucket) do nothing;

  select * into v_rec
  from public.rate_limits
  where key = p_key and bucket = p_bucket
  for update;

  -- Window has rolled over: reset window and count
  if v_now >= v_rec.window_start + v_window_interval then
    update public.rate_limits
    set count = 1,
        window_start = v_now
    where key = p_key and bucket = p_bucket;

    return jsonb_build_object(
      'allowed', true,
      'current', 1,
      'limit', p_limit,
      'remaining', greatest(0, p_limit - 1),
      'reset_at', v_now + v_window_interval
    );
  end if;

  -- Within current window
  if v_rec.count < p_limit then
    update public.rate_limits
    set count = count + 1
    where key = p_key and bucket = p_bucket;

    return jsonb_build_object(
      'allowed', true,
      'current', v_rec.count + 1,
      'limit', p_limit,
      'remaining', greatest(0, p_limit - (v_rec.count + 1)),
      'reset_at', v_rec.window_start + v_window_interval
    );
  else
    return jsonb_build_object(
      'allowed', false,
      'current', v_rec.count,
      'limit', p_limit,
      'remaining', 0,
      'reset_at', v_rec.window_start + v_window_interval
    );
  end if;
end;
$$;

create or replace function public.reset_rate_limit(
  p_key text,
  p_bucket text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_bucket is null then
    delete from public.rate_limits where key = p_key;
  else
    delete from public.rate_limits where key = p_key and bucket = p_bucket;
  end if;
end;
$$;


