create table if not exists public.marketplace_bounties (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    opportunity_id text not null references public.opportunities(id) on delete cascade,
    capability_gap text not null,
    capability_vector vector(1536),
    bounty_amount numeric not null default 0,
    status text not null default 'open' check (status in ('open', 'matched', 'locked', 'completed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.marketplace_matches (
    id uuid primary key default gen_random_uuid(),
    bounty_id uuid not null references public.marketplace_bounties(id) on delete cascade,
    sme_tenant_id uuid not null references public.tenants(id) on delete cascade,
    stripe_payment_intent_id text,
    matched_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(bounty_id, sme_tenant_id)
);

-- RLS
alter table public.marketplace_bounties enable row level security;
alter table public.marketplace_matches enable row level security;

-- Policies
create policy "Tenants can view all open bounties" 
on public.marketplace_bounties for select 
using (status = 'open' or tenant_id::text = (select auth.jwt() ->> 'tenant_id'));

create policy "Tenants can insert their own bounties" 
on public.marketplace_bounties for insert 
with check (tenant_id::text = (select auth.jwt() ->> 'tenant_id'));

create policy "Tenants can view their own matches" 
on public.marketplace_matches for select 
using (sme_tenant_id::text = (select auth.jwt() ->> 'tenant_id') or 
       bounty_id in (select id from public.marketplace_bounties where tenant_id::text = (select auth.jwt() ->> 'tenant_id')));

create policy "Tenants can insert a match" 
on public.marketplace_matches for insert 
with check (sme_tenant_id::text = (select auth.jwt() ->> 'tenant_id'));
