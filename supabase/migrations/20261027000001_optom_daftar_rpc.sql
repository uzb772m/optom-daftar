-- Optom Daftar — Atomic RPC Functions & RLS

-- 1. Helper to check business membership
create or replace function get_user_business_role(p_business_id uuid)
returns text language plpgsql security definer as $$
declare
    v_role text;
begin
    select role into v_role
    from memberships
    where business_id = p_business_id and user_id = auth.uid();
    return v_role;
end;
$$;

-- 2. create_sale RPC
create or replace function create_sale(
    p_id uuid,
    p_business_id uuid,
    p_client_id uuid,
    p_kind text,
    p_sale_date date,
    p_items jsonb,
    p_discount bigint default 0,
    p_paid_now bigint default 0,
    p_payment_method text default 'naqd',
    p_due_date date default null,
    p_note text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    v_existing sales%rowtype;
    v_user_role text;
    v_number bigint := null;
    v_subtotal bigint := 0;
    v_total bigint := 0;
    v_sale sales%rowtype;
    v_item jsonb;
    v_qty numeric(12,3);
    v_price bigint;
    v_line_total bigint;
    v_payment_id uuid;
begin
    -- 1. Check idempotency
    select * into v_existing from sales where id = p_id;
    if found then
        return to_jsonb(v_existing);
    end if;

    -- 2. Check auth
    v_user_role := get_user_business_role(p_business_id);
    if v_user_role is null then
        raise exception 'Ruxsat berilmagan: foydalanuvchi ushbu biznesga tegishli emas';
    end if;

    -- 3. Calculate subtotal & validate items
    for v_item in select * from jsonb_array_elements(p_items) loop
        v_qty := (v_item->>'quantity')::numeric;
        v_price := (v_item->>'unit_price')::bigint;
        v_line_total := round(v_qty * v_price);
        v_subtotal := v_subtotal + v_line_total;
    end loop;

    if p_discount > v_subtotal then
        raise exception 'Chegirma jami summadan katta bo''lishi mumkin emas';
    end if;

    v_total := v_subtotal - coalesce(p_discount, 0);

    -- 4. Numbering
    if p_kind = 'sale' then
        v_number := get_next_sale_number(p_business_id);
    end if;

    -- 5. Insert Sale
    insert into sales (
        id, business_id, kind, number, client_id, sale_date,
        subtotal, discount, total, due_date, note, status, created_by
    ) values (
        p_id, p_business_id, p_kind, v_number, p_client_id, p_sale_date,
        v_subtotal, coalesce(p_discount, 0), v_total, p_due_date, p_note, 'active', auth.uid()
    ) returning * into v_sale;

    -- 6. Insert Items
    for v_item in select * from jsonb_array_elements(p_items) loop
        v_qty := (v_item->>'quantity')::numeric;
        v_price := (v_item->>'unit_price')::bigint;
        v_line_total := round(v_qty * v_price);

        insert into sale_items (
            business_id, sale_id, product_id, name, unit, quantity, unit_price, line_total
        ) values (
            p_business_id,
            v_sale.id,
            case when (v_item->>'product_id') is not null and (v_item->>'product_id') != '' then (v_item->>'product_id')::uuid else null end,
            v_item->>'name',
            coalesce(v_item->>'unit', 'dona'),
            v_qty,
            v_price,
            v_line_total
        );
    end loop;

    -- 7. Insert linked payment if paid_now > 0
    if p_paid_now > 0 then
        v_payment_id := uuid_generate_v4();
        insert into payments (
            id, business_id, client_id, sale_id, payment_date, amount, method, note, status, created_by
        ) values (
            v_payment_id, p_business_id, p_client_id, v_sale.id, p_sale_date, p_paid_now,
            coalesce(p_payment_method, 'naqd'), 'Savdo paytida to''langan', 'active', auth.uid()
        );
    end if;

    -- 8. Audit log
    insert into audit_log (business_id, user_id, action, entity, entity_id, after)
    values (p_business_id, auth.uid(), 'create_sale', 'sales', v_sale.id, to_jsonb(v_sale));

    return to_jsonb(v_sale);
end;
$$;

-- 3. void_sale RPC
create or replace function void_sale(
    p_sale_id uuid,
    p_reason text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    v_sale sales%rowtype;
    v_user_role text;
begin
    select * into v_sale from sales where id = p_sale_id;
    if not found then
        raise exception 'Savdo topilmadi';
    end if;

    v_user_role := get_user_business_role(v_sale.business_id);
    if v_user_role != 'owner' then
        raise exception 'Faqat do''kon egasi savdoni bekor qilishi mumkin';
    end if;

    if coalesce(trim(p_reason), '') = '' then
        raise exception 'Bekor qilish sababini ko''rsatish shart';
    end if;

    -- Void sale
    update sales
    set status = 'void',
        void_reason = p_reason,
        voided_at = now(),
        voided_by = auth.uid()
    where id = p_sale_id
    returning * into v_sale;

    -- Also void linked payments
    update payments
    set status = 'void',
        void_reason = 'Savdo bekor qilinganligi sababli (' || p_reason || ')',
        voided_at = now(),
        voided_by = auth.uid()
    where sale_id = p_sale_id and status = 'active';

    insert into audit_log (business_id, user_id, action, entity, entity_id, after)
    values (v_sale.business_id, auth.uid(), 'void_sale', 'sales', v_sale.id, to_jsonb(v_sale));

    return to_jsonb(v_sale);
end;
$$;

-- 4. create_payment RPC
create or replace function create_payment(
    p_id uuid,
    p_business_id uuid,
    p_client_id uuid,
    p_amount bigint,
    p_method text,
    p_payment_date date,
    p_note text default null,
    p_sale_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    v_existing payments%rowtype;
    v_user_role text;
    v_payment payments%rowtype;
begin
    select * into v_existing from payments where id = p_id;
    if found then
        return to_jsonb(v_existing);
    end if;

    v_user_role := get_user_business_role(p_business_id);
    if v_user_role is null then
        raise exception 'Ruxsat berilmagan';
    end if;

    if p_amount <= 0 then
        raise exception 'To''lov summasi noldan katta bo''lishi kerak';
    end if;

    insert into payments (
        id, business_id, client_id, sale_id, payment_date, amount, method, note, status, created_by
    ) values (
        p_id, p_business_id, p_client_id, p_sale_id, p_payment_date, p_amount,
        p_method, p_note, 'active', auth.uid()
    ) returning * into v_payment;

    insert into audit_log (business_id, user_id, action, entity, entity_id, after)
    values (p_business_id, auth.uid(), 'create_payment', 'payments', v_payment.id, to_jsonb(v_payment));

    return to_jsonb(v_payment);
end;
$$;

-- 5. void_payment RPC
create or replace function void_payment(
    p_payment_id uuid,
    p_reason text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    v_payment payments%rowtype;
    v_user_role text;
begin
    select * into v_payment from payments where id = p_payment_id;
    if not found then
        raise exception 'To''lov topilmadi';
    end if;

    v_user_role := get_user_business_role(v_payment.business_id);
    if v_user_role != 'owner' then
        raise exception 'Faqat do''kon egasi to''lovni bekor qilishi mumkin';
    end if;

    if coalesce(trim(p_reason), '') = '' then
        raise exception 'Bekor qilish sababini ko''rsatish shart';
    end if;

    update payments
    set status = 'void',
        void_reason = p_reason,
        voided_at = now(),
        voided_by = auth.uid()
    where id = p_payment_id
    returning * into v_payment;

    insert into audit_log (business_id, user_id, action, entity, entity_id, after)
    values (v_payment.business_id, auth.uid(), 'void_payment', 'payments', v_payment.id, to_jsonb(v_payment));

    return to_jsonb(v_payment);
end;
$$;

-- Row Level Security (RLS) setup
alter table businesses enable row level security;
alter table memberships enable row level security;
alter table clients enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table payments enable row level security;
alter table counters enable row level security;
alter table audit_log enable row level security;

-- Read policies
create policy "Users see their businesses" on businesses
    for select using (id in (select business_id from memberships where user_id = auth.uid()));

create policy "Users see their memberships" on memberships
    for select using (user_id = auth.uid() or business_id in (select business_id from memberships where user_id = auth.uid()));

create policy "Users view clients of their business" on clients
    for select using (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy "Users insert clients for their business" on clients
    for insert with check (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy "Users update clients for their business" on clients
    for update using (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy "Users view products" on products
    for select using (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy "Users manage products" on products
    for all using (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy "Users view sales" on sales
    for select using (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy "Users view sale items" on sale_items
    for select using (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy "Users view payments" on payments
    for select using (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy "Users view audit logs" on audit_log
    for select using (business_id in (select business_id from memberships where user_id = auth.uid()));

-- Restrict direct mutations on money tables from client:
-- sales, sale_items, payments can only be modified through SECURITY DEFINER RPCs!
