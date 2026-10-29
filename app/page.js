'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameState } from '@/lib/client';
import { playAward, playBuzzer, playDing, playTick, playWhoosh, unlockAudio } from '@/lib/sounds';

const STAGE_W = 1920;
const STAGE_H = 1080;
const SLOTS = 8;

function useStageScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

export default function Pantalla() {
  const { state } = useGameState('display', { interval: 350 });
  const scale = useStageScale();
  const [started, setStarted] = useState(false);
  const [xShow, setXShow] = useState(null);
  const [award, setAward] = useState(null);
  const prev = useRef(null);

  // Compara el estado nuevo con el anterior para disparar sonidos y animaciones.
  useEffect(() => {
    if (!state) return;
    const before = prev.current;
    prev.current = state;
    if (!before) return;

    const sameRound = before.round === state.round;
    if (sameRound && state.board.some((a, i) => a && !before.board[i])) playDing();
    if (state.question && !before.question) playWhoosh();

    if (state.xEvent && state.xEvent.at !== before.xEvent?.at) {
      playBuzzer();
      setXShow({ count: state.xEvent.count, key: state.xEvent.at });
    }
    if (state.awardEvent && state.awardEvent.at !== before.awardEvent?.at) {
      playAward();
      setAward({ ...state.awardEvent, key: state.awardEvent.at });
    }
  }, [state]);

  useEffect(() => {
    if (!xShow) return;
    const t = setTimeout(() => setXShow(null), 1700);
    return () => clearTimeout(t);
  }, [xShow]);

  useEffect(() => {
    if (!award) return;
    const t = setTimeout(() => setAward(null), 3200);
    return () => clearTimeout(t);
  }, [award]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const start = () => {
    unlockAudio();
    toggleFullscreen();
    setStarted(true);
  };

  return (
    <main className="screen" onDoubleClick={toggleFullscreen}>
      <div className="stage" style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div className="bg-studio" />
        <div className="bg-shade" />
        {state?.phase === 'logo' && <Logo title={state.title} />}
        {state?.phase === 'board' && <Board state={state} award={award} />}
        {state?.phase === 'scores' && <Scoreboard teams={state.teams} />}
        {xShow && <Strikes key={xShow.key} count={xShow.count} />}
      </div>
      {!started && (
        <button className="start-overlay" onClick={start}>
          <span className="start-title">Pantalla de juego</span>
          <span className="start-sub">Tocá para iniciar (activa sonido y pantalla completa)</span>
          <span className="start-hint">Tecla F o doble click: pantalla completa · El operador maneja todo desde /admin</span>
        </button>
      )}
    </main>
  );
}

function splitTitle(title) {
  const m = title.trim().match(/^(\d+)\s+(.+)$/);
  const number = m ? m[1] : null;
  const words = (m ? m[2] : title).trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : null;
  return { number, main: words.join(' '), last };
}

function Logo({ title }) {
  const { number, main, last } = splitTitle(title);
  return (
    <div className="logo">
      <div className="logo-mark">
        {number && <div className="logo-number">{number}</div>}
        <div className="logo-main">{main}</div>
        {last && <div className="logo-last">{last}</div>}
      </div>
    </div>
  );
}

function TeamBox({ team, side, active, award }) {
  return (
    <div className={`team team-${side} ${active ? 'active' : ''}`}>
      <div className="team-name">{team.name}</div>
      <div className="team-score">{team.score}</div>
      {award && <div key={award.key} className="award-pop">+{award.amount}</div>}
    </div>
  );
}

function Board({ state, award }) {
  const slots = Array.from({ length: SLOTS }, (_, i) => (i < state.board.length ? { answer: state.board[i] } : null));
  const multiplierLabel = { 2: 'PUNTOS DOBLES', 3: 'PUNTOS TRIPLES' }[state.multiplier];

  return (
    <div className="board-scene">
      <div className={`question ${state.question ? 'show' : ''}`}>
        <div className="question-text" key={state.question || 'none'}>
          {state.question || `RONDA ${state.round}`}
        </div>
      </div>

      <TeamBox team={state.teams[0]} side="left" active={state.control === 0} award={award?.team === 0 ? award : null} />
      <TeamBox team={state.teams[1]} side="right" active={state.control === 1} award={award?.team === 1 ? award : null} />

      <div className="board-frame">
        <div className="pot">
          <span className="pot-value">{state.pot}</span>
        </div>
        {multiplierLabel && <div className="mult-label">{multiplierLabel}</div>}
        <div className="board-panel">
          <div className="board-grid">
            {slots.map((slot, i) => (
              <Tile key={`${state.round}-${i}`} index={i} slot={slot} />
            ))}
          </div>
        </div>
      </div>

      <div className="strike-tally">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < state.strikes ? 'on' : ''}>✕</span>
        ))}
      </div>
    </div>
  );
}

function Tile({ index, slot }) {
  if (!slot) return <div className="tile empty" />;
  const answer = slot.answer;
  const long = answer && answer.text.length > 22;
  const n = index + 1;
  return (
    <div className={`tile ${answer ? 'open' : ''}`}>
      <div className="tile-inner">
        <div className="tile-face tile-back">
          <span className="tile-ghost" aria-hidden>
            {`${n}${n}${n}${n}${n}${n}`}
          </span>
          <span className="tile-num">{n}</span>
        </div>
        <div className="tile-face tile-front">
          <span className={`tile-answer ${long ? 'long' : ''}`}>{answer?.text}</span>
          <span className="tile-points">{answer?.points}</span>
        </div>
      </div>
    </div>
  );
}

function Strikes({ count }) {
  return (
    <div className="strikes">
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} className="neon-x" viewBox="0 0 120 120" aria-hidden style={{ animationDelay: `${i * 0.06}s` }}>
          <path className="glow" d="M22 22 L98 98 M98 22 L22 98" />
          <path className="tube" d="M22 22 L98 98 M98 22 L22 98" />
          <path className="core" d="M22 22 L98 98 M98 22 L22 98" />
          <path className="hot" d="M22 22 L98 98 M98 22 L22 98" />
        </svg>
      ))}
    </div>
  );
}

// Número que corre (sube o baja) hasta el valor nuevo, con "tic" sonoro.
function useCountUp(target, duration = 1400) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    const t0 = performance.now();
    let raf;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const v = Math.round(start + (target - start) * eased);
      from.current = v;
      setValue(v);
      if (p < 1) {
        playTick(p);
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const BAR_MIN = 50;
const BAR_MAX = 400;

function Scoreboard({ teams }) {
  const [grown, setGrown] = useState(false);
  const [a, b] = teams.map((t) => t.score);
  const leader = a === b ? null : a > b ? 0 : 1;
  const max = Math.max(1, a, b);

  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Fanfarria cuando el conteo termina (al entrar y cada vez que cambian los puntos).
  useEffect(() => {
    if (!grown) return;
    const t = setTimeout(playAward, 1450);
    return () => clearTimeout(t);
  }, [grown, a, b]);

  return (
    <div className="scores">
      <div className="scores-title">PUNTAJES</div>
      <div className="scores-bars">
        {teams.map((team, i) => (
          <ScoreBar
            key={i}
            team={team}
            side={i}
            leader={leader === i}
            height={grown ? BAR_MIN + (team.score / max) * (BAR_MAX - BAR_MIN) : 0}
            target={grown ? team.score : 0}
          />
        ))}
      </div>
      <div className="scores-foot" key={`${a}-${b}`}>
        {leader === null ? '¡EMPATE!' : `${teams[leader].name} va ganando por ${Math.abs(a - b)}`}
      </div>
      {grown && leader !== null && <Confetti key={`${leader}-${a}-${b}`} side={leader} />}
    </div>
  );
}

function ScoreBar({ team, side, leader, height, target }) {
  const value = useCountUp(target);
  return (
    <div className={`score-col side-${side} ${leader ? 'leader' : ''}`}>
      <div className="score-crown" aria-hidden>
        <svg viewBox="0 0 64 44">
          <path d="M4 40 L8 10 L22 24 L32 4 L42 24 L56 10 L60 40 Z" />
        </svg>
      </div>
      <div className="score-value" key={target}>
        {value}
      </div>
      <div className="score-bar" style={{ height }} />
      <div className="score-name">{team.name}</div>
    </div>
  );
}

const CONFETTI_COLORS = ['#36d07c', '#ffd34d', '#ff5c8a', '#4fc3ff', '#ffffff', '#b46bff'];

function Confetti({ side }) {
  const pieces = useRef(
    Array.from({ length: 70 }, (_, i) => ({
      left: (side === 0 ? 20 : 50) + Math.random() * 30,
      delay: Math.random() * 0.6,
      dur: 2.2 + Math.random() * 1.6,
      rot: Math.random() * 720 - 360,
      drift: Math.random() * 200 - 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w: 10 + Math.random() * 12,
    }))
  ).current;
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.w * 0.45,
            background: p.color,
            animationDelay: `${1.3 + p.delay}s`,
            animationDuration: `${p.dur}s`,
            '--rot': `${p.rot}deg`,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
