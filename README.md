# FERO — landing + waitlist

Statický landing s Vercel serverless function, ktorá zapisuje waitlist
submissions do Supabase.

## Štruktúra

```
index.html        landing page
styles.css        štýly (žltý FERO akcent)
script.js         interakcie (kalkulačka, FAQ, formulár, exit popup)
api/waitlist.js   POST endpoint → Supabase
supabase/schema.sql  schéma + RLS politiky
vercel.json       cache + bezpečnostné hlavičky
```

## Lokálny vývoj

Statický náhľad bez backendu:

```bash
python3 -m http.server 8765
```

S backendom (formulár musí volať `/api/waitlist`):

```bash
npm i -g vercel
vercel dev
```

## Nasadenie

1. **Supabase**
   1. Vytvorte projekt na [supabase.com](https://supabase.com).
   2. SQL Editor → New query → vložte obsah `supabase/schema.sql` → Run.
   3. Settings → API → skopírujte `Project URL` a `service_role` kľúč.

2. **Vercel**
   1. Project → Settings → Environment Variables → pridajte:
      - `SUPABASE_URL`
      - `SUPABASE_SERVICE_ROLE_KEY`
   2. Deploy.

3. **Test**
   1. Otvorte deployed URL.
   2. Odošlite formulár.
   3. V Supabase → Table editor → `waitlist` → vidíte riadok.

## Bezpečnosť

- Service-role kľúč ide len cez Vercel env → nikdy do prehliadača.
- RLS je zapnuté + žiadne policies = default deny pre anon / authenticated.
- Email má unique constraint → duplicitné zápisy vrátia HTTP 409.
- Honeypot pole `website` filtruje botov.

## TODO pred publish

- [ ] V `index.html` a footer note nahradiť `(Meno)` reálnym menom
- [ ] Email `zakladatel@feroreality.sk` nasmerovať na reálnu schránku
- [ ] Aktualizovať 47/#48 čísla podľa reálneho stavu (sticky bar + thank-you)
- [ ] (Voliteľné) Pripojiť Resend / Postmark pre auto-confirmation email
