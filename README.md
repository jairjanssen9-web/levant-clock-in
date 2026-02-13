<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1M0G4NOesI8vnmawqEDQK_tRxAxOCrXa-

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and fill in:
   - **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY** (required for database and admin auth). See [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) for schema and SQL.
   - **GEMINI_API_KEY** alleen als je een eigen backend gebruikt die Gemini aanroept; nooit in de frontend.
3. Run the app:
   `npm run dev`

## Beveiliging (online zetten)

- **.env.local** staat in `.gitignore` – commit dit bestand nooit, dan komen je echte keys niet op GitHub.
- **Supabase**: De anon key zit in de frontend (nodig om te verbinden). Beveilig je data met [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security) in Supabase; dan kunnen alleen geautoriseerde gebruikers bij de data.
- **Gemini**: Er wordt geen Gemini-key meer in de app gebuild. Gebruik je Gemini, roep die dan alleen aan via een eigen backend/server waar de key veilig staat.
