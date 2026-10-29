import { initialState } from './game';

// En Vercel el estado se guarda en Redis (Upstash, desde el Marketplace de Vercel).
// Sin esas variables se usa memoria del proceso: sirve para `npm run dev`, no para producción.
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'cien-argentinos:state';

export const storageKind = REDIS_URL && REDIS_TOKEN ? 'redis' : 'memory';

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Redis respondió ${res.status}`);
  return data.result;
}

export async function loadState() {
  if (storageKind === 'redis') {
    const raw = await redis(['GET', KEY]);
    return raw ? { ...initialState(), ...JSON.parse(raw) } : initialState();
  }
  globalThis.__cienArgentinos ??= initialState();
  return globalThis.__cienArgentinos;
}

export async function saveState(state) {
  if (storageKind === 'redis') {
    await redis(['SET', KEY, JSON.stringify(state)]);
  } else {
    globalThis.__cienArgentinos = state;
  }
}
