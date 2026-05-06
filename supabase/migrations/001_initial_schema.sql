-- ============================================================
-- AI Notetaker — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Meetings ────────────────────────────────────────────────
create table if not exists public.meetings (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid references auth.users(id) on delete cascade,
  title                   text not null default 'Untitled Meeting',
  created_at              timestamptz not null default now(),
  duration_seconds        integer not null default 0,
  status                  text not null default 'recording'
                            check (status in (
                              'recording','uploading','transcribing',
                              'processing','completed','error'
                            )),
  error_message           text,
  audio_storage_path      text,   -- Supabase Storage path
  assembly_transcript_id  text    -- AssemblyAI job ID for polling
);

-- ─── Transcripts ─────────────────────────────────────────────
create table if not exists public.transcripts (
  id          uuid primary key default uuid_generate_v4(),
  meeting_id  uuid not null references public.meetings(id) on delete cascade unique,
  full_text   text,
  utterances  jsonb default '[]'::jsonb  -- [{speaker, text, start, end}]
);

-- ─── Speakers ────────────────────────────────────────────────
create table if not exists public.speakers (
  id           uuid primary key default uuid_generate_v4(),
  meeting_id   uuid not null references public.meetings(id) on delete cascade,
  label        text not null,        -- "A", "B", "C"
  display_name text not null,        -- user-editable e.g. "John Doe"
  color        text not null
);

create unique index if not exists speakers_meeting_label_unique
  on public.speakers(meeting_id, label);

-- ─── Meeting Insights ────────────────────────────────────────
create table if not exists public.meeting_insights (
  id          uuid primary key default uuid_generate_v4(),
  meeting_id  uuid not null references public.meetings(id) on delete cascade unique,
  summary     text,
  notes       jsonb default '[]'::jsonb,        -- string[]
  topics      jsonb default '[]'::jsonb,        -- TopicSection[]
  actionables jsonb default '[]'::jsonb         -- ActionItem[]
);

-- ─── Row Level Security ──────────────────────────────────────
alter table public.meetings         enable row level security;
alter table public.transcripts      enable row level security;
alter table public.speakers         enable row level security;
alter table public.meeting_insights enable row level security;

-- Users can only access their own data
create policy "Users own meetings" on public.meetings
  for all using (auth.uid() = user_id);

create policy "Users own transcripts" on public.transcripts
  for all using (
    meeting_id in (select id from public.meetings where user_id = auth.uid())
  );

create policy "Users own speakers" on public.speakers
  for all using (
    meeting_id in (select id from public.meetings where user_id = auth.uid())
  );

create policy "Users own insights" on public.meeting_insights
  for all using (
    meeting_id in (select id from public.meetings where user_id = auth.uid())
  );

-- ─── Supabase Storage Bucket ─────────────────────────────────
-- Run this in Supabase Storage settings or via SQL:
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

create policy "Users upload own recordings" on storage.objects
  for insert with check (
    bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own recordings" on storage.objects
  for select using (
    bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own recordings" on storage.objects
  for delete using (
    bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]
  );
