# Supabase-setup voor Levant Clock-in

Deze app gebruikt Supabase voor:

1. **Urenlijsten (time_logs)** – in- en uitklokken per medewerker, met bewerkingsgeschiedenis
2. **Admin-authenticatie** – Supabase Auth (e-mail/wachtwoord) voor eerste aanmelding en pincode-reset
3. **Eerste aanmelding** – éénmalige setup wordt onthouden; daarna logt de admin in met de aangemaakte pincode op de admin-pagina’s

---

## 1. Environment variables

Maak in de projectroot een `.env.local` aan (of vul bestaande aan) met:

```env
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key
```

- **VITE_SUPABASE_URL**: Supabase project URL (Settings → API in het dashboard).
- **VITE_SUPABASE_ANON_KEY**: anon/public key (Settings → API).

Deze variabelen worden in `lib/supabase.ts` gebruikt. Zonder deze waarden toont de app een waarschuwing in de console.

**Online zetten:** De anon key komt in de frontend (dat is normaal). Beveiliging zit in Row Level Security (RLS) op je tabellen; zet RLS aan en pas policies aan als je toegang wilt beperken.

---

## 2. Database-schema

Voer in de **Supabase SQL Editor** het onderstaande uit. Bij een **bestaande installatie** die al `settings` heeft: voer alleen het migratieblok voor `admin_user_id` uit (zie sectie 2.2).

### 2.1 Nieuwe installatie (alles in één keer)

```sql
-- ============================================
-- 1. Settings (pincode + koppeling admin)
-- Eerste aanmelding vult deze tabel; app controleert of er een rij is.
-- ============================================
create table if not exists settings (
  id bigint primary key generated always as identity,
  pin_code text not null,
  admin_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- ============================================
-- 2. Medewerkers
-- ============================================
create table if not exists employees (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text not null,
  is_active boolean default true,
  photo_url text,
  created_at timestamptz default now()
);

-- ============================================
-- 3. Urenlijsten (tijdregistraties)
-- ============================================
create table if not exists time_logs (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees(id) on delete cascade,
  date text not null,
  clock_in timestamptz not null,
  clock_out timestamptz,
  status text default 'active',
  edits jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- ============================================
-- 4. Row Level Security (RLS)
-- Eerste inlog: app gebruikt anon key tot na signUp; INSERT op settings moet dus voor anon kunnen.
-- ============================================
alter table settings enable row level security;
-- Verwijder oude policy als die bestaat (voorkom conflict)
drop policy if exists "Allow all for settings" on settings;
drop policy if exists "Public access settings" on settings;
-- Eén policy voor alle acties (SELECT + INSERT + UPDATE) voor iedereen, inclusief anon
create policy "settings_allow_all" on settings for all using (true) with check (true);

alter table employees enable row level security;
drop policy if exists "Allow all for employees" on employees;
drop policy if exists "Public access employees" on employees;
create policy "employees_allow_all" on employees for all using (true) with check (true);

alter table time_logs enable row level security;
drop policy if exists "Allow all for time_logs" on time_logs;
drop policy if exists "Public access logs" on time_logs;
create policy "time_logs_allow_all" on time_logs for all using (true) with check (true);
```

### 2.2 Fout "new row violates row-level security policy" bij eerste inlog

Als je bij de **eerste aanmelding** de melding krijgt dat een nieuwe rij de RLS-policy van `settings` schendt: de tabel staat RLS aan maar de policy staat INSERT voor de anon-gebruiker niet toe. Voer in de **Supabase SQL Editor** dit uit (maakt bestaande policies goed):

```sql
-- RLS voor settings: anon mag ook INSERT (nodig voor eerste setup)
drop policy if exists "Allow all for settings" on settings;
drop policy if exists "Public access settings" on settings;
drop policy if exists "settings_allow_all" on settings;
create policy "settings_allow_all" on settings for all using (true) with check (true);
```

Daarna opnieuw proberen: vul het eerste-aanmeldformulier opnieuw in; de gegevens worden dan in Supabase opgeslagen en de volgende keer gebruikt.

### 2.3 Medewerkers worden niet onthouden / komen niet op inklokscherm

Als toegevoegde medewerkers niet bewaard blijven of niet op het inklokscherm verschijnen, blokkeert RLS waarschijnlijk **INSERT** of **SELECT** op de tabel `employees`. Voer in de **Supabase SQL Editor** dit uit:

```sql
-- RLS voor employees: anon mag INSERT en SELECT (nodig voor toevoegen + laden)
drop policy if exists "Allow all for employees" on employees;
drop policy if exists "Public access employees" on employees;
drop policy if exists "employees_allow_all" on employees;
create policy "employees_allow_all" on employees for all using (true) with check (true);
```

Daarna de app verversen (F5) of opnieuw openen; medewerkers worden dan uit Supabase geladen en staan op het inklokscherm. Nieuwe medewerkers die je in Beheer toevoegt, worden opgeslagen en blijven zichtbaar.

### 2.4 Bestaande installatie: kolom admin_user_id

Als je al een `settings`-tabel hebt zonder `admin_user_id`, voer alleen dit uit:

```sql
alter table settings add column if not exists admin_user_id uuid references auth.users(id) on delete set null;
```

---

## 3. Authenticatie (Supabase Auth)

- **Eerste aanmelding**: in `AdminSetup` wordt een Supabase-gebruiker aangemaakt (`signUp`) en een rij in `settings` (pincode + optioneel `admin_user_id`). Daarmee is de setup “onthouden”.
- **Dagelijks gebruik**: op de admin-pagina logt de admin in met de **pincode** (uit `settings`). Geen e-mail/wachtwoord nodig voor de dagelijkse toegang.
- **Pincode wijzigen**: in Admin → Instellingen wordt met **e-mail + wachtwoord** (Supabase Auth) geverifieerd; daarna kan de pincode in `settings` worden aangepast.

In het Supabase-dashboard (Authentication → Providers): zorg dat **Email** is ingeschakeld. Voor lokaal testen kun je onder Authentication → Settings eventueel “Confirm email” uitzetten.

---

## 4. Overzicht tabellen

| Tabel        | Doel |
|-------------|------|
| **settings** | Eén rij (of meer): `pin_code` voor admin-login, optioneel `admin_user_id` gekoppeld aan de eerste admin. |
| **employees** | Medewerkers (naam, rol, actief). |
| **time_logs** | Urenlijsten: per dag in-/uitkloktijden, status, `edits` voor audit. |

De app leest bij opstarten `settings`. Als er geen rij is, wordt het **eerste-aanmelding**scherm getoond; na succesvolle setup wordt dat niet meer getoond en kan de admin met de pincode op de admin-pagina’s werken.

---

## 5. Referentie in code

- **Supabase-client**: `lib/supabase.ts` (gebruikt `VITE_SUPABASE_*`).
- **Eerste aanmelding**: `components/AdminSetup.tsx` (Auth signUp + insert in `settings`).
- **Pincode wijzigen**: `components/Admin.tsx` (Auth signIn + update `settings`).
- **Data laden / uren bijhouden**: `App.tsx` (fetch `settings`, `employees`, `time_logs`; clock in/out en bewerken).

Voor meer detail over de SQL of RLS: dit document is de bron; de inline SQL in `lib/supabase.ts` is verwijderd en verwijst hiernaar.
