import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import api from '../api';
import { useStudyRoom } from '../hooks/useStudyRoom';
import StudyTimer, { useStudyRemaining } from '../components/StudyTimer';
import StudyEditor from '../components/StudyEditor';
import SubmissionComparison from '../components/SubmissionComparison';
function Session({ roomId, user }) {
  const session = useStudyRoom(roomId, user.hubId), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const room = session.data?.room, remaining = useStudyRemaining(room?.endAt, session.clock);
  useEffect(() => { if (room?.status === 'active' && remaining === 0) void session.sync(); }, [room?.status, remaining]);
  async function start() { setBusy(true); setError(''); try { await session.action('start', {}); } catch (failure) { setError(failure.response?.data?.error?.message || 'Start not confirmed. Synchronize or retry.'); await session.sync(); } finally { setBusy(false); } }
  if (session.loading) return <p role="status">Loading your study room...</p>;
  if (!room) return <section className="stack"><h1>Room unavailable</h1><p role="alert">{session.error}</p><button onClick={session.sync}>Retry room</button><Link to="/">Back to campus</Link></section>;
  return <section className="stack study-page"><Link to={'/channels/' + room.channelId + '/study'}>Back to study rooms</Link>
    <div className="study-heading"><div><p className="eyebrow">Study together. Solve individually.</p><h1>{room.problem.title}</h1><p className="muted">{room.participantIds.length} of 8 participants &middot; {room.status === 'waiting' ? 'Waiting to begin' : room.status === 'active' ? 'Session in progress' : 'Ready to review'}</p></div><StudyTimer room={room} clock={session.clock} /></div>
    <p className="muted" role="status">{session.live ? 'Live room updates connected.' : 'Live updates disconnected; saved state checks every five seconds.'} <button onClick={session.sync}>Sync now</button></p>
    {session.error && <p role="alert">{session.error}</p>}{error && <p role="alert">{error}</p>}
    <section className="card stack"><p className="eyebrow">The challenge</p><p className="message-prose">{room.problem.statement}</p><div className="study-actions">{room.participants?.map(person => <span className="badge" key={person.userId}>{person.name}{person.userId === room.hostId ? ' / host' : ''}</span>)}</div>
      {room.status === 'waiting' && <><p>Share this room through the channel study list. At least two people must join before the host starts. New participants cannot join after start.</p>{room.hostId === user._id ? <button className="primary" disabled={busy || room.participantIds.length < 2} onClick={start}>{busy ? 'Starting...' : 'Start ' + room.durationMinutes + '-minute session'}</button> : <p role="status">Waiting for the host to start.</p>}</>}
    </section>
    <StudyEditor room={room} saved={session.data.ownSolution} clock={session.clock} action={session.action} sync={session.sync} />
    {room.status === 'review' && <SubmissionComparison room={room} userId={user._id} refreshId={session.refreshId} />}
  </section>;
}
export default function StudyRoom() { const { id } = useParams(), { user } = useAuth(); return <Session key={id} roomId={id} user={user} />; }
function Lobby({ channelId, user }) {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]), [rooms, setRooms] = useState([]), [problemId, setProblemId] = useState(''), [duration, setDuration] = useState(5), [error, setError] = useState(''), [busy, setBusy] = useState(false), [pending, setPending] = useState(null), [refresh, setRefresh] = useState(0), [before, setBefore] = useState(null), [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    Promise.all([api.get('/study-rooms/problems', { signal: abort.signal }), api.get('/study-rooms', { params: { channelId, ...(before ? { beforeId: before } : {}) }, signal: abort.signal })]).then(([catalog, list]) => {
      if (abort.signal.aborted) return;
      if (list.data.items.some(room => room.hubId !== user.hubId || room.channelId !== channelId)) throw new Error('Scope mismatch');
      setProblems(catalog.data.items); setProblemId(old => old || catalog.data.items[0]?._id || ''); setRooms(list.data.items); setHasMore(list.data.hasMore); setError('');
    }).catch(failure => { if (!abort.signal.aborted) setError(failure.response?.data?.error?.message || 'Study rooms unavailable.'); });
    return () => abort.abort();
  }, [channelId, user.hubId, refresh, before]);
  useEffect(() => { const timer = setInterval(() => { if (document.visibilityState === 'visible') setRefresh(value => value + 1); }, 10000); return () => clearInterval(timer); }, []);
  async function create(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = pending || { channelId, problemId, durationMinutes: Number(duration), clientRoomId: crypto.randomUUID() }; setPending(body);
    try { const { data } = await api.post('/study-rooms', body); navigate('/study-rooms/' + data.room._id); }
    catch (failure) { setError(failure.response?.data?.error?.message || 'Creation not confirmed. Retry with the same creation ID.'); if ([400, 403, 404, 409].includes(failure.response?.status)) setPending(null); }
    finally { setBusy(false); }
  }
  async function join(roomId) { setBusy(true); setError(''); try { await api.post('/study-rooms/' + roomId + '/join', {}); navigate('/study-rooms/' + roomId); } catch (failure) { setError(failure.response?.data?.error?.message || 'Join not confirmed. Retry shortly.'); } finally { setBusy(false); } }
  return <section className="stack study-page"><Link to={'/channels/' + channelId}>Back to conversation</Link><div><p className="eyebrow">Make time to think</p><h1>Study rooms</h1><p className="muted">One challenge, individual solutions, a shared deadline. Compare ideas when time is up.</p></div>
    <form className="card stack study-create" onSubmit={create}><h2>Start a study circle</h2><label>Challenge<select required value={problemId} onChange={event => setProblemId(event.target.value)} disabled={busy || !!pending}>{problems.map(problem => <option value={problem._id} key={problem._id}>{problem.title}</option>)}</select></label><label>Duration in minutes<input type="number" min="5" max="60" step="1" required value={duration} disabled={busy || !!pending} onChange={event => setDuration(event.target.value)} /></label><p>2 to 8 people. The host starts after peers join.</p><button className="primary" disabled={busy || !problemId}>{busy ? 'Creating...' : pending ? 'Retry room creation' : 'Create waiting room'}</button></form>
    {error && <p role="alert">{error}</p>}<div className="section-heading"><h2>In this channel</h2><button onClick={() => setRefresh(value => value + 1)}>Refresh rooms</button></div>
    {!rooms.length && <p className="muted">No rooms on this page yet.</p>}<div className="stack">{rooms.map(room => <article className="card study-room-row" key={room._id}><div><h3>{room.problem.title}</h3><p>{room.participantIds.length}/8 people &middot; {room.durationMinutes} minutes &middot; {room.status === 'review' ? 'Closed / review' : room.status}</p></div>{room.participantIds.includes(user._id) ? <Link className="button" to={'/study-rooms/' + room._id}>Open room</Link> : <button disabled={busy || room.participantIds.length >= 8} onClick={() => join(room._id)}>Join room</button>}</article>)}</div>
    <div className="study-actions">{hasMore && <button onClick={() => setBefore(rooms[rooms.length - 1]._id)}>Older rooms</button>}{before && <button onClick={() => setBefore(null)}>Latest rooms</button>}</div>
  </section>;
}
export function StudyLobby() { const { id } = useParams(), { user } = useAuth(); return <Lobby key={id} channelId={id} user={user} />; }
