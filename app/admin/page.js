'use client';

import { useCallback, useEffect, useState } from 'react';
import { sendAction, useGameState } from '@/lib/client';

const KEY_STORAGE = 'cien-argentinos-admin-key';

function readKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export default function Admin() {
  const [adminKey, setAdminKey] = useState(null);
  useEffect(() => setAdminKey(readKey()), []);
  if (adminKey === null) return <main className="admin" />;
  return <Operador adminKey={adminKey} setAdminKey={setAdminKey} />;
}

function Login({ onSubmit, wrong }) {
  const [value, setValue] = useState('');
  return (
    <main className="admin">
      <form
        className="card login"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(value);
        }}
      >
        <h2>Panel del operador</h2>
        {wrong && <div className="banner error">Contraseña incorrecta</div>}
        <input className="input" type="password" placeholder="Contraseña" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        <button className="btn primary" type="submit">Entrar</button>
      </form>
    </main>
  );
}

function Operador({ adminKey, setAdminKey }) {
  const { state, setState, error } = useGameState('admin', { interval: 1500, adminKey });
  const [actionError, setActionError] = useState(null);
  const [editing, setEditing] = useState(false);

  const act = useCallback(
    async (action, payload) => {
      try {
        setState(await sendAction(action, payload, adminKey));
        setActionError(null);
      } catch (err) {
        setActionError(err.message);
      }
    },
    [adminKey, setState]
  );

  const question = state?.questions[state.current];

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 8 && question?.answers[n - 1]) act('reveal', { index: n - 1 });
      else if (e.key === 'x' || e.key === 'X') act('strike');
      else if (e.key === 'z' || e.key === 'Z') act('flashX', { count: 1 });
      else if (e.key === 'q' || e.key === 'Q') act('toggleQuestion');
      else if (e.key === 'p' || e.key === 'P') act('setPhase', { phase: state.phase === 'scores' ? 'board' : 'scores' });
      else if (e.key === 'ArrowRight') act('selectQuestion', { index: state.current + 1 });
      else if (e.key === 'ArrowLeft') act('selectQuestion', { index: state.current - 1 });
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, question, act]);

  if (error?.status === 401) {
    return (
      <Login
        wrong={Boolean(adminKey)}
        onSubmit={(value) => {
          try {
            localStorage.setItem(KEY_STORAGE, value);
          } catch {}
          setAdminKey(value);
        }}
      />
    );
  }

  if (!state) {
    return (
      <main className="admin">
        <div className="admin-wrap">{error ? <div className="banner error">No se pudo conectar: {error.message}</div> : <p className="muted">Cargando…</p>}</div>
      </main>
    );
  }

  const isLocal = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const total = state.pot * state.multiplier;

  return (
    <main className="admin">
      <div className="admin-wrap">
        <header className="admin-header">
          <h1>
            <span className={`status-dot ${error ? 'off' : ''}`} />
            Operador · {state.title}
            <small>
              Ronda {state.current + 1} de {state.questions.length}
            </small>
          </h1>
          <div className="row">
            <div className="seg">
              <button className={`btn ${state.phase === 'logo' ? 'on' : ''}`} onClick={() => act('setPhase', { phase: 'logo' })}>
                Logo
              </button>
              <button className={`btn ${state.phase === 'board' ? 'on' : ''}`} onClick={() => act('setPhase', { phase: 'board' })}>
                Tablero
              </button>
              <button className={`btn ${state.phase === 'scores' ? 'on' : ''}`} onClick={() => act('setPhase', { phase: 'scores' })}>
                Puntajes
              </button>
            </div>
            <a className="btn" href="/" target="_blank" rel="noreferrer">
              Abrir pantalla ↗
            </a>
          </div>
        </header>

        {state.storage === 'memory' && !isLocal && (
          <div className="banner">
            Falta conectar Redis: sin base de datos la pantalla y el panel pueden no sincronizarse en Vercel. Mirá el README.
          </div>
        )}
        {actionError && <div className="banner error">{actionError}</div>}

        <div className="mobile-bar">
          <button className="btn big danger grow" onClick={() => act('strike')} disabled={state.strikes >= 3}>
            ✕ Incorrecta
          </button>
          <button className="btn big" onClick={() => act('flashX', { count: 1 })}>
            ✕ sola
          </button>
          <span className="pot-big" style={{ fontSize: 28 }}>{state.pot}</span>
        </div>

        <div className="admin-cols">
          <section className="card">
            <h2>
              Pregunta en juego
              <span className="row">
                <button className="btn small" disabled={state.current === 0} onClick={() => act('selectQuestion', { index: state.current - 1 })}>
                  ← Anterior
                </button>
                <button
                  className="btn small"
                  disabled={state.current >= state.questions.length - 1}
                  onClick={() => act('selectQuestion', { index: state.current + 1 })}
                >
                  Siguiente →
                </button>
              </span>
            </h2>
            <select className="select" value={state.current} onChange={(e) => act('selectQuestion', { index: Number(e.target.value) })}>
              {state.questions.map((item, i) => (
                <option key={i} value={i}>
                  {i + 1}. {item.q}
                </option>
              ))}
            </select>
            <div className="question-preview">{question?.q}</div>
            <div className="row">
              <button className={`btn big ${state.showQuestion ? 'on' : 'primary'}`} onClick={() => act('toggleQuestion')}>
                {state.showQuestion ? 'Ocultar pregunta' : 'Mostrar pregunta'}
              </button>
              <div className="seg">
                {[1, 2, 3].map((m) => (
                  <button key={m} className={`btn ${state.multiplier === m ? 'on' : ''}`} onClick={() => act('setMultiplier', { multiplier: m })}>
                    {m === 1 ? 'Simple' : m === 2 ? 'Doble' : 'Triple'}
                  </button>
                ))}
              </div>
            </div>

            <div className="answers">
              {question?.answers.map((a, i) => {
                const open = state.revealed.includes(i);
                return (
                  <button key={i} className={`answer-row ${open ? 'revealed' : ''}`} onClick={() => act('reveal', { index: i })}>
                    <span className="num">{i + 1}</span>
                    <span>
                      {a.text}
                      <span className="state">{open ? 'Visible en pantalla · tocá para ocultar' : 'Oculta · tocá para dar vuelta'}</span>
                    </span>
                    <span className="pts">{a.points}</span>
                  </button>
                );
              })}
            </div>
            <div className="row">
              <button className="btn" onClick={() => act('revealAll')}>
                Destapar todas (sin sumar)
              </button>
              <button className="btn" onClick={() => act('hideAll')}>
                Tapar todas
              </button>
            </div>
            <p className="muted">
              Atajos: <span className="kbd">1</span>–<span className="kbd">8</span> dar vuelta · <span className="kbd">X</span> strike ·{' '}
              <span className="kbd">Z</span> X sola · <span className="kbd">Q</span> pregunta · <span className="kbd">P</span> puntajes · <span className="kbd">←</span>
              <span className="kbd">→</span> cambiar pregunta
            </p>
          </section>

          <div className="admin-wrap" style={{ alignContent: 'start' }}>
            <section className="card">
              <h2>
                Errores
                <span className="strike-dots">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={i < state.strikes ? 'on' : ''}>
                      ✕
                    </span>
                  ))}
                </span>
              </h2>
              <div className="row">
                <button className="btn big danger grow" onClick={() => act('strike')} disabled={state.strikes >= 3}>
                  ✕ Incorrecta ({state.strikes + 1 > 3 ? 3 : state.strikes + 1}ª)
                </button>
              </div>
              <div className="row">
                <button className="btn grow" onClick={() => act('flashX', { count: 1 })}>
                  Mostrar ✕ sola
                </button>
                <button className="btn" onClick={() => act('clearStrikes')}>
                  Limpiar
                </button>
              </div>
              <p className="muted">"✕ sola" muestra una X sin contarla (para el cara a cara o el robo).</p>
            </section>

            <section className="card">
              <h2>Pozo de la ronda</h2>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="pot-big">{state.pot}</span>
                {state.multiplier > 1 && (
                  <span className="muted">
                    × {state.multiplier} = <b style={{ color: '#ffd34d' }}>{total}</b>
                  </span>
                )}
              </div>
              {state.awarded !== null ? (
                <p className="muted">Ronda entregada a {state.teams[state.awarded].name}. Podés destapar las respuestas que faltan.</p>
              ) : (
                <div className="row">
                  {state.teams.map((t, i) => (
                    <button key={i} className="btn gold grow" disabled={!state.pot} onClick={() => act('award', { team: i })}>
                      Dar {total} a {t.name}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="card">
              <h2>Familias</h2>
              {state.teams.map((t, i) => (
                <TeamEditor key={i} team={t} index={i} control={state.control === i} act={act} />
              ))}
              <button className="btn small" onClick={() => act('setControl', { team: null })} disabled={state.control === null}>
                Quitar control
              </button>
            </section>
          </div>
        </div>

        <section className="card">
          <h2>
            Preguntas ({state.questions.length})
            <button className="btn small" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Cerrar editor' : 'Editar preguntas'}
            </button>
          </h2>
          {editing && <QuestionEditor state={state} act={act} />}
        </section>

        <section className="card">
          <h2>Juego</h2>
          <div className="row">
            <TitleEditor title={state.title} act={act} />
            <button
              className="btn danger"
              onClick={() => confirm('¿Empezar un juego nuevo? Los puntajes vuelven a 0 y se arranca desde la pregunta 1.') && act('newGame')}
            >
              Nuevo juego
            </button>
            {state.locked && (
              <button
                className="btn"
                onClick={() => {
                  try {
                    localStorage.removeItem(KEY_STORAGE);
                  } catch {}
                  setAdminKey('');
                }}
              >
                Cerrar sesión
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function TeamEditor({ team, index, control, act }) {
  const [name, setName] = useState(team.name);
  const [delta, setDelta] = useState('');
  useEffect(() => setName(team.name), [team.name]);

  const saveName = () => name.trim() && name !== team.name && act('setTeam', { team: index, name: name.trim() });
  const applyDelta = (sign) => {
    const n = parseInt(delta, 10);
    if (n) act('adjustScore', { team: index, delta: sign * n });
    setDelta('');
  };

  return (
    <div className={`team-edit ${control ? 'control' : ''}`}>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} />
      <span className="team-score-admin">{team.score}</span>
      <div className="row" style={{ gridColumn: '1 / -1' }}>
        <button className={`btn small ${control ? 'on' : ''}`} onClick={() => act('setControl', { team: index })}>
          {control ? 'Tiene el control' : 'Dar control'}
        </button>
        <input className="input grow" style={{ width: 80 }} inputMode="numeric" placeholder="Puntos" value={delta} onChange={(e) => setDelta(e.target.value.replace(/\D/g, ''))} />
        <button className="btn small" onClick={() => applyDelta(1)}>
          + Sumar
        </button>
        <button className="btn small" onClick={() => applyDelta(-1)}>
          − Restar
        </button>
      </div>
    </div>
  );
}

function TitleEditor({ title, act }) {
  const [value, setValue] = useState(title);
  useEffect(() => setValue(title), [title]);
  return (
    <input
      className="input grow"
      style={{ maxWidth: 360 }}
      value={value}
      title="Título que se ve en el logo"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value !== title && act('setTitle', { title: value })}
      onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
    />
  );
}

const emptyDraft = () => ({ q: '', answers: Array.from({ length: 8 }, () => ({ text: '', points: '' })) });

function toDraft(item) {
  const answers = item.answers.map((a) => ({ text: a.text, points: String(a.points) }));
  while (answers.length < 8) answers.push({ text: '', points: '' });
  return { q: item.q, answers };
}

function QuestionEditor({ state, act }) {
  const [editIndex, setEditIndex] = useState(null); // número = editar, 'new' = nueva
  const [draft, setDraft] = useState(emptyDraft);
  const [json, setJson] = useState(null);

  const startEdit = (i) => {
    setEditIndex(i);
    setDraft(i === 'new' ? emptyDraft() : toDraft(state.questions[i]));
  };

  const save = () => {
    const item = { q: draft.q, answers: draft.answers.filter((a) => a.text.trim()) };
    if (!item.q.trim() || !item.answers.length) return alert('Completá la pregunta y al menos una respuesta.');
    const list = [...state.questions];
    if (editIndex === 'new') list.push(item);
    else list[editIndex] = item;
    act('saveQuestions', { questions: list });
    setEditIndex(null);
  };

  const remove = (i) => {
    if (!confirm(`¿Borrar la pregunta ${i + 1}?`)) return;
    act('saveQuestions', { questions: state.questions.filter((_, j) => j !== i) });
  };

  const setAnswer = (i, field, value) =>
    setDraft((d) => ({ ...d, answers: d.answers.map((a, j) => (j === i ? { ...a, [field]: value } : a)) }));

  if (editIndex !== null) {
    return (
      <div className="answers">
        <input className="input" placeholder="Pregunta" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} autoFocus />
        <div className="edit-answers">
          {draft.answers.map((a, i) => (
            <div key={i} className="edit-answer">
              <span className="muted">{i + 1}</span>
              <input className="input" placeholder="Respuesta" value={a.text} onChange={(e) => setAnswer(i, 'text', e.target.value)} />
              <input className="input" placeholder="Pts" inputMode="numeric" value={a.points} onChange={(e) => setAnswer(i, 'points', e.target.value.replace(/\D/g, ''))} />
            </div>
          ))}
        </div>
        <p className="muted">Las respuestas se ordenan solas de mayor a menor puntaje al guardar.</p>
        <div className="row">
          <button className="btn primary" onClick={save}>
            Guardar
          </button>
          <button className="btn" onClick={() => setEditIndex(null)}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (json !== null) {
    return (
      <div className="answers">
        <textarea className="textarea" value={json} onChange={(e) => setJson(e.target.value)} />
        <div className="row">
          <button
            className="btn primary"
            onClick={() => {
              try {
                act('saveQuestions', { questions: JSON.parse(json) });
                setJson(null);
              } catch {
                alert('El JSON no es válido.');
              }
            }}
          >
            Importar
          </button>
          <button className="btn" onClick={() => setJson(null)}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="answers">
      <div className="editor-list">
        {state.questions.map((item, i) => (
          <div key={i} className={`editor-item ${i === state.current ? 'current' : ''}`}>
            <span className="muted">{i + 1}</span>
            <span>
              {item.q} <span className="muted">· {item.answers.length} resp.</span>
            </span>
            <span className="row">
              <button className="btn small" onClick={() => act('selectQuestion', { index: i })}>
                Jugar
              </button>
              <button className="btn small" onClick={() => startEdit(i)}>
                Editar
              </button>
              <button className="btn small" onClick={() => remove(i)}>
                ✕
              </button>
            </span>
          </div>
        ))}
      </div>
      <div className="row">
        <button className="btn primary" onClick={() => startEdit('new')}>
          + Nueva pregunta
        </button>
        <button className="btn" onClick={() => setJson(JSON.stringify(state.questions, null, 2))}>
          Importar / exportar JSON
        </button>
        <button className="btn" onClick={() => confirm('¿Volver a las preguntas originales? Se pierden los cambios.') && act('restoreQuestions')}>
          Restaurar originales
        </button>
      </div>
    </div>
  );
}
