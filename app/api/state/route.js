import { NextResponse } from 'next/server';
import { applyAction, displayView } from '@/lib/game';
import { loadState, saveState, storageKind } from '@/lib/store';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store, max-age=0' };

function isAdmin(req) {
  const password = process.env.ADMIN_PASSWORD;
  return !password || req.headers.get('x-admin-key') === password;
}

function adminPayload(state) {
  return { ...state, storage: storageKind, locked: Boolean(process.env.ADMIN_PASSWORD) };
}

export async function GET(req) {
  const view = new URL(req.url).searchParams.get('view');
  const state = await loadState();
  if (view === 'admin') {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401, headers: noStore });
    return NextResponse.json(adminPayload(state), { headers: noStore });
  }
  return NextResponse.json(displayView(state), { headers: noStore });
}

export async function POST(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401, headers: noStore });
  try {
    const { action, payload } = await req.json();
    const next = applyAction(await loadState(), action, payload);
    await saveState(next);
    return NextResponse.json(adminPayload(next), { headers: noStore });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400, headers: noStore });
  }
}
