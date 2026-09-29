import React, { useState, useEffect } from 'react';
import { Image, Sparkles, Video } from 'lucide-react';
import PostCard from './PostCard.jsx';
import api from '../api.js';

function Feed({ accentColor }) {
  const accent = accentColor || '#7c3aed';
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('socialstream_user');
    if (stored) { try { setCurrentUser(JSON.parse(stored)); } catch {} }
  }, []);

  useEffect(() => {
    api.get('/posts')
      .then((r) => setPosts(r.data || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!postContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await api.post('/posts', { content: postContent.trim() });
      setPosts([res.data, ...posts]);
      setPostContent('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create post.');
    } finally { setIsSubmitting(false); }
  };

  const userInitial = (currentUser?.fullName || currentUser?.username || 'U')[0].toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Composer */}
      <section style={{
        borderRadius: 16, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.07)',
        background: '#111118',
      }}>
        <form onSubmit={handleSubmitPost}>
          <div style={{ display: 'flex', gap: 12, padding: '14px 16px' }}>
            {currentUser?.profilePicture ? (
              <img src={currentUser.profilePicture} alt={currentUser.fullName}
                style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: 'white',
              }}>{userInitial}</div>
            )}
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Share what you're building or solving today..."
              disabled={isSubmitting}
              rows={3}
              style={{
                flex: 1, resize: 'none', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                background: '#0a0a0f',
                padding: '10px 14px', fontSize: 13,
                color: 'white', outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => { e.target.style.borderColor = `${accent}60`; e.target.style.boxShadow = `0 0 0 3px ${accent}18`; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', gap: 16 }}>
              {[{ icon: <Image size={15} />, label: 'Media' }, { icon: <Video size={15} />, label: 'Stream' }].map((btn) => (
                <button key={btn.label} type="button" disabled={isSubmitting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: '#6b7280',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#9ca3af'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                >
                  {btn.icon} {btn.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 99,
                background: `${accent}15`,
                border: `1px solid ${accent}30`,
                fontSize: 11, color: accent,
              }}>
                <Sparkles size={12} />
                Post rewards are unavailable
              </div>
              <button
                type="submit"
                disabled={!postContent.trim() || isSubmitting}
                style={{
                  padding: '6px 18px', borderRadius: 10,
                  background: `linear-gradient(135deg,${accent},#06b6d4)`,
                  border: 'none', color: 'white',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  opacity: (!postContent.trim() || isSubmitting) ? 0.5 : 1,
                  transition: 'opacity 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => { if (postContent.trim()) e.currentTarget.style.transform = 'scale(1.03)'; }}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      </section>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: `3px solid ${accent}30`,
              borderTopColor: accent,
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ fontSize: 13, color: '#4b5563' }}>Loading posts...</p>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '48px 0', gap: 12,
        }}>
          <div style={{ fontSize: 36 }}>✦</div>
          <p style={{ fontSize: 14, color: '#4b5563' }}>No posts yet. Be the first to share something.</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post._id} post={post}
            onPostUpdated={(u) => setPosts(posts.map((p) => p._id === u._id ? u : p))}
            accentColor={accent} />
        ))
      )}
    </div>
  );
}

export default Feed;