# Xisob Kitob — Ulgurji Nasiya Daftari

O'zbekistondagi ulgurji ("optom") savdogarlar uchun maxsus ishlab chiqilgan qarz va nasiya daftari tizimi. Qog'oz nasiya daftarining o'rnini to'liq bosadi: haridorlarga tovarlar nasiyaga beriladi, ular qismlab to'lab boradi, tizim esa kimdan qancha qarz borligini, qaysi tovarlar uchun va qachondan beri ekanligini avtomatik hisoblaydi.

---

## 🌟 Asosiy imkoniyatlar (1-bosqich)

1. **30 soniyalik tezkor savdo**: Bozorning qizg'in vaqtida telefonda yangi savdoni "Tovarlar bilan" yoki "Tez yozish" ("Nima oldi?" + Summa) rejimida soniyalar ichida yozish.
2. **Qarz va avansning aniq hisob-kitobi**: 
   - Har bir mijoz balansi avtomatik butun so'mda hisoblanadi (kasrli xatoliklar yo'q).
   - Qarz bo'lsa qizil rangda, ortiqcha to'lov (avans) bo'lsa yashil rangda ko'rinadi.
3. **To'lovlarni avtomat taqsimlash (FIFO)**:
   - Savdoga bog'langan to'lov avval o'sha savdoga tegadi.
   - Boshqa to'lovlar eng eski savdolarni navbat bilan yopib boradi.
4. **Xronologik qoldiq tarixi (Running Balance)**:
   - Mijozning har bir savdo va to'lovi sanasi va o'zgaruvchan qoldig'i bilan ko'rinadi.
   - Bekor qilingan operatsiyalar sababi bilan ustidan chizilgan holda saqlanadi.
5. **Muddati o'tgan qarzlar nazorati**:
   - To'lov muddati (+7, +15, +30 kun) o'tib ketgan savdolar alohida ogohlantiriladi.
6. **Aqlli qidiruv**:
   - Lotin ("G'ulom", "Akmal"), Kirill ("Ғулом", "Акмал") yoki telefonning oxirgi 4 raqami ("4567") orqali birdek tezkor topadi.
7. **PWA (Mobil ilova)**:
   - Android, iPhone va Windows qurilmalariga xuddi dasturdek o'rnatiladi.
   - Internet uzilib qolganda ma'lumotlar saqlanadi.

---

## 🚀 Texnologiyalar

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Til va qulaylik**: i18next (O'zbekcha / Русский)
- **Holat boshqaruvi**: React Context, TanStack Query
- **Oflayn & PWA**: Vite PWA (Service Worker, Web Manifest)
- **Ma'lumotlar bazasi**: Supabase PostgreSQL (RLS, Atomik RPC funksiyalar)
- **Testlar**: Vitest (Spetsifikatsiyadagi 1-16 qoidalar 100% testlangan)

---

## 💻 Mahalliy ishga tushirish (Local Setup)

1. Repozitoriyani klonlash:
   ```bash
   git clone https://github.com/uzb772m/optom-daftar.git
   cd optom-daftar
   ```

2. Bog'liqliklarni o'rnatish:
   ```bash
   npm install
   ```

3. Dasturiy testlarni tekshirish:
   ```bash
   npm run test
   ```

4. Dasturni ishga tushirish:
   ```bash
   npm run dev
   ```
   Brauzerda `http://localhost:5173` manzilini oching.

---

## 🗄️ Supabase Ma'lumotlar bazasini ulash

Loyiha SQL migratsiyalari `supabase/migrations/` papkasida tayyor holda turibdi:

1. [supabase.com](https://supabase.com) saytiga kiring va bepul loyiha (New Project) yarating.
2. Chap menyudan **SQL Editor** bo'limiga o'ting.
3. Quyidagi fayllar tarkibini navbat bilan nusxalab, SQL Editor'da **RUN** tugmasini bosing:
   - `supabase/migrations/20261027000000_optom_daftar_init.sql` (Jadvallar, indekslar, triggerlar va view)
   - `supabase/migrations/20261027000001_optom_daftar_rpc.sql` (Atomik funksiyalar va RLS qoidalari)
4. **Project Settings -> API** bo'limidan `Project URL` va `anon public key` qiymatlarini oling va `.env` faylga yozing:
   ```env
   VITE_SUPABASE_URL=https://sizning-proyekt.supabase.co
   VITE_SUPABASE_ANON_KEY=sizning-anon-kalit
   ```

---

## 📱 Telefonga o'rnatish (PWA ko'rsatmasi)

### Android (Chrome):
1. Brauzerda dastur manzilini oching.
2. Yuqori o'ng burchakdagi 3 nuqta (menyu) tugmasini bosing.
3. **"Ilovani o'rnatish"** (yoki **"Bosh ekranga qo'shish"**) ni tanlang.
4. Telefoningiz ekranida Optom Daftar ikonasi paydo bo'ladi.

### iPhone (Safari):
1. Safari brauzerida dastur manzilini oching.
2. Pastki paneldagi **"Ulashish"** (Share - kvadratdan yuqoriga strelka) tugmasini bosing.
3. Ro'yxatdan **"Bosh ekranga qo'shish"** (Add to Home Screen) tugmasini tanlang.
4. **"Qo'shish"** tugmasini bosing.

---

## 🧪 Demo hisob ma'lumotlari

Dasturda spetsifikatsiyadagi barcha qabul testlari uchun namunaviy mijozlar va operatsiyalar oldindan kiritilgan:
- **Akmal Karimov**: Chorsu bozori, turli tovarlar savdosi, qisman to'lovlar, bekor qilingan to'lov va avans holati.
- **Bobur Aliyev**: Qog'oz daftardan o'tgan eski qarzi (1 500 000 so'm) va ortiqcha to'lov taqsimoti.
- Sozlamalar bo'limidagi **"Demo ma'lumotlarni qayta tiklash"** tugmasi orqali istalgan vaqtda boshlang'ich holatga qaytishingiz mumkin.
