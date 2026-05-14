/**
 * POST /api/waitlist
 * Zapíše submission z waitlist formulára do Supabase tabuľky `waitlist`.
 *
 * Env vars (nastaviť v Vercel Project Settings):
 *   - SUPABASE_URL                 → https://xxxx.supabase.co
 *   - SUPABASE_SERVICE_ROLE_KEY    → service-role kľúč (Project Settings → API)
 */

module.exports = async function handler(req, res) {
  // ─── CORS for same-origin (defenzívne) ───
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ─── Validate env ───
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var');
    res.status(500).json({ error: 'Server is not configured.' });
    return;
  }

  // ─── Parse body (Vercel auto-parses application/json) ───
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  // ─── Validate required fields ───
  const required = ['name', 'email', 'company', 'size', 'currentSystem', 'pain'];
  for (const f of required) {
    const v = body[f];
    if (typeof v !== 'string' || v.trim().length === 0) {
      res.status(400).json({ error: `Missing or empty field: ${f}` });
      return;
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    res.status(400).json({ error: 'Invalid email.' });
    return;
  }
  // honeypot — anti-bot
  if (body.website) {
    res.status(200).json({ ok: true, position: 0 });
    return;
  }

  const row = {
    name:            String(body.name).trim().slice(0, 200),
    email:           String(body.email).trim().toLowerCase().slice(0, 200),
    phone:           body.phone ? String(body.phone).trim().slice(0, 50) : null,
    company:         String(body.company).trim().slice(0, 200),
    team_size:       String(body.size).trim().slice(0, 20),
    current_system:  String(body.currentSystem).trim().slice(0, 100),
    pain:            String(body.pain).trim().slice(0, 2000),
    source:          body.source ? String(body.source).trim().slice(0, 100) : null,
    wants_interview: !!body.interview,
    user_agent:      String(req.headers['user-agent'] || '').slice(0, 500),
    ip:              String(req.headers['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 64) || null,
  };

  // ─── Insert into Supabase via PostgREST ───
  let insertResp;
  try {
    insertResp = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(row),
    });
  } catch (e) {
    console.error('Supabase request failed:', e);
    res.status(502).json({ error: 'Database unreachable.' });
    return;
  }

  if (!insertResp.ok) {
    const detail = await insertResp.text();
    console.error('Supabase insert failed', insertResp.status, detail);
    if (insertResp.status === 409) {
      res.status(409).json({ error: 'Tento email je už v zozname.' });
      return;
    }
    res.status(500).json({ error: 'Insert failed.' });
    return;
  }

  // ─── Count total (HEAD with Prefer: count=exact) ───
  let position = 0;
  try {
    const headResp = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=id`, {
      method: 'HEAD',
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer':        'count=exact',
        'Range-Unit':    'items',
        'Range':         '0-0',
      },
    });
    const range = headResp.headers.get('content-range');
    if (range) position = Number(range.split('/')[1]) || 0;
  } catch (_) { /* count is best-effort */ }

  res.status(200).json({ ok: true, position });
};
