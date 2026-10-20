import { useDeadline } from '../useDeadline';
import React, { useState } from 'react';
import { type GameProps } from '../api';
import { useServerGame } from '../useServerGame';
import GameFrame from '../GameFrame';
import CodeBlock from '../../../components/CodeBlock';

export default function SpotTheBug(props: GameProps) {
  const round = useServerGame('spotbug', props), { game, busy, pending } = round;
  const [selection, setSelection] = useState({ questionId: '', choice: '' });
  const { remaining } = useDeadline(game);
  const bug = game?.bug, q = remaining > 0 ? bug?.currentQuestion : null;
  const choice = selection.questionId === q?.id ? selection.choice : '';
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (q && choice && !busy && !pending) void round.action({ questionId: q.id, choice });
  }
  return <GameFrame round={round} title="Spot the Bug" description="Read the code and choose the fix. Four of five correct answers qualify; each round lasts ten minutes. This is practice, and code is never run.">
    {game && bug && <div className="card stack">
      <h2>{game.status === 'won' ? 'Bugs spotted!' : game.status === 'lost' ? 'Keep practising' : game.status === 'expired' ? 'Time is up' : `Question ${game.actions.length + 1} of ${bug.total}`}</h2>
      <p role="status">{bug.correctCount} correct · {bug.passThreshold} needed to qualify</p>
      <p className="muted">Expires {new Date(game.expiresAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST. Your choices are saved.</p>
      {q && <><p>{q.prompt}</p><CodeBlock text={q.code} language={q.language} /><form onSubmit={submit} className="stack">
        <fieldset disabled={busy || !!pending} className="stack"><legend>Which change fixes the bug?</legend>
          {q.choices.map(option => <label key={q.id + option.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}><input type="radio" name="bug-choice" value={option.id} checked={choice === option.id} onChange={() => setSelection({ questionId: q.id, choice: option.id })} />{option.text}</label>)}
        </fieldset>
        <button className="primary" disabled={!choice || busy || !!pending}>Submit choice</button>
      </form></>}
      <div aria-live="polite">{bug.feedback.length > 0 && <><h3>What you learned</h3><ol>{bug.feedback.map(item => <li key={item.seq}><strong>Question {item.seq}: {item.correct ? 'Correct' : 'Not quite'}.</strong> {item.explanation}</li>)}</ol></>}</div>
      <p className="muted">Original CollegeHubs practice content · bug-puzzles-v1 · CC0. Rewards are capped; repeated practice is welcome.</p>
    </div>}
  </GameFrame>;
}
