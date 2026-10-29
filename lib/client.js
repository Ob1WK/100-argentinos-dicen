'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const CHANNEL = 'cien-argentinos';

// Avisa a otras pestañas del mismo navegador (pantalla abierta en la misma compu) para que refresquen al instante.
function notifyLocal() {
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage('changed');
    bc.close();
  } catch {}
}

export function useGameState(view, { interval = 400, adminKey } = {}) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch(`/api/state?view=${view}`, {
        cache: 'no-store',
        headers: adminKey ? { 'x-admin-key': adminKey } : {},
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || 'Error'), { status: res.status });
      setState((prev) => (prev && prev.rev === data.rev && prev.storage === data.storage ? prev : data));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      busy.current = false;
    }
  }, [view, adminKey]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, interval);
    let bc;
    try {
      bc = new BroadcastChannel(CHANNEL);
      bc.onmessage = () => refresh();
    } catch {}
    return () => {
      clearInterval(timer);
      bc?.close();
    };
  }, [refresh, interval]);

  return { state, setState, error, refresh };
}

export async function sendAction(action, payload, adminKey) {
  const res = await fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(adminKey ? { 'x-admin-key': adminKey } : {}) },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || 'Error'), { status: res.status });
  notifyLocal();
  return data;
}
