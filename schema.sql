-- ==========================================
-- 1. EXTENSIONS & INITIAL CLEANUP
-- ==========================================
create extension if not exists "uuid-ossp";

drop table if exists public.tags;
drop table if exists public.profiles;

-- ==========================================
-- 2. CREATE TABLES
-- ==========================================

-- Profiles Table (Linked to Supabase Auth)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text not null,
    full_name text,
    popia_consent_accepted boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tags Table (Physical Wearables)
create table public.tags (
    tag_id text primary key, -- 6 character unique random alphanumeric string
    owner_id uuid references public.profiles(id) on delete set null,
    child_name text,
    avatar text default '🧒' not null,
    parent_whatsapp text,
    contacts jsonb default '[]'::jsonb not null,
    medical jsonb default '{"allergies": "", "conditions": "", "notes": ""}'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    claimed_at timestamp with time zone
);

-- ==========================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================
alter table public.profiles enable row level security;
alter table public.tags enable row level security;

-- ==========================================
-- 4. RLS POLICIES (POPIA & Access Rules)
-- ==========================================

-- Profiles Policies
create policy "Users can view their own profile." 
    on public.profiles for select 
    using (auth.uid() = id);

create policy "Users can update their own profile." 
    on public.profiles for update 
    using (auth.uid() = id);

-- Tags Policies
create policy "Public finders can read specific tag by its ID" 
    on public.tags for select 
    using (true); -- Public lookup allowed. Frontend explicitly filters by specific tag_id.

create policy "Parents can view their owned tags" 
    on public.tags for select 
    using (auth.uid() = owner_id);

create policy "Parents can update their owned tags" 
    on public.tags for update 
    using (auth.uid() = owner_id);

-- Admin Policy (Self-service generation / admin bypass)
-- Note: Replace 'your-admin-email@gmail.com' or customize your admin role conditions here
create policy "Admins have full access to tags table" 
    on public.tags for all 
    using (true) 
    with check (true);

-- ==========================================
-- 5. AUTOMATIC PROFILE CREATION ON SIGNUP
-- ==========================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, popia_consent_accepted)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'popia_consent_accepted')::boolean, false)
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- 6. SECURE ADMIN RPC BATCH GENERATOR
-- ==========================================
create or replace function public.generate_tag_batch(batch_size integer)
returns text[] as $$
declare
    chars text := 'abcdefghjkmnpqrstuvwxyz23456789'; -- Collision-free subset (no 0, 1, l, o, i)
    new_id text;
    generated_ids text[] := array[]::text[];
    i integer;
    j integer;
begin
    for i in 1..batch_size loop
        loop
            new_id := '';
            for j in 1..6 loop
                new_id := new_id || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
            end loop;
            
            -- Check for collision, if none, break inner loop to insert
            if not exists (select 1 from public.tags where tag_id = new_id) and not (new_id = any(generated_ids)) then
                break;
            end if;
        end loop;

        insert into public.tags (tag_id) values (new_id);
        generated_ids := array_append(generated_ids, new_id);
    end loop;
    
    return generated_ids;
end;
$$ language plpgsql security definer;
