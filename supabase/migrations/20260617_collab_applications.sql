-- Creator/influencer partner program applications.
-- Originally created only in a different Supabase project (the MCP was
-- mispointed), so the production apply form returned 500. This recreates it
-- in the correct project.
create table if not exists public.collab_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  instagram_handle text not null,
  follower_count text,
  content_niche text,
  message text,
  status text not null default 'pending',
  referral_code text,
  reviewed_at timestamptz,
  notes text
);

create index if not exists idx_collab_applications_email on public.collab_applications (email);
create index if not exists idx_collab_applications_handle on public.collab_applications (instagram_handle);

alter table public.collab_applications enable row level security;

-- Public application form — anyone may submit. Reads/updates are admin-only
-- via the service role (which bypasses RLS).
drop policy if exists "Anyone can apply to collab" on public.collab_applications;
create policy "Anyone can apply to collab" on public.collab_applications
  for insert to anon, authenticated with check (true);
