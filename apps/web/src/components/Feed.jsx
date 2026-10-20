import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../auth/AuthProvider';
import { readDraft, writeDraft } from '../auth/drafts';
import PostCard from './PostCard';
export default function Feed() {
  const { user } = useAuth();
  const draftKey = [user._id, user.hubId, 'feed'].join(':');
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState(() => readDraft(draftKey) || '');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [postError, setPostError] = useState('');
  useEffect(() => { writeDraft(draftKey, content || null); }, [draftKey, content]);
  async function load(next = null) {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/posts', { params: { limit: 20, ...(next ? { cursor: next } : {}) } });
      setPosts(previous => next ? [...previous, ...data.items.filter(row => !previous.some(item => item._id === row._id))] : data.items);
      setCursor(data.nextCursor); setLoaded(true);
    } catch (err) { setError(err.response?.data?.error || 'Unable to load posts. Please retry.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function submit(event) {
    event.preventDefault(); setPosting(true); setPostError('');
    try {
      const { data } = await api.post('/posts', { content: content.trim() });
      setPosts(previous => [data, ...previous]); setContent(''); writeDraft(draftKey, null);
    } catch (err) { setPostError(err.response?.data?.error || 'Publication is unconfirmed. Reload the feed to check before posting again; your text is preserved.'); }
    finally { setPosting(false); }
  }
  const tooLong = new TextEncoder().encode(content.trim()).length > 8192;
  return <div className="stack">
    <form className="card composer" onSubmit={submit}>
      <label htmlFor="post-content">What are you working on?</label>
      <textarea id="post-content" rows={3} maxLength={8192} placeholder="A small win, a big question, a work in progress..." value={content} onChange={e => setContent(e.target.value)} />
      <div className="composer-footer"><small className="muted">{tooLong ? 'Keep your post within 8 KiB.' : 'Visible to your college. Post rewards are unavailable.'}</small>
        <button className="primary" disabled={posting || !content.trim() || tooLong}>{posting ? 'Sharing...' : 'Share post'}</button></div>
    </form>
    {postError && <p role="alert" className="error">{postError}</p>}
    {error && <div role="alert" className="error">{error} <button disabled={loading} onClick={() => load(cursor)}>Reload feed</button></div>}
    {loaded && !loading && !error && !posts.length && <div className="empty-state"><h3>Every community starts with hello.</h3><p>Be the first to share something with your college.</p></div>}
    {posts.map(post => <PostCard key={post._id} post={post} onPostUpdated={updated => setPosts(previous => previous.map(item => item._id === updated._id ? updated : item))} />)}
    {loading && <p role="status">Loading posts...</p>}
    {loaded && !cursor && posts.length > 0 && !loading && <p className="feed-end">You’re caught up with this saved feed.</p>}
    {cursor && <button disabled={loading} onClick={() => load(cursor)}>Load more posts</button>}
  </div>;
}
