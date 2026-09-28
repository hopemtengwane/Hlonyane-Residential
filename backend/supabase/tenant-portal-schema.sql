-- Hlonyane Residential production tenant portal schema
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.hlonyane_admins (
  email text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.hlonyane_admins(email, active) values
  ('msindisi.mtengwane@gmail.com', true),
  ('nomondehlonyane@gmail.com', true)
on conflict (email) do update set active = excluded.active;

create or replace function public.is_hlonyane_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hlonyane_admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))
      and a.active = true
  );
$$;

grant execute on function public.is_hlonyane_admin() to authenticated;

create table if not exists public.tenant_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  mobile text,
  emergency_contact text,
  property text,
  furnishing text not null default 'Unfurnished',
  rent_amount numeric(12,2),
  deposit_amount numeric(12,2),
  lease_start date,
  lease_end date,
  lease_status text not null default 'Active',
  away_from date,
  away_to date,
  notice_start date,
  notice_status text,
  profile_photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant_profiles(user_id) on delete cascade,
  category text not null,
  description text not null,
  photo_paths text[] not null default '{}',
  status text not null default 'Submitted',
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant_profiles(user_id) on delete cascade,
  direction text not null check (direction in ('tenant_to_admin','admin_to_tenant')),
  subject text not null,
  body text not null,
  attachment_paths text[] not null default '{}',
  sender_name text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant_profiles(user_id) on delete cascade,
  title text not null,
  document_type text,
  storage_path text not null,
  status text,
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant_profiles(user_id) on delete cascade,
  display_name text not null,
  body text not null,
  status text not null default 'Pending approval',
  created_at timestamptz not null default now()
);

alter table public.hlonyane_admins enable row level security;
alter table public.tenant_profiles enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.tenant_messages enable row level security;
alter table public.tenant_documents enable row level security;
alter table public.community_posts enable row level security;

drop policy if exists "Admins can read admin list" on public.hlonyane_admins;
create policy "Admins can read admin list" on public.hlonyane_admins for select to authenticated using (public.is_hlonyane_admin());

drop policy if exists "Tenants read own profile" on public.tenant_profiles;
create policy "Tenants read own profile" on public.tenant_profiles for select to authenticated using (user_id = auth.uid() or public.is_hlonyane_admin());
drop policy if exists "Tenants update own contact profile" on public.tenant_profiles;
create policy "Tenants update own contact profile" on public.tenant_profiles for update to authenticated using (user_id = auth.uid() or public.is_hlonyane_admin()) with check (user_id = auth.uid() or public.is_hlonyane_admin());
drop policy if exists "Admins insert profiles" on public.tenant_profiles;
create policy "Admins insert profiles" on public.tenant_profiles for insert to authenticated with check (public.is_hlonyane_admin());

drop policy if exists "Tenants manage own maintenance" on public.maintenance_requests;
create policy "Tenants manage own maintenance" on public.maintenance_requests for all to authenticated using (tenant_id = auth.uid() or public.is_hlonyane_admin()) with check (tenant_id = auth.uid() or public.is_hlonyane_admin());

drop policy if exists "Tenants read own messages" on public.tenant_messages;
create policy "Tenants read own messages" on public.tenant_messages for select to authenticated using (tenant_id = auth.uid() or public.is_hlonyane_admin());
drop policy if exists "Tenants send own messages" on public.tenant_messages;
create policy "Tenants send own messages" on public.tenant_messages for insert to authenticated with check ((tenant_id = auth.uid() and direction = 'tenant_to_admin') or public.is_hlonyane_admin());
drop policy if exists "Admins update messages" on public.tenant_messages;
create policy "Admins update messages" on public.tenant_messages for update to authenticated using (public.is_hlonyane_admin()) with check (public.is_hlonyane_admin());

drop policy if exists "Tenants read own documents" on public.tenant_documents;
create policy "Tenants read own documents" on public.tenant_documents for select to authenticated using (tenant_id = auth.uid() or public.is_hlonyane_admin());
drop policy if exists "Admins manage documents" on public.tenant_documents;
create policy "Admins manage documents" on public.tenant_documents for all to authenticated using (public.is_hlonyane_admin()) with check (public.is_hlonyane_admin());

drop policy if exists "Tenants manage own community posts" on public.community_posts;
create policy "Tenants manage own community posts" on public.community_posts for select to authenticated using (tenant_id = auth.uid() or public.is_hlonyane_admin());
drop policy if exists "Tenants create community posts" on public.community_posts;
create policy "Tenants create community posts" on public.community_posts for insert to authenticated with check (tenant_id = auth.uid());
drop policy if exists "Admins moderate community posts" on public.community_posts;
create policy "Admins moderate community posts" on public.community_posts for update to authenticated using (public.is_hlonyane_admin()) with check (public.is_hlonyane_admin());
drop policy if exists "Public reads approved community posts" on public.community_posts;
create policy "Public reads approved community posts" on public.community_posts for select to anon using (status = 'Approved');

insert into storage.buckets(id,name,public) values
  ('tenant-maintenance','tenant-maintenance',false),
  ('tenant-documents','tenant-documents',false),
  ('tenant-profile-photos','tenant-profile-photos',false)
on conflict (id) do nothing;

drop policy if exists "Tenant maintenance uploads" on storage.objects;
create policy "Tenant maintenance uploads" on storage.objects for insert to authenticated with check (
  bucket_id='tenant-maintenance' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_hlonyane_admin())
);
drop policy if exists "Tenant maintenance reads" on storage.objects;
create policy "Tenant maintenance reads" on storage.objects for select to authenticated using (
  bucket_id='tenant-maintenance' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_hlonyane_admin())
);

drop policy if exists "Tenant document reads" on storage.objects;
create policy "Tenant document reads" on storage.objects for select to authenticated using (
  bucket_id='tenant-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_hlonyane_admin())
);
drop policy if exists "Admin document management" on storage.objects;
create policy "Admin document management" on storage.objects for all to authenticated using (
  bucket_id='tenant-documents' and public.is_hlonyane_admin()
) with check (bucket_id='tenant-documents' and public.is_hlonyane_admin());

drop policy if exists "Tenant profile photo management" on storage.objects;
create policy "Tenant profile photo management" on storage.objects for all to authenticated using (
  bucket_id='tenant-profile-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_hlonyane_admin())
) with check (bucket_id='tenant-profile-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_hlonyane_admin()));
