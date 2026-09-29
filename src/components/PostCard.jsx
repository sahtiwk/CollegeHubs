import React, { useState } from 'react';
import api from '../api';
import { useAuth } from '../auth/AuthProvider';
export default function PostCard({ post, onPostUpdated }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const liked = post.likes.some(id => id === user._id);
  async function toggle() {
    setBusy(true); setError('');
    try { const { data } = await api[liked ? 'delete' : 'put']('/posts/' + post._id + '/like'); onPostUpdated(data); }
    catch (err) { setError(err.response?.data?.error || 'Unable to update like.'); }
    finally { setBusy(false); }
  }
  return <article className="card post">
    <header><span className="avatar small" aria-hidden="true">{(post.author?.fullName || post.author?.username || '?')[0].toUpperCase()}</span>
      <div><strong>{post.author?.fullName || post.author?.username || 'Unavailable member'}</strong><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time></div></header>
    <p className="post-content">{post.content}</p>
    <button aria-pressed={liked} disabled={busy} onClick={toggle}>{liked ? 'Unlike' : 'Like'} <span aria-hidden="true">&middot;</span> {post.likes.length}</button>
    {error && <p role="alert" className="error">{error}</p>}
  </article>;
}
