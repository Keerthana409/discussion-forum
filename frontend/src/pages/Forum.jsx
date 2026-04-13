import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import TimeTrackingModal from '../components/TimeTrackingModal';
import api from '../services/api';

const Forum = ({ theme, toggleTheme }) => {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState(null);
  const [isTimeModalOpen, setTimeModalOpen] = useState(false);
  const [usageWarning, setUsageWarning] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('nexus_user') || 'null');

  useEffect(() => {
    fetchPosts();
    
    // Usage tracker logic
    let sessionMinutes = parseInt(localStorage.getItem('df_sessionMinutes')) || 0;
    
    const usageInterval = setInterval(async () => {
      sessionMinutes++;
      localStorage.setItem('df_sessionMinutes', sessionMinutes);
      
      if (sessionMinutes >= 30) setUsageWarning(true);

      try {
        await api.post('/usage');
      } catch (e) {
        console.error('Usage sync failed', e);
      }
    }, 60000);

    return () => clearInterval(usageInterval);
  }, []);

  const fetchPosts = async () => {
    try {
      const data = await api.get('/posts');
      setPosts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const getFilteredPosts = () => {
    let filtered = posts.filter(p => p.status !== 'removed' && p.status !== 'hidden');

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.content.toLowerCase().includes(query) || 
        (p.tags && p.tags.join(' ').toLowerCase().includes(query))
      );
    }

    if (tagFilter) {
      filtered = filtered.filter(p => p.tags && p.tags.map(t => t.toLowerCase()).includes(tagFilter.toLowerCase()));
    }

    if (filter === 'top') {
      filtered.sort((a,b) => (b.likes - (b.dislikes || 0)) - (a.likes - (a.dislikes || 0)));
    } else if (filter === 'flagged') {
      filtered = filtered.filter(p => p.status === 'under review');
      filtered.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (filter === 'safe') {
      filtered = filtered.filter(p => p.status === 'safe');
      filtered.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else {
      filtered.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Pinned logic
    const pinned = filtered.filter(p => p.isPinned);
    const unpinned = filtered.filter(p => !p.isPinned);
    
    return [...pinned, ...unpinned];
  };

  return (
    <div className="app-body">
      <Navbar 
        theme={theme} 
        toggleTheme={toggleTheme} 
        currentUser={currentUser} 
        openTimeModal={() => setTimeModalOpen(true)}
        refreshPosts={fetchPosts}
      />

      <div className="app-container">
        <main className="main-content" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
          
          <div className="card filter-container" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.5rem 1rem', marginBottom: '1rem' }}>
            <div className="filter-buttons" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className={`filter-btn ${filter === 'latest' ? 'active' : ''}`} onClick={() => setFilter('latest')}>Latest Posts</button>
              <button className={`filter-btn ${filter === 'top' ? 'active' : ''}`} onClick={() => setFilter('top')}>Top Discussions</button>
              {currentUser?.role === 'admin' && (
                <>
                  <button className={`filter-btn ${filter === 'flagged' ? 'active' : ''}`} onClick={() => setFilter('flagged')}>Flagged</button>
                  <button className={`filter-btn ${filter === 'safe' ? 'active' : ''}`} onClick={() => setFilter('safe')}>Safe</button>
                </>
              )}
            </div>
            <div style={{ flex: 1 }}></div>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '999px', padding: '0.3rem 0.8rem', background: 'var(--bg-card)' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-muted)' }}></i>
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', marginLeft: '0.5rem', color: 'var(--text-dark)', width: '200px' }}
              />
            </div>
          </div>

          {tagFilter && (
            <div style={{ padding: '0.5rem', background: 'var(--primary-color)', color: 'white', borderRadius: '4px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Filtering by Tag: <strong>{tagFilter}</strong></span>
                <span style={{ cursor: 'pointer' }} onClick={() => setTagFilter(null)}><i className="fa-solid fa-xmark"></i> Clear</span>
            </div>
          )}

          <CreatePost refreshPosts={fetchPosts} />

          <div id="posts-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {getFilteredPosts().map(post => (
              <PostCard 
                key={post._id} 
                post={post} 
                currentUser={currentUser} 
                refreshPosts={fetchPosts}
                setTagFilter={setTagFilter}
                searchQuery={searchQuery}
              />
            ))}
            {getFilteredPosts().length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No posts found.
                </div>
            )}
          </div>
        </main>
      </div>

      <TimeTrackingModal 
        isOpen={isTimeModalOpen} 
        onClose={() => setTimeModalOpen(false)} 
        theme={theme}
      />

      {usageWarning && (
        <div className="usage-warning-overlay">
            <div className="usage-warning-popup">
                <h2 style={{ color: 'var(--warning)', marginBottom: '1rem' }}><i className="fa-solid fa-triangle-exclamation"></i> Time Warning</h2>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-dark)' }}>⚠️ You've spent more than 30 minutes on the forum.</p>
                <p style={{ color: 'var(--text-muted)' }}>Please take a break!</p>
                <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => setUsageWarning(false)}>I Understand</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default Forum;
