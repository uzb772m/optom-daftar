# Optom Daftar — wholesale credit ("nasiya") app

You are a senior full-stack engineer and product designer. Build **"Optom Daftar"**, a production-quality web app for a wholesale ("optom") trader in Uzbekistan. It replaces the paper "nasiya daftar" (credit notebook): the trader gives goods to shop owners on credit, they pay back in parts, and the trader must always know who owes how much, for which goods, and since when.

## 1. Core flow (why this app exists)

1. Add a client: name and phone number (optional: shop name, market location, note).
2. Record a sale: the goods the client took (product, quantity, unit, price → line total), the total, how much the client paid right now, and what remains — calculated automatically.
3. Later, record payments of any amount, any number of times; the debt goes down automatically.
4. At any moment see each client's current debt, their full history with a running balance, and the total that all clients owe.

Everything else serves this flow. It MUST be fast at a busy bazaar stall: a typical sale is recorded on a phone in under 30 seconds.

## 2. How to work with me

- I am the business owner, not a programmer. Write to me only in simple Uzbek (Latin script).
- Never ask me technical questions. Decide sensibly, then list your assumptions in a few lines. Ask me only for what only I can do (create a free Supabase or Vercel account, paste a key) — with exact click-by-click steps.
- Before coding, give me a 5–10 line plan in Uzbek, then start right away.
- Build in the phases of section 9. Finish a phase, run it, verify it against section 10 and fix failures before starting the next one. After each phase tell me in Uzbek what was built, how to open it and what to try.
- No TODOs, placeholder screens, dead buttons or fake data in the real app.
- If you can run commands (Claude Code, Cursor, Replit), run the app, tests and build yourself and fix errors before reporting. On Windows, first check that Node.js LTS is installed; if it isn't, tell me how to install it.

## 3. Tech stack (fixed — do not substitute)

- React + TypeScript + Vite, Tailwind CSS + shadcn/ui, TanStack Query, React Hook Form + Zod, React Router, i18next.
- Supabase: Postgres, Auth (email + password), Row Level Security on every table, Postgres functions (RPC) for every write that touches money.
- PWA: manifest, icons, a service worker that caches the app shell; installable on Android, iPhone and Windows.
- Hosting: Vercel (free tier). Tests: Vitest.
- If your environment has a built-in Supabase integration (e.g. Lovable), use it. Otherwise keep all database setup in SQL files under supabase/migrations/ and either apply them yourself (Supabase CLI) or tell me exactly how to run them in Supabase → SQL Editor.
- Only the Supabase URL and anon key go into the frontend (.env, plus a committed .env.example). Never expose the service_role key.

## 4. Language and formats

- Every UI text in Uzbek (Latin) by default; Russian as the second language, switchable in Settings. All strings live in translation files from day one.
- UI strings in this brief use the plain apostrophe (o', g'); use that form consistently.
- Money is UZS, shown as "5 600 000 so'm" (space as thousands separator, no decimals). Amount inputs add the spaces while typing and open the numeric keypad.
- Dates DD.MM.YYYY, time HH:mm. "Today", "this month" and overdue checks use Asia/Tashkent time, in SQL and in the frontend.
- Phone input mask "+998 XX XXX XX XX", stored as E.164 (+998901234567), exactly 9 digits after +998.
- Search: one box that matches any part of the name, shop name or market, or digits of the phone (e.g. the last 4). Normalize both the query and the stored text: lowercase, remove every apostrophe variant (', ʻ, ʼ, ‘, ’, `), transliterate Uzbek/Russian Cyrillic to Latin. So "gulom", "G'ulom" and "Ғулом" all find "G'ulom", and "Акмал" finds "Akmal". Store the normalized text in an indexed column (pg_trgm) so search stays fast with 10 000 clients.

## 5. Data model (Postgres)

Every table has id (uuid), created_at, created_by and — except businesses — business_id. Money columns are bigint in the currency's smallest unit (UZS: whole so'm); never floating point. Every money table has a currency column (default 'UZS'); Phase 1 never shows it in the UI.

| Table | Columns (besides the common ones) |
|---|---|
| businesses | name, phone, address |
| memberships | user_id, role ('owner' / 'seller'); unique (business_id, user_id) |
| clients | full_name (required), phone (required), phone2, shop_name, market, note, is_archived, search_text (normalized, trigram index) |
| products | name, unit, default_price, is_active |
| sales | kind ('sale' / 'opening'), number (sequence per business; null for 'opening'), client_id, sale_date (date), subtotal, discount (default 0), total, due_date (nullable), note, status ('active' / 'void'), void_reason, voided_at, voided_by, replaces_sale_id (nullable) |
| sale_items | sale_id, product_id (nullable), name and unit (copied at sale time), quantity numeric(12,3) > 0, unit_price ≥ 0, line_total |
| payments | client_id, sale_id (nullable; set only for a payment taken together with a sale), payment_date (date), amount > 0, method ('naqd', 'karta', 'otkazma', 'click', 'payme', 'boshqa'), note, status, void_reason, voided_at, voided_by, replaces_payment_id (nullable) |
| counters | kind, last_value (gap-free numbering) |
| audit_log | user_id, action, entity, entity_id, before (jsonb), after (jsonb) |

Units: "dona", "kg", "tonna", "qop", "quti", "pachka", "blok", "litr", "metr".
Payment method labels: "Naqd", "Karta", "O'tkazma", "Click", "Payme", "Boshqa".

## 6. Money rules (the single source of truth — implement exactly)

1. **Totals.** line_total = round(quantity × unit_price) to whole so'm, half up (2.75 × 12 345 = 33 948.75 → 33 949). subtotal = sum of line totals; total = subtotal − discount; discount ≤ subtotal. The server computes every total; the frontend preview uses the same rule with BigInt or a decimal library, never float multiplication.
2. **Balance** (per client, per currency) = sum of active sales' totals (both kinds) − sum of active payments. Voided rows never count. Balance > 0 → "Qarzi" (red). Balance < 0 → "Avans" (green; the client has prepaid). Balance = 0 → "Qarzi yo'q". Balances come only from an SQL view — never typed in or stored by hand.
3. **Allocation** (only for per-sale status; it never changes the balance; recomputed from scratch on every read):
   a. A payment linked to a sale goes to that sale first, up to its total.
   b. All other payments, plus any part of a linked payment above its sale's total, form one pool that fills active sales oldest first (sale_date, then created_at).
   c. Per sale: remaining = total − allocated. Status "To'lanmagan" (nothing allocated), "Qisman to'langan" (partly), "To'langan" (fully).
4. **Overdue** ("Muddati o'tgan"): an active sale with due_date before today (Tashkent) and remaining > 0; days overdue = today − due_date.
5. **Paid now.** "Hozir to'ladi" at sale time is optional and may exceed the sale total; the excess pays older sales by rule 3 or becomes an advance. The form says so when it happens.
6. **No hard deletes.** "Bekor qilish" (void) is owner-only, requires a reason, and keeps the record in history (struck through, with the reason). Voiding a sale also voids the payment taken with it; the confirmation dialog shows both amounts.
7. **Corrections.** Money fields (client, date, items, quantities, prices, discount, amount, method) are never edited in place. "Tuzatish" (correct) opens the form prefilled from the old record; saving voids the old record (reason "Tuzatildi") and creates the new one in the same transaction, linked by replaces_sale_id / replaces_payment_id. When a sale is corrected, its linked payment is voided with it and re-created from the form. Note and due date may be edited directly. Every change of any kind goes to audit_log (written by the RPCs or by triggers).
8. **Atomic, idempotent writes.** Every money write is an RPC that runs in one transaction, recomputes totals on the server, checks the caller's membership and role, writes audit_log, and takes a client-generated id: calling it again with the same id returns the existing record instead of creating a duplicate (safe retry after a network error).
9. **Numbering.** Sale numbers are sequential per business with no gaps, assigned inside the create transaction by locking the counters row. Voided sales keep their numbers; numbers are never reused; simultaneous sales never get the same number.
10. **Security.** RLS on every table: users see only rows of businesses they belong to. Direct INSERT/UPDATE/DELETE on sales, sale_items, payments, counters and audit_log is revoked from app users; writes happen only through the RPCs (SECURITY DEFINER with a fixed search_path and explicit membership checks).
11. **Clients and products.** A client with any records is archived ("Arxivlash"), never deleted. Editing a product never changes past sales.
12. **Opening debt.** When adding a client, an optional "Eski qarzi (daftardan)" amount and date creates a sale of kind 'opening' with one item "Eski qarz (daftardan)". It counts in balances and allocation but never in sales totals, "Bugungi savdo" or reports.
13. **History order.** The running balance is computed chronologically: by date, then created_at, with a sale placed before the payment taken with it.

## 7. Phase 1 screens

Navigation: bottom bar on phones, sidebar on desktop — "Bosh sahifa", "Mijozlar", a large centre "+ Savdo", "Tarix", "Sozlamalar". Every list has an empty state with a next action, loading skeletons, and Uzbek error messages with "Qayta urinish". Offline: banner "Internet yo'q", save buttons disabled, entered data kept; the sale form also survives a page reload as a local draft.

1. **"Kirish" / "Ro'yxatdan o'tish"** (log in / sign up). First run asks only the business name and phone, then creates the business and the owner membership.
2. **"Bosh sahifa"** (home): large "Jami qarzdorlik" (sum of positive balances) with "Qarzdor mijozlar: N ta"; cards "Bugungi savdo" (sum and count, kind 'sale' only), "Bugun tushgan pul", "Muddati o'tgan" (sum and count); "Eng katta qarzdorlar" (top 10); "Oxirgi amallar" (last 10 operations); buttons "+ Yangi savdo" and "+ To'lov qabul qilish".
3. **"Mijozlar"** (clients): search on top; filter chips "Hammasi", "Qarzdorlar", "Muddati o'tgan", "Avans", "Arxiv"; sort by debt (default), name or last activity; each row shows name, shop/market, phone and the coloured balance; "+ Mijoz qo'shish"; server-side search and pagination.
4. **Client form**: "Ism / F.I.Sh." (required), "Telefon" (required), "Qo'shimcha telefon", "Do'kon nomi", "Bozor / manzil", "Izoh"; on create only, "Eski qarzi (daftardan)" with amount and date. A phone that already exists shows a warning with a link to that client.
5. **Client page**: name, shop, market; buttons "Qo'ng'iroq" (tel:), "Telegram" (t.me/+998…), "SMS", "WhatsApp" (wa.me); the balance in large type; "+ Savdo" and "+ To'lov"; tabs "Tarix" (every operation, newest first: date, type, number, ± amount, running balance; voided rows struck through with the reason), "Savdolar" (status badge and remaining per sale), "To'lovlar". Tapping a sale or payment opens its detail (for a sale: items, subtotal, discount, total, paid, remaining, status, linked payments) with the owner-only actions "Tuzatish" and "Bekor qilish".
6. **"Yangi savdo"** (new sale) — the most important screen:
   - Client picker with search, recent clients first; "+ Yangi mijoz" adds one without leaving the form. Prefilled when opened from a client page.
   - Mode switch "Tovarlar bilan" (with items) / "Tez yozish" (quick: "Nima oldi?" text + "Summa", saved as one item with quantity 1).
   - Item row: product type-ahead from the catalog (free text allowed, with a "Katalogga qo'shish" checkbox), quantity (decimals allowed), unit, price (prefilled from the catalog), line total. "+ Qator qo'shish"; ✕ removes a row.
   - Live "Jami", optional "Chegirma", "To'lanadigan summa".
   - "Hozir to'ladi" with chips "To'liq" and "0", plus the payment method.
   - Live "Qoldi (qarzga): X so'm" and "Mijozning umumiy qarzi: Y so'm".
   - Optional "To'lov muddati" (chips "+7 kun", "+15 kun", "+30 kun"), "Izoh", and the sale date (default today; past allowed, future not).
   - "Saqlash" (disabled while saving) → success view with the number and summary, buttons "Yana savdo" and "Mijoz sahifasi".
7. **"To'lov qabul qilish"** (receive payment): client picker or prefilled; current debt in large type; "Summa" with chip "Hammasi" (the whole debt); method; date (default today); "Izoh"; live "To'lovdan keyin qarz: X" or "Avans: X"; save → success view.
8. **"Tarix"** (history): tabs "Savdolar" / "To'lovlar"; filters by period ("Bugun", "Kecha", "Shu hafta", "Shu oy", custom), client, method, sale status and "Bekor qilinganlarni ko'rsatish"; totals of the filtered range on top.
9. **"Sozlamalar"** (settings): business name, phone, address; language "O'zbekcha" / "Русский"; theme (light, dark, system); "Tovarlar" (catalog: name, unit, default price, active); "Chiqish".

Design: calm and trustworthy like a banking app; large tabular numerals for money; touch targets at least 44 px; usable one-handed on a 360 px phone without horizontal scroll; on desktop the client list and client page sit side by side.

Demo data: a seed script that creates a separate demo account with Uzbek clients, sales and payments (login written in the README) — never mixed into the owner's real business.

## 8. Later phases (do not build in Phase 1)

**Phase 2 — documents, reminders, reports**
- "Nakladnoy" for each sale and a receipt for each payment, as PNG and PDF: business header, number, date, client, items, total, discount, paid now, remaining, previous debt and total debt. Share via the Web Share API (Telegram etc.) or download; print layouts for A4 and 80 mm receipt printers.
- "Akt sverka" for a client and a date range: opening balance, every operation with running balance, closing balance; share as PDF/PNG.
- "Eslatma yuborish" (reminder): a polite prefilled message, template editable in Settings, sent via Telegram, SMS or WhatsApp, or copied. Default: "Assalomu alaykum, {ism}! Qarzingiz {summa} so'm. Iltimos, {muddat} gacha to'lab bering. Rahmat! {biznes}".
- "Hisobotlar" (reports) for any period: sales, collected payments, change in total debt, by payment method, by client, top products; debt aging 0–30 / 31–60 / 61–90 / 90+ days by oldest unpaid sale.
- Excel (.xlsx) export of clients with balances, sales with items, and payments; full JSON backup and restore.
- "Qaytarish" (returns): goods a client brings back, optionally linked to a sale, numbered and voidable. From then on balance = sales − payments − returns, and a linked return is allocated to its sale first, like a linked payment.
- Optional credit limit per client with a warning (not a block) on new sales; default payment term in Settings.

**Phase 3 — team, USD, automation**
- Invite sellers by email. Seller: creates clients, sales and payments and sees balances; cannot void, correct, export or open reports. Owner: everything.
- USD as a setting: choose the currency on sales and payments; separate balances per currency everywhere; no automatic conversion.
- Automatic SMS reminders for overdue debts through an Uzbek SMS gateway (e.g. Eskiz.uz) from a scheduled Supabase Edge Function.
- Offline mode: queue operations offline and sync later without duplicates (reuse the idempotent ids).
- PIN lock on the device.

## 9. Phases and definition of done

Phase 1 = sections 1–7; Phases 2 and 3 = section 8. A phase is done when its acceptance tests pass (automated wherever possible), the production build has no errors (including TypeScript), the browser console is clean, it works on a 360 px phone and on desktop, it is deployed, and README.md — written in Uzbek — explains what the app does, how to run it locally, how to set up Supabase and deploy to Vercel step by step, how to install the app on Android and iPhone, and how the data is backed up.

## 10. Phase 1 acceptance tests

Automate them (Vitest for pure functions, a test script against a test database for the RPCs and views) and also check them by hand in the UI. "Today" is 10.11.2026 unless a step says otherwise. Steps 1–11 run in order on one client.

1. Create "Akmal Karimov", +998 90 123 45 67, shop "Akmal savdo", market "Chorsu, 3-qator" → "Qarzi yo'q".
2. Sale №1 dated 01.11.2026: "Un 1-nav" 10 qop × 320 000 = 3 200 000; "Shakar" 5 qop × 450 000 = 2 250 000; "Kungaboqar yog'i" 12.5 litr × 18 900 = 236 250. Subtotal 5 686 250, discount 86 250, total 5 600 000; paid now 2 000 000 "Naqd" → remaining 3 600 000, "Qisman to'langan", balance 3 600 000.
3. Payment 05.11.2026: 1 000 000 "Karta" → balance 2 600 000; sale №1 remaining 2 600 000.
4. Sale №2 dated 07.11.2026, "Tez yozish": "Guruch, 20 qop", 4 000 000, paid now 0, due 14.11.2026 → balance 6 600 000; sale №2 "To'lanmagan".
5. Payment 09.11.2026: 3 000 000 "Naqd" → balance 3 600 000; sale №1 "To'langan"; sale №2 remaining 3 600 000, "Qisman to'langan".
6. Void the 05.11 payment with reason "Xato kiritildi" → balance 4 600 000; sale №1 remaining 600 000, "Qisman to'langan"; sale №2 remaining 4 000 000, "To'lanmagan"; the voided payment stays in history, struck through.
7. Payment 10.11.2026: 5 000 000 "Naqd" → balance −400 000, shown as "Avans: 400 000 so'm"; sales №1 and №2 "To'langan".
8. Sale №3 dated 10.11.2026: "Shakar" 2 qop × 450 000 = 900 000, paid now 0, due 12.11.2026 → balance 500 000; sale №3 remaining 500 000, "Qisman to'langan".
9. History running balance, oldest first: 5 600 000 → 3 600 000 → 3 600 000 (voided row, no change) → 7 600 000 → 4 600 000 → −400 000 → 500 000. Cross-check: active sales 10 500 000 − active payments 10 000 000 = 500 000.
10. Home (only this client exists): "Jami qarzdorlik" 500 000; "Bugungi savdo" 900 000 (1 ta); "Bugun tushgan pul" 5 000 000; "Muddati o'tgan" 0. With today = 13.11.2026: "Muddati o'tgan" 500 000 (1 ta), sale №3 one day overdue.
11. "Tuzatish" on sale №3, quantity 2 → 3 qop: old №3 becomes voided ("Tuzatildi"); new sale №4 = 1 350 000, dated 10.11.2026, due 12.11.2026; balance 950 000; sale №4 remaining 950 000, "Qisman to'langan"; "Bugungi savdo" 1 350 000 (1 ta).
12. Opening debt: create "Bobur Aliyev", +998 93 765 43 21, "Eski qarzi (daftardan)" 1 500 000 dated 10.11.2026 → balance 1 500 000; history shows "Eski qarz (daftardan)" without a number; "Bugungi savdo" still 1 350 000 (1 ta).
13. Bobur, sale dated 10.11.2026, "Tez yozish" "Un, 3 qop" 1 000 000, paid now 2 000 000 "Naqd" → the form warns that 1 000 000 goes to older debt; the sale gets №5 and is "To'langan"; the opening entry remains 500 000, "Qisman to'langan"; Bobur's balance 500 000.
14. Rounding: 2.75 kg × 12 345 = 33 948.75 → line total 33 949.
15. Retry safety: calling the create-sale RPC twice with the same id creates one sale. Concurrency: two sales saved at the same moment get two different consecutive numbers.
16. Search: "akmal", "AKMAL", "Акмал" and "4567" each find Akmal Karimov.
17. Security: a user of another business cannot read or change Akmal's records; a direct insert into payments from the app is rejected.
18. Formats and layout: amounts appear as "5 600 000 so'm"; no horizontal scroll at 360 px; switching to "Русский" translates every screen.
