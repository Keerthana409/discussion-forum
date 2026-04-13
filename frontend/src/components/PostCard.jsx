import React, { useState } from 'react';
import api from '../services/api';

const summarizeText = (text, mode = 'short') => {
  if (!text) return "";
  let temp = text.replace(/\b(Mr|Mrs|Ms|Dr|Sr|Jr|Prof|vs|etc)\./gi, '$1<dot>').replace(/([A-Z])\./g, '$1<dot>');
  let rawSentences = temp.match(/[^.!?]+[.!?]+/g) || [text];
  const sentences = rawSentences.map(s => s.replace(/<dot>/g, '.').trim());
  
  if (mode === 'detailed') {
      let simpleText = sentences.slice(0, Math.min(6, Math.max(5, sentences.length))).join(' ').trim().toLowerCase();
      const simplifications = {
          'utilize': 'use', 'facilitate': 'help', 'implement': 'do',
          'subsequently': 'then', 'optimum': 'best', 'necessitate': 'need', 'commence': 'start'
      };
      for(const [complex, simple] of Object.entries(simplifications)) {
          simpleText = simpleText.replace(new RegExp(`\\b${complex}\\b`, 'g'), simple);
      }
      return `In simple words: ${simpleText}`;
  } else if (mode === 'medium') {
      return sentences.slice(0, Math.min(3, Math.max(2, sentences.length))).join(' ').trim();
  }
  return sentences.slice(0, 1).join(' ').trim();
};

const HighlightedText = ({ text, highlight }) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? <span key={i} className="highlight">{part}</span> : part
      )}
    </span>
  );
};

const renderComments = (comments, depth, postId, currentUser, refreshPosts) => {
  if (!comments || comments.length === 0) return null;
  return comments.map(c => <CommentItem key={c.id} c={c} depth={depth} postId={postId} currentUser={currentUser} refreshPosts={refreshPosts} />);
};

const CommentItem = ({ c, depth, postId, currentUser, refreshPosts }) => {
  const [showReplyPanel, setShowReplyPanel] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleReplySubmit = async () => {
    if(!replyText.trim()) return;
    try {
        await api.post(`/posts/${postId}/comment`, { content: replyText, targetCommentId: c.id });
        setReplyText('');
        setShowReplyPanel(false);
        refreshPosts();
    } catch(err) { alert(err.message); }
  };

  const handleDelete = async () => {
    if(!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
        await api.delete(`/posts/${postId}/comment/${c.id}`);
        refreshPosts();
    } catch(err) { alert("Failed to delete: " + err.message); }
  };

  const depthClass = depth > 6 ? 'nested-comment-depth-6' : 'nested-comment'; 

  return (
    <div className={depthClass} style={depth === 1 ? { paddingLeft: 0, borderLeft: 'none' } : {}}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
        <strong>{c.author}</strong> • {new Date(c.timestamp).toLocaleString()}
      </div>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-dark)', marginBottom: '0.3rem' }}>{c.content}</div>
      
      {depth <= 6 && (
        <button onClick={() => setShowReplyPanel(!showReplyPanel)} className="btn btn-sm reply-btn" style={{ padding: 0, background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.8rem' }}>
          <i className="fa-solid fa-reply"></i> Reply
        </button>
      )}
      
      {currentUser?.role === 'admin' && (
        <button onClick={handleDelete} className="btn btn-sm delete-comment-btn" style={{ padding: 0, marginLeft: '0.5rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>
          <i className="fa-solid fa-trash"></i> Delete
        </button>
      )}
      
      {showReplyPanel && (
        <div className="reply-input-container" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
            <input type="text" className="reply-input" placeholder="Reply..." value={replyText} onChange={e => setReplyText(e.target.value)} style={{ flex: 1, padding: '0.3rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', background: 'var(--bg-card)', color: 'var(--text-dark)', fontSize: '0.8rem' }} />
            <button className="btn btn-primary submit-reply-btn btn-sm" onClick={handleReplySubmit}>Post</button>
        </div>
      )}

      {renderComments(c.replies, depth + 1, postId, currentUser, refreshPosts)}
    </div>
  );
};

const PostCard = ({ post, currentUser, refreshPosts, setTagFilter, searchQuery }) => {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [summaryMode, setSummaryMode] = useState(null);

  const handleVote = async (type) => {
    try {
      await api.post(`/posts/${post._id}/vote`, { type });
      refreshPosts();
    } catch(e) { alert(e.message); }
  };

  const handleReact = async (type) => {
    try {
      await api.post(`/posts/${post._id}/react`, { type });
      refreshPosts();
    } catch(e) { alert(e.message); }
  };

  const handleReport = async () => {
    const reason = prompt("Please provide a reason for reporting:");
    if(!reason) return;
    try {
        await api.post(`/posts/${post._id}/report`, { reason, reporter: currentUser.username });
        alert("Post added to the Report Queue and placed Under Review."); 
        refreshPosts();
    } catch(err) { alert(err.message); }
  };

  const handleAdminStatus = async (action) => {
    try {
        await api.patch(`/admin/post/${post._id}`, { action });
        refreshPosts();
    } catch(err) { alert(err.message); }
  };

  const handleCommentSubmit = async () => {
    if(!newComment.trim()) return;
    try {
      await api.post(`/posts/${post._id}/comment`, { content: newComment });
      setNewComment('');
      refreshPosts();
    } catch (err) { alert(err.message); }
  };

  let statusLabel = null;
  let borderLeftStyle = '';
  if (post.status === 'spam') {
        statusLabel = <span className="badge badge-danger">⚠️ Spam</span>;
        borderLeftStyle = "4px solid var(--danger)";
  } else if (post.status === 'duplicate') {
        statusLabel = <span className="badge badge-danger">📋 Duplicate</span>;
  } else if (post.status === 'similar') {
        statusLabel = <span className="badge badge-warning">📋 Similar</span>;
  } else if (post.status === 'under review') {
        statusLabel = <span className="badge badge-warning">🚩 Under Review</span>;
        borderLeftStyle = "4px solid var(--warning)";
  } else if (post.status === 'removed') {
        statusLabel = <span className="badge badge-danger">❌ Removed</span>;
  }

  const fireReactions = post.reactions?.fire || 0;
  const laughReactions = post.reactions?.laugh || 0;
  const dislikeCount = post.dislikes || 0;
  const hasReacted = currentUser && post.reactedUsers?.includes(currentUser.username);

  return (
    <div className={`card post-card ${post.isPinned ? 'pinned-post' : ''}`} style={borderLeftStyle ? { borderLeft: borderLeftStyle } : {}}>
      <div className="post-votes">
          <button className="vote-btn upvote" onClick={() => handleVote('up')}><i className="fa-solid fa-arrow-up"></i></button>
          <span>{post.likes - dislikeCount}</span>
          <button className="vote-btn down downvote" onClick={() => handleVote('down')}><i className="fa-solid fa-arrow-down"></i></button>
      </div>

      <div className="post-content-area">
          <div className="post-meta">
              <span>Posted by <strong>u/{post.author}</strong></span>
              <span>•</span>
              <span>{new Date(post.timestamp).toLocaleString()}</span>
              <div style={{ marginLeft: 'auto' }}>{statusLabel}</div>
          </div>

          <h3 className="post-title">
            {post.isPinned && <i className="fa-solid fa-thumbtack pinned-icon"></i>}
            {' '}
            <HighlightedText text={post.title} highlight={searchQuery} />
          </h3>

          <div style={{ marginBottom: '0.5em', display: 'flex', gap: '0.3rem' }}>
            {post.tags?.map((t, i) => (
              <span key={i} className="post-tag badge" style={{ color: 'var(--text-dark)' }} onClick={() => setTagFilter(t)}>{t}</span>
            ))}
          </div>

          <div className="post-body">
            <HighlightedText text={post.content} highlight={searchQuery} />
          </div>

          {summaryMode && (
            <div className="post-summary" style={{ marginBottom: '1rem', padding: '0.8rem', background: 'var(--secondary-color)', borderLeft: '3px solid var(--primary-color)', borderRadius: '4px', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-dark)' }}>
               <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Summary Length:</span>
                  <div className="summary-options">
                      <button className="summary-opt-btn" style={summaryMode === 'short' ? { background:'var(--primary-color)' } : {}} onClick={() => setSummaryMode('short')}>Short</button>
                      <button className="summary-opt-btn" style={summaryMode === 'medium' ? { background:'var(--primary-color)' } : {}} onClick={() => setSummaryMode('medium')}>Medium</button>
                      <button className="summary-opt-btn" style={summaryMode === 'detailed' ? { background:'var(--primary-color)' } : {}} onClick={() => setSummaryMode('detailed')}>Detailed</button>
                  </div>
              </div>
              <div className="summary-output">
                <strong>✨ AI Summary ({summaryMode.charAt(0).toUpperCase() + summaryMode.slice(1)}):</strong> {summarizeText(post.content, summaryMode)}
              </div>
            </div>
          )}

          {post.image && <img src={post.image} alt="Post attachment" className="post-attached-image" />}

          <div className="post-actions">
              <button className="action-btn summarize-btn" onClick={() => setSummaryMode(summaryMode ? null : 'short')}>
                <i className="fa-solid fa-bolt"></i> Summarize
              </button>
              <button className="action-btn comment-btn" onClick={() => setShowComments(!showComments)}>
                <i className="fa-regular fa-comment-dots"></i> {post.comments ? post.comments.length : 0} Comments
              </button>

              {currentUser?.role !== 'admin' && (
                post.hasReport ? (
                  <button className="action-btn" disabled style={{ opacity: 0.6, cursor: 'not-allowed', color: 'var(--danger)' }}>
                    <i className="fa-solid fa-flag"></i> Reported
                  </button>
                ) : (
                  <button className="action-btn report-btn" onClick={handleReport}>
                    <i className="fa-regular fa-flag"></i> Report
                  </button>
                )
              )}

              {currentUser?.role === 'admin' && post.status === 'under review' && (
                <>
                  <button className="action-btn admin-approve-btn" onClick={() => handleAdminStatus('safe')} style={{ color: 'var(--success)', borderColor: 'var(--success)', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-check"></i> Approve
                  </button>
                  <button className="action-btn admin-reject-btn" onClick={() => handleAdminStatus('spam')} style={{ color: 'var(--danger)', borderColor: 'var(--danger)', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-xmark"></i> Reject
                  </button>
                </>
              )}

              <div className="emoji-reactions">
                  <button className="emoji-btn fire-react" disabled={hasReacted} style={hasReacted ? {opacity: 0.5, cursor:'not-allowed'} : {}} onClick={() => handleReact('fire')}>
                    🔥 {fireReactions}
                  </button>
                  <button className="emoji-btn laugh-react" disabled={hasReacted} style={hasReacted ? {opacity: 0.5, cursor:'not-allowed'} : {}} onClick={() => handleReact('laugh')}>
                    😂 {laughReactions}
                  </button>
              </div>
          </div>

          {showComments && (
            <div className="comments-section" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input 
                    type="text" 
                    className="comment-input" 
                    placeholder="What are your thoughts?" 
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', background: 'var(--bg-light)', color: 'var(--text-dark)' }} 
                  />
                  <button className="btn btn-primary submit-comment-btn" onClick={handleCommentSubmit}>Reply</button>
              </div>
              {renderComments(post.comments, 1, post._id, currentUser, refreshPosts)}
            </div>
          )}
      </div>
    </div>
  );
};

export default PostCard;
