import HTML from './build/index.html';
import CSS from './build/style.css';
import CLIENT_JS from './build/client.js.txt';
import VERIFY_HTML from './build/verifica.html';
import VERIFY_JS from './build/verifica.js.txt';
import OFFLINE_HTML from './build/offline.html';
import SECURITY_TXT from './build/security.txt';
import NOTE_HTML from './build/note-legali.html';

const MAX_ATTEMPTS = 5;
const TTLS = new Set([3600, 86400, 604800]);
const MAX_BODY = 120000;
const MAX_CT = 110000;
const ID_RE = /^[A-Za-z0-9_-]{22}$/;
const B64U_RE = /^[A-Za-z0-9_-]+$/;

const SECURITY = {
  'content-security-policy':
    "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'strict-transport-security': 'max-age=63072000; includeSubDomains',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
};

function respond(body, status, type, extra = {}) {
  return new Response(body, { status, headers: { 'content-type': type, ...SECURITY, ...extra } });
}
const json = (obj, status = 200) =>
  respond(JSON.stringify(obj), status, 'application/json; charset=utf-8', { 'cache-control': 'no-store' });

function b64u(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sha256(str) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function readJson(req) {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > MAX_BODY) return null;
  const text = await req.text();
  if (text.length > MAX_BODY) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function sameOrigin(req, url) {
  const o = req.headers.get('origin');
  // 'null' = versione offline aperta dal computer dell'utente (file://)
  return !o || o === url.origin || o === 'null';
}

function cors(req, res) {
  const o = req.headers.get('origin');
  if (o !== 'null') return res;
  const r = new Response(res.body, res);
  r.headers.set('access-control-allow-origin', 'null');
  r.headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
  r.headers.set('access-control-allow-headers', 'content-type');
  r.headers.set('access-control-max-age', '86400');
  r.headers.set('vary', 'origin');
  return r;
}

async function createMessage(req, env) {
  const b = await readJson(req);
  if (!b) return json({ message: 'Richiesta non valida o messaggio troppo lungo.' }, 400);
  const { ct, iv, auth, pw, ttl } = b;
  if (typeof ct !== 'string' || !B64U_RE.test(ct) || ct.length > MAX_CT || ct.length < 22 ||
      typeof iv !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(iv) ||
      typeof auth !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(auth) ||
      typeof pw !== 'boolean' || !TTLS.has(ttl)) {
    return json({ message: 'Richiesta non valida.' }, 400);
  }
  const id = b64u(crypto.getRandomValues(new Uint8Array(16)));
  const expires = Date.now() + ttl * 1000;
  await env.DB.prepare(
    'INSERT INTO messages (id, ct, iv, auth, pw, expires_at, attempts) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)'
  ).bind(id, ct, iv, await sha256(auth), pw ? 1 : 0, expires).run();
  return json({ id, expires_at: expires }, 201);
}

async function status(id, env) {
  const row = await env.DB.prepare('SELECT pw, expires_at FROM messages WHERE id = ?1').bind(id).first();
  if (!row || row.expires_at <= Date.now()) return json({ exists: false }, 404);
  return json({ exists: true, pw: row.pw === 1 });
}

async function openMessage(req, id, env) {
  const b = await readJson(req);
  if (!b || typeof b.auth !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(b.auth)) {
    return json({ message: 'Richiesta non valida.' }, 400);
  }
  const now = Date.now();
  const h = await sha256(b.auth);

  // Lettura e cancellazione in un'unica istruzione atomica: impossibile leggerlo due volte.
  const hit = await env.DB.prepare(
    'DELETE FROM messages WHERE id = ?1 AND auth = ?2 AND expires_at > ?3 RETURNING ct, iv'
  ).bind(id, h, now).first();
  if (hit) return json({ ct: hit.ct, iv: hit.iv });

  const row = await env.DB.prepare('SELECT expires_at FROM messages WHERE id = ?1').bind(id).first();
  if (!row) return json({ error: 'gone' }, 404);
  if (row.expires_at <= now) {
    await env.DB.prepare('DELETE FROM messages WHERE id = ?1').bind(id).run();
    return json({ error: 'gone' }, 404);
  }
  const upd = await env.DB.prepare(
    'UPDATE messages SET attempts = attempts + 1 WHERE id = ?1 RETURNING attempts'
  ).bind(id).first();
  if (!upd) return json({ error: 'gone' }, 404);
  if (upd.attempts >= MAX_ATTEMPTS) {
    await env.DB.prepare('DELETE FROM messages WHERE id = ?1').bind(id).run();
    return json({ error: 'burned' }, 410);
  }
  return json({ error: 'auth', remaining: MAX_ATTEMPTS - upd.attempts }, 401);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;
    const m = req.method === 'HEAD' ? 'GET' : req.method;

    try {
      if (m === 'GET' && (p === '/' || p === '/index.html')) {
        return respond(HTML, 200, 'text/html; charset=utf-8', { 'cache-control': 'no-cache' });
      }
      if (m === 'GET' && p.startsWith('/m/')) {
        return respond(HTML, 200, 'text/html; charset=utf-8', {
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex, nofollow, noarchive',
        });
      }
      if (m === 'GET' && p === '/app.js') {
        return respond(CLIENT_JS, 200, 'text/javascript; charset=utf-8', { 'cache-control': 'no-cache' });
      }
      if (m === 'GET' && p === '/style.css') {
        return respond(CSS, 200, 'text/css; charset=utf-8', { 'cache-control': 'no-cache' });
      }
      if (m === 'GET' && p === '/verifica') {
        return new Response(null, { status: 301, headers: { location: '/verifica/', ...SECURITY } });
      }
      if (m === 'GET' && p === '/verifica/') {
        return respond(VERIFY_HTML, 200, 'text/html; charset=utf-8', { 'cache-control': 'no-cache' });
      }
      if (m === 'GET' && p === '/note-legali') {
        return new Response(null, { status: 301, headers: { location: '/note-legali/', ...SECURITY } });
      }
      if (m === 'GET' && p === '/note-legali/') {
        return respond(NOTE_HTML, 200, 'text/html; charset=utf-8', { 'cache-control': 'no-cache' });
      }
      if (m === 'GET' && p === '/verifica.js') {
        return respond(VERIFY_JS, 200, 'text/javascript; charset=utf-8', { 'cache-control': 'no-cache' });
      }
      if (m === 'GET' && p === '/marzaduri-secure-offline.html') {
        return respond(OFFLINE_HTML, 200, 'text/html; charset=utf-8', {
          'cache-control': 'no-cache',
          'content-disposition': 'attachment; filename="marzaduri-secure-offline.html"',
        });
      }
      if (m === 'GET' && p === '/.well-known/security.txt') {
        return respond(SECURITY_TXT, 200, 'text/plain; charset=utf-8', { 'cache-control': 'no-cache' });
      }
      if (m === 'GET' && p === '/robots.txt') {
        return respond('User-agent: *\nDisallow: /m/\nDisallow: /api/\n', 200, 'text/plain; charset=utf-8');
      }

      if (p.startsWith('/api/')) {
        if (m === 'OPTIONS') return cors(req, new Response(null, { status: 204 }));
        if (m === 'POST' && !sameOrigin(req, url)) return json({ message: 'Origine non consentita.' }, 403);
        if (m === 'POST' && p === '/api/messages') return cors(req, await createMessage(req, env));
        const s = p.match(/^\/api\/messages\/([^/]+)(\/open)?$/);
        if (s && ID_RE.test(s[1])) {
          if (m === 'GET' && !s[2]) return cors(req, await status(s[1], env));
          if (m === 'POST' && s[2]) return cors(req, await openMessage(req, s[1], env));
        }
        return cors(req, json({ message: 'Non trovato.' }, 404));
      }

      return respond('Pagina non trovata', 404, 'text/plain; charset=utf-8');
    } catch (e) {
      // Nessun dato del messaggio viene registrato nei log.
      console.error('errore interno', e && e.name);
      return json({ message: 'Errore interno. Riprova.' }, 500);
    }
  },

  // Pulizia oraria dei messaggi scaduti e mai aperti.
  async scheduled(_event, env) {
    await env.DB.prepare('DELETE FROM messages WHERE expires_at <= ?1').bind(Date.now()).run();
  },
};
