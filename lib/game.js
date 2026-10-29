import { DEFAULT_QUESTIONS } from './questions';

export const MAX_SLOTS = 8;

export function initialState() {
  return {
    rev: 0,
    title: '100 Argentinos Dicen',
    phase: 'logo', // 'logo' | 'board' | 'scores'
    teams: [
      { name: 'Familia 1', score: 0 },
      { name: 'Familia 2', score: 0 },
    ],
    questions: DEFAULT_QUESTIONS,
    current: 0,
    showQuestion: false,
    revealed: [],
    strikes: 0,
    xEvent: null, // { count, at } — dispara las X rojas en pantalla
    awardEvent: null, // { team, amount, at }
    pot: 0,
    awarded: null, // índice del equipo que se llevó el pozo de esta ronda
    multiplier: 1,
    control: null, // equipo que tiene el control de la ronda
  };
}

function freshRound(s, index) {
  return {
    ...s,
    current: index,
    phase: 'board',
    showQuestion: false,
    revealed: [],
    strikes: 0,
    xEvent: null,
    awardEvent: null,
    pot: 0,
    awarded: null,
    control: null,
  };
}

function cleanQuestions(list) {
  if (!Array.isArray(list)) throw new Error('La lista de preguntas no es válida');
  return list
    .map((item) => ({
      q: String(item?.q ?? '').trim(),
      answers: (Array.isArray(item?.answers) ? item.answers : [])
        .map((a) => ({ text: String(a?.text ?? '').trim(), points: Math.max(0, parseInt(a?.points, 10) || 0) }))
        .filter((a) => a.text)
        .sort((a, b) => b.points - a.points)
        .slice(0, MAX_SLOTS),
    }))
    .filter((item) => item.q && item.answers.length);
}

export function applyAction(state, action, p = {}) {
  const s = { ...state };
  const now = Date.now();
  const question = s.questions[s.current];

  switch (action) {
    case 'setPhase':
      s.phase = ['board', 'scores'].includes(p.phase) ? p.phase : 'logo';
      break;
    case 'setTitle':
      s.title = String(p.title ?? '').slice(0, 60) || initialState().title;
      break;
    case 'selectQuestion': {
      const i = Math.min(Math.max(0, p.index | 0), s.questions.length - 1);
      return bump(freshRound(s, i));
    }
    case 'toggleQuestion':
      s.showQuestion = p.show ?? !s.showQuestion;
      break;
    case 'reveal': {
      const i = p.index | 0;
      const answer = question?.answers[i];
      if (!answer) break;
      const isOpen = s.revealed.includes(i);
      s.revealed = isOpen ? s.revealed.filter((x) => x !== i) : [...s.revealed, i];
      // Solo suma al pozo mientras nadie se lo llevó (al final se destapan las restantes sin puntos).
      if (s.awarded === null && !p.silent) s.pot = Math.max(0, s.pot + (isOpen ? -answer.points : answer.points));
      break;
    }
    case 'revealAll':
      s.revealed = question ? question.answers.map((_, i) => i) : [];
      break;
    case 'hideAll':
      s.revealed = [];
      s.pot = 0;
      break;
    case 'strike':
      s.strikes = Math.min(3, s.strikes + 1);
      s.xEvent = { count: s.strikes, at: now };
      break;
    case 'flashX':
      s.xEvent = { count: Math.min(3, Math.max(1, p.count | 0 || 1)), at: now };
      break;
    case 'clearStrikes':
      s.strikes = 0;
      break;
    case 'setMultiplier':
      s.multiplier = [1, 2, 3].includes(p.multiplier) ? p.multiplier : 1;
      break;
    case 'setControl':
      s.control = p.team === 0 || p.team === 1 ? p.team : null;
      break;
    case 'award': {
      const t = p.team;
      if (t !== 0 && t !== 1) break;
      const amount = s.pot * s.multiplier;
      s.teams = s.teams.map((team, i) => (i === t ? { ...team, score: team.score + amount } : team));
      s.awardEvent = { team: t, amount, at: now };
      s.pot = 0;
      s.awarded = t;
      break;
    }
    case 'setTeam': {
      const t = p.team;
      if (t !== 0 && t !== 1) break;
      s.teams = s.teams.map((team, i) =>
        i === t
          ? {
              name: p.name !== undefined ? String(p.name).slice(0, 30) : team.name,
              score: p.score !== undefined ? Math.max(0, parseInt(p.score, 10) || 0) : team.score,
            }
          : team
      );
      break;
    }
    case 'adjustScore': {
      const t = p.team;
      if (t !== 0 && t !== 1) break;
      s.teams = s.teams.map((team, i) =>
        i === t ? { ...team, score: Math.max(0, team.score + (parseInt(p.delta, 10) || 0)) } : team
      );
      break;
    }
    case 'saveQuestions': {
      s.questions = cleanQuestions(p.questions);
      if (!s.questions.length) s.questions = DEFAULT_QUESTIONS;
      return bump(freshRound({ ...s, phase: state.phase }, Math.min(s.current, s.questions.length - 1)));
    }
    case 'restoreQuestions':
      return bump(freshRound({ ...s, questions: DEFAULT_QUESTIONS, phase: state.phase }, 0));
    case 'newGame': {
      const fresh = freshRound({ ...s, teams: s.teams.map((t) => ({ ...t, score: 0 })), multiplier: 1 }, 0);
      return bump({ ...fresh, phase: 'logo' });
    }
    default:
      throw new Error(`Acción desconocida: ${action}`);
  }
  return bump(s);
}

function bump(s) {
  return { ...s, rev: (s.rev || 0) + 1 };
}

// Lo que ve la pantalla pública: nunca incluye respuestas sin destapar.
export function displayView(s) {
  const question = s.questions[s.current] || { q: '', answers: [] };
  return {
    rev: s.rev,
    title: s.title,
    phase: s.phase,
    teams: s.teams,
    round: s.current + 1,
    question: s.showQuestion ? question.q : null,
    board: question.answers.map((a, i) => (s.revealed.includes(i) ? { text: a.text, points: a.points } : null)),
    strikes: s.strikes,
    xEvent: s.xEvent,
    awardEvent: s.awardEvent,
    pot: s.pot,
    multiplier: s.multiplier,
    control: s.control,
  };
}
