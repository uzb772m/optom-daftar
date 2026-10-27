-- Optom Daftar — Supabase Migration
-- PostgreSQL schema, functions, RLS and views

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- 1. Businesses
create table if not exists businesses (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    phone text,
    address text,
    created_at timestamptz not null default now()
);

-- 2. Memberships
create table if not exists memberships (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references businesses(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('owner', 'seller')),
    created_at timestamptz not null default now(),
    unique(business_id, user_id)
);

-- 3. Clients
create table if not exists clients (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references businesses(id) on delete cascade,
    full_name text not null,
    phone text not null,
    phone2 text,
    shop_name text,
    market text,
    note text,
    is_archived boolean not null default false,
    search_text text not null default '',
    created_at timestamptz not null default now(),
    created_by uuid references auth.users(id)
);

create index if not exists idx_clients_business_id on clients(business_id);
create index if not exists idx_clients_search_trgm on clients using gin (search_text gin_trgm_ops);

-- 4. Products
create table if not exists products (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references businesses(id) on delete cascade,
    name text not null,
    unit text not null default 'dona',
    default_price bigint not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    created_by uuid references auth.users(id)
);

create index if not exists idx_products_business on products(business_id);

-- 5. Sales
create table if not exists sales (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references businesses(id) on delete cascade,
    kind text not null check (kind in ('sale', 'opening')),
    number bigint,
    client_id uuid not null references clients(id) on delete cascade,
    sale_date date not null default (now() at time zone 'Asia/Tashkent')::date,
    subtotal bigint not null default 0,
    discount bigint not null default 0,
    total bigint not null default 0,
    currency text not null default 'UZS',
    due_date date,
    note text,
    status text not null default 'active' check (status in ('active', 'void')),
    void_reason text,
    voided_at timestamptz,
    voided_by uuid references auth.users(id),
    replaces_sale_id uuid references sales(id),
    created_at timestamptz not null default now(),
    created_by uuid references auth.users(id)
);

create index if not exists idx_sales_client on sales(client_id, sale_date);
create index if not exists idx_sales_business on sales(business_id, sale_date);

-- 6. Sale Items
create table if not exists sale_items (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references businesses(id) on delete cascade,
    sale_id uuid not null references sales(id) on delete cascade,
    product_id uuid references products(id) on delete set null,
    name text not null,
    unit text not null,
    quantity numeric(12, 3) not null check (quantity > 0),
    unit_price bigint not null check (unit_price >= 0),
    line_total bigint not null check (line_total >= 0),
    created_at timestamptz not null default now()
);

create index if not exists idx_sale_items_sale on sale_items(sale_id);

-- 7. Payments
create table if not exists payments (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references businesses(id) on delete cascade,
    client_id uuid not null references clients(id) on delete cascade,
    sale_id uuid references sales(id) on delete set null,
    payment_date date not null default (now() at time zone 'Asia/Tashkent')::date,
    amount bigint not null check (amount > 0),
    currency text not null default 'UZS',
    method text not null check (method in ('naqd', 'karta', 'otkazma', 'click', 'payme', 'boshqa')),
    note text,
    status text not null default 'active' check (status in ('active', 'void')),
    void_reason text,
    voided_at timestamptz,
    voided_by uuid references auth.users(id),
    replaces_payment_id uuid references payments(id),
    created_at timestamptz not null default now(),
    created_by uuid references auth.users(id)
);

create index if not exists idx_payments_client on payments(client_id, payment_date);
create index if not exists idx_payments_business on payments(business_id, payment_date);

-- 8. Counters
create table if not exists counters (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references businesses(id) on delete cascade,
    kind text not null,
    last_value bigint not null default 0,
    updated_at timestamptz not null default now(),
    unique(business_id, kind)
);

-- 9. Audit Log
create table if not exists audit_log (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references businesses(id) on delete cascade,
    user_id uuid references auth.users(id),
    action text not null,
    entity text not null,
    entity_id uuid not null,
    before jsonb,
    after jsonb,
    created_at timestamptz not null default now()
);

-- View: Client Balances
create or replace view client_balances as
select 
    c.id as client_id,
    c.business_id,
    c.full_name,
    c.phone,
    c.phone2,
    c.shop_name,
    c.market,
    c.is_archived,
    coalesce(s.sales_total, 0) as total_sales,
    coalesce(p.payments_total, 0) as total_payments,
    coalesce(s.sales_total, 0) - coalesce(p.payments_total, 0) as balance
from clients c
left join (
    select client_id, sum(total) as sales_total
    from sales
    where status = 'active'
    group by client_id
) s on s.client_id = c.id
left join (
    select client_id, sum(amount) as payments_total
    from payments
    where status = 'active'
    group by client_id
) p on p.client_id = c.id;

-- Sequence generator helper
create or replace function get_next_sale_number(p_business_id uuid)
returns bigint language plpgsql as $$
declare
    v_val bigint;
begin
    insert into counters (business_id, kind, last_value)
    values (p_business_id, 'sale', 1)
    on conflict (business_id, kind)
    do update set last_value = counters.last_value + 1, updated_at = now()
    returning last_value into v_val;
    return v_val;
end;
$$;
