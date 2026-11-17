import React, { useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Circle, Club, Diamond, Hexagon, Star, Triangle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { gameRoute } from '../gameRegistry';
import { useServerGame } from '../useServerGame';
import { useDeadline } from '../useDeadline';
import { type GameProps, type PracticeState } from '../api';
import GameFrame from '../GameFrame';
import './practice.css';

type Play = (action: object) => void;
type BoardProps<K extends keyof PracticeState> = {
  state: PracticeState[K];
  disabled: boolean;
  play: Play;
};
const squares = (count: number) => Array.from({ length: count }, (_, index) => index);
const grid = (columns: number) => ({ '--columns': columns } as CSSProperties);
const position = (cell: number, columns: number) => `Row ${Math.floor(cell / columns) + 1}, column ${cell % columns + 1}`;

const directions = [
  { name: 'up', Icon: ArrowUp }, { name: 'left', Icon: ArrowLeft },
  { name: 'down', Icon: ArrowDown }, { name: 'right', Icon: ArrowRight },
];

function SnakeBoard({ state, disabled, play }: BoardProps<'snake'>) {
  const [head, neck] = state.body;
  const reverse = ({ up: head - state.width, down: head + state.width, left: head - 1, right: head + 1 });
  const move = (choice: string) => { if (!disabled && reverse[choice] !== neck) play({ type: 'move', choice }); };
  return <>
    <div className="practice-meter"><span>Fruit collected</span><strong>{state.collected} / 5</strong></div>
    <div className="practice-grid snake-grid" style={grid(state.width)} aria-hidden="true">
      {squares(state.width ** 2).map(cell => <span key={cell} className={cell === head ? 'snake-head' : state.body.includes(cell) ? 'snake-body' : cell === state.fruit ? 'snake-fruit' : ''} />)}
    </div>
    <p className="sr-only" role="status">{position(head, state.width)}. {state.fruit !== null && `Fruit at ${position(state.fruit, state.width)}.`}</p>
    <div className="snake-controls" role="group" aria-label="Snake direction"
      onKeyDown={event => {
        const key = directions.find(item => event.key.toLowerCase() === 'arrow' + item.name);
        if (key && !disabled && !event.repeat) { event.preventDefault(); move(key.name); }
      }}>
      {directions.map(({ name, Icon }) => <button key={name} className={'snake-' + name} aria-label={'Move ' + name}
        aria-disabled={disabled || reverse[name] === neck} onClick={() => move(name)}><Icon size={24} aria-hidden="true" /></button>)}
    </div>
    <p className="muted">Use the direction buttons or focus them and press an arrow key. The snake moves once per input.</p>
  </>;
}

const symbols = [
  { name: 'circle', Icon: Circle }, { name: 'triangle', Icon: Triangle }, { name: 'diamond', Icon: Diamond },
  { name: 'star', Icon: Star }, { name: 'club', Icon: Club }, { name: 'hexagon', Icon: Hexagon },
];
function MemoryBoard({ state, disabled, play }: BoardProps<'memory'>) {
  return <>
    <div className="practice-meter"><span role="status">{state.matched.length / 2} of 6 pairs matched</span><strong>{state.attempts} / 20 turns</strong></div>
    <div className="practice-grid memory-grid" style={grid(4)} role="group" aria-label="Twelve memory cards">
      {state.cards.map((value, cell) => {
        const symbol = value === null ? null : symbols[value], matched = state.matched.includes(cell);
        const locked = disabled || matched || state.open.length === 1 && state.open.includes(cell);
        return <button key={cell} aria-disabled={locked} data-face={matched ? 'matched' : symbol ? 'open' : 'hidden'}
          aria-label={`Card ${cell + 1}: ${symbol?.name ?? 'face down'}${matched ? ', matched' : ''}`}
          onClick={() => { if (!locked) play({ type: 'flip', cell }); }}>{symbol ? <symbol.Icon size={24} aria-hidden="true" /> : '?'}</button>;
      })}
    </div>
    <p className="muted">Pick two cards. A missed pair stays visible until you flip the next card.</p>
  </>;
}

function MinesBoard({ state, disabled, play }: BoardProps<'minesweeper'>) {
  const [mode, setMode] = useState('reveal');
  return <>
    <div className="practice-meter"><span role="status">{Object.keys(state.revealed).length} of 30 safe squares</span><strong>{state.mineCount - state.flags.length} flags left</strong></div>
    <div className="practice-controls" role="group" aria-label="Minesweeper action">
      {['reveal', 'flag'].map(tool => <button key={tool} aria-pressed={mode === tool} onClick={() => setMode(tool)}>{tool === 'reveal' ? 'Reveal squares' : 'Place or remove flags'}</button>)}
    </div>
    <div className="practice-grid mines-grid" style={grid(state.size)} role="group" aria-label="Minesweeper board">
      {squares(state.size ** 2).map(cell => {
        const value = state.revealed[cell], flag = state.flags.includes(cell), mine = state.mines.includes(cell);
        const locked = disabled || value !== undefined || (flag && mode === 'reveal');
        const description = cell === state.hit ? 'mine hit' : mine ? 'mine' : value !== undefined ? `${value} adjacent mines` : flag ? 'flagged' : 'covered';
        return <button key={cell} aria-disabled={locked} aria-label={`${position(cell, state.size)}: ${description}`}
          data-square={cell === state.hit ? 'hit' : mine ? 'mine' : value !== undefined ? 'safe' : flag ? 'flag' : 'hidden'}
          onClick={() => { if (!locked) play({ type: mode, cell }); }}>{mine ? '✷' : value ?? (flag ? '⚑' : '')}</button>;
      })}
    </div>
    <p className="muted">The first reveal is safe. A number counts mines in all eight surrounding squares.</p>
  </>;
}

function PongBoard({ state, disabled, play }: BoardProps<'pong'>) {
  const { ball, last } = state;
  return <>
    <div className="practice-meter"><span>{state.returns} / 5 returned</span><strong>{state.misses} / 3 missed</strong></div>
    <div className="pong-table" aria-hidden="true">
      {squares(state.lanes).map((lane) => <div className="pong-lane" key={lane}>
        <span>{lane + 1}</span>
        {ball?.lane === lane && <span className="pong-ball" />}
        {last?.lane === lane && <span className="pong-impact" />}
        {last?.paddle === lane && <span className="pong-paddle" />}
      </div>)}
    </div>
    {ball && <>
      <p role="status">Ball in lane {ball.lane + 1}, heading {ball.direction < 0 ? 'up' : 'down'} with {ball.steps} lane {ball.steps === 1 ? 'step' : 'steps'} before it reaches your paddle.</p>
      <div className="practice-grid pong-controls" style={grid(state.lanes)} role="group" aria-label="Paddle lane">
        {squares(state.lanes).map(lane => <button key={lane} aria-disabled={disabled} aria-label={`Return from lane ${lane + 1}`} onClick={() => { if (!disabled) play({ type: 'return', cell: lane }); }}>{lane + 1}</button>)}
      </div>
    </>}
    {last && <p>Last shot landed in lane {last.lane + 1}. {last.lane === last.paddle ? 'Returned.' : 'Missed.'}</p>}
    <p className="muted">The ball changes lanes once per step and bounces off the top and bottom walls. Pick the lane where it reaches you.</p>
  </>;
}

function CrosswordBoard({ state, disabled, play }: BoardProps<'crossword'>) {
  const [selection, select] = useState('');
  const [answer, setAnswer] = useState('');
  const entry = state.entries.find(item => item.id === selection && !item.answer) ?? state.entries.find(item => !item.answer);
  const columns = Math.max(...state.entries.map(item => item.column + (item.direction === 'across' ? item.length : 1)));
  const rows = Math.max(...state.entries.map(item => item.row + (item.direction === 'down' ? item.length : 1)));
  const cells = new Map<number, { letter?: string; labels: string[]; selected: boolean }>();
  for (const item of state.entries) {
    for (let i = 0; i < item.length; i++) {
      const index = (item.row + (item.direction === 'down' ? i : 0)) * columns + item.column + (item.direction === 'across' ? i : 0);
      const current = cells.get(index) ?? { labels: [], selected: false };
      if (item.answer) current.letter = item.answer[i];
      if (i === 0) current.labels.push(item.id);
      current.selected ||= entry?.id === item.id;
      cells.set(index, current);
    }
  }
  return <>
    <div className="practice-meter"><span>{state.entries.filter(item => item.answer).length} of {state.entries.length} clues solved</span><strong>{state.attempts} / 18 guesses</strong></div>
    <div className="crossword-layout">
      <div className="practice-grid crossword-grid" style={grid(columns)} aria-hidden="true">
        {squares(columns * rows).map(index => {
          const cell = cells.get(index);
          return <span key={index} data-cell={cell ? cell.selected ? 'selected' : 'open' : 'block'}>{cell?.labels.length > 0 && <small>{cell.labels.join(' ')}</small>}{cell?.letter}</span>;
        })}
      </div>
      <div className="stack">
        <div className="crossword-clues" role="group" aria-label="Crossword clues">
          {state.entries.map(item => <button key={item.id} aria-disabled={!!item.answer || disabled} aria-pressed={entry?.id === item.id}
            onClick={() => { if (!item.answer && !disabled) { select(item.id); setAnswer(''); } }}>
            <strong>{item.id}</strong><span>{item.clue} ({item.length}){item.answer && ` · ${item.answer}`}</span>
          </button>)}
        </div>
        {entry && <form className="practice-controls crossword-answer" onSubmit={event => {
          event.preventDefault();
          if (!disabled && answer.length === entry.length) { play({ type: 'solve', questionId: entry.id, choice: answer }); setAnswer(''); }
        }}>
          <label htmlFor="crossword-word">Answer for {entry.id}<input id="crossword-word" autoComplete="off" spellCheck={false} value={answer} maxLength={entry.length} onChange={event => setAnswer(event.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} /></label>
          <button className="primary" disabled={disabled || answer.length !== entry.length}>Check word</button>
        </form>}
        {state.last && <p role="status">{state.last.id} {state.last.correct ? 'solved.' : 'needs another guess.'}</p>}
      </div>
    </div>
  </>;
}

function BreathingBoard({ state, disabled, play, elapsed }: BoardProps<'breathing'> & { elapsed: number }) {
  const started = state.startedAt !== null, finished = started && elapsed >= state.seconds;
  const offset = Math.floor(elapsed) % 10;
  const phase = !started ? 'Ready' : finished ? 'Session complete' : offset < 4 ? 'Breathe in' : 'Breathe out';
  return <>
    <div className="practice-meter"><span>Guided breathing</span><strong>{started ? Math.min(3, Math.floor(elapsed / 10) + 1) : 0} / 3 cycles</strong></div>
    <div className="breathing-stage" data-phase={phase === 'Breathe in' ? 'inhale' : 'rest'}>
      <div className="breathing-ring" aria-hidden="true" />
      <div className="breathing-caption"><strong role="status">{phase}</strong>{started && !finished && <span aria-hidden="true">{offset < 4 ? 4 - offset : 10 - offset}s</span>}</div>
    </div>
    <p className="muted">Breathe at a comfortable pace. You can leave the exercise at any time.</p>
    {!started && <button className="primary" disabled={disabled} onClick={() => play({ type: 'begin' })}>Begin breathing</button>}
    {finished && !disabled && <button className="primary" onClick={() => play({ type: 'finish' })}>Record completion</button>}
  </>;
}

export default function PracticeGame(props: GameProps) {
  const { gameId } = useParams();
  const definition = gameRoute(gameId);
  const round = useServerGame(gameId, props);
  const { game } = round;
  const { remaining, elapsed } = useDeadline(game);
  const active = game?.status === 'active' && remaining > 0;
  const disabled = !active || round.busy || !!round.pending;
  const play: Play = action => { if (!disabled) void round.action(action); };

  function board() {
    if (!game?.practice) return null;
    switch (gameId) {
      case 'snake': return <SnakeBoard state={game.practice as PracticeState['snake']} disabled={disabled} play={play} />;
      case 'memory': return <MemoryBoard state={game.practice as PracticeState['memory']} disabled={disabled} play={play} />;
      case 'minesweeper': return <MinesBoard state={game.practice as PracticeState['minesweeper']} disabled={disabled} play={play} />;
      case 'pong': return <PongBoard state={game.practice as PracticeState['pong']} disabled={disabled} play={play} />;
      case 'crossword': return <CrosswordBoard state={game.practice as PracticeState['crossword']} disabled={disabled} play={play} />;
      case 'breathing': {
        const state = game.practice as PracticeState['breathing'];
        const secondsBeforeStart = (state.startedAt - Date.parse(game.createdAt)) / 1000;
        const exerciseElapsed = game.status === 'won' ? state.seconds : Math.max(0, elapsed - secondsBeforeStart);
        return <BreathingBoard state={state} disabled={disabled} play={play} elapsed={exerciseElapsed} />;
      }
    }
  }

  return <GameFrame round={round} title={definition.title} description={definition.description}>
    {game?.practice && <section className="card stack practice-board" aria-label={definition.title + ' board'}>
      {board()}
      {!active && <p className="practice-result" role="status">{game.status === 'won' ? 'Round complete' : game.status === 'lost' ? 'Round ended' : 'Time is up'}</p>}
    </section>}
  </GameFrame>;
}
