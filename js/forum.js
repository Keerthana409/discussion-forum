document.addEventListener('DOMContentLoaded', () => {
    if(!document.getElementById('posts-container')) return;

    const currentUser = window.api.getUser();
    
    // Usage Tracker
    if(currentUser) {
        let sessionMinutes = 0;
        let warningShown = false;

        setInterval(async () => {
            sessionMinutes++;
            
            if(sessionMinutes >= 30 && !warningShown) {
                const overlay = document.getElementById('usage-warning-overlay');
                if(overlay) overlay.classList.remove('hidden');
                warningShown = true;
            }

            try {
                await window.api.request('/usage', { method: 'POST' });
            } catch(e) { console.error('Usage sync failed', e); }
        }, 60000); // 1 minute
        
        const closeWarningBtn = document.getElementById('close-warning-btn');
        if(closeWarningBtn) {
            closeWarningBtn.addEventListener('click', () => {
                document.getElementById('usage-warning-overlay').classList.add('hidden');
            });
        }
    }
    
    const createPostTrigger = document.getElementById('create-post-trigger');
    const createPostCard = document.getElementById('create-post-card');
    const cancelPostBtn = document.getElementById('cancel-post-btn');
    const createPostForm = document.getElementById('create-post-form');
    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');
    const searchInput = document.getElementById('search-input');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    window.activeFeedFilter = 'latest';
    window.activeTagFilter = null;

    let currentBase64Image = null;
    const imageInput = document.getElementById('post-image');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const clearImageBtn = document.getElementById('clear-image-btn');

    if(createPostTrigger) {
        createPostTrigger.addEventListener('click', () => {
            createPostCard.classList.remove('hidden');
            createPostTrigger.parentElement.classList.add('hidden');
        });
    }

    if(cancelPostBtn) {
        cancelPostBtn.addEventListener('click', () => {
            createPostCard.classList.add('hidden');
            createPostTrigger.parentElement.classList.remove('hidden');
            createPostForm.reset();
            clearImageData();
        });
    }

    const clearImageData = () => {
        currentBase64Image = null;
        if(imageInput) imageInput.value = "";
        if(imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
        if(imagePreview) imagePreview.src = "";
    };

    if(imageInput) {
        imageInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    currentBase64Image = e.target.result;
                    imagePreview.src = currentBase64Image;
                    imagePreviewContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            } else {
                clearImageData();
            }
        });
    }

    if(clearImageBtn) {
        clearImageBtn.addEventListener('click', clearImageData);
    }

    // Advanced AI summarization with modes
    window.summarizeText = (text, mode = 'short') => {
        if (!text) return "";
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const firstSentence = sentences[0] ? sentences[0].trim() : "";
        
        if(mode === 'detailed') {
            let simpleText = text.toLowerCase();
            const simplifications = {
                'utilize': 'use',
                'facilitate': 'help',
                'implement': 'do',
                'subsequently': 'then',
                'optimum': 'best',
                'necessitate': 'need',
                'commence': 'start'
            };
            for(const [complex, simple] of Object.entries(simplifications)) {
                simpleText = simpleText.replace(new RegExp(`\\b${complex}\\b`, 'g'), simple);
            }
            return `In simple words: ${simpleText}`;
        }
        
        if(mode === 'short') { // Convert full content into 1 line
            return firstSentence;
        } else if (mode === 'medium') { // 3-4 lines summary
            return sentences.slice(0, Math.min(4, Math.max(3, sentences.length))).join(' ');
        }
        
        return firstSentence;
    };

    if(createPostForm) {
        createPostForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('post-title').value;
            const tagsInput = document.getElementById('post-tags').value;
            const content = document.getElementById('post-content').value;
            const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
            
            try {
                await window.api.request('/posts', {
                    method: 'POST',
                    body: JSON.stringify({ title, content, tags, image: currentBase64Image })
                });

                createPostForm.reset();
                clearImageData();
                createPostCard.classList.add('hidden');
                createPostTrigger.parentElement.classList.remove('hidden');
                
                updateNotifIcon();
                window.renderPosts();
            } catch(e) {
                alert("Failed to create post: " + e.message);
            }
        });
    }

    const updateNotifIcon = () => {
        const badge = document.getElementById('notif-count');
        badge.classList.remove('hidden');
        badge.innerText = parseInt(badge.innerText) + 1;
    };

    window.renderComments = (comments, depth = 1, postId) => {
        if (!comments || comments.length === 0) return '';
        let html = '';
        comments.forEach(c => {
            const depthClass = depth > 6 ? 'nested-comment-depth-6' : 'nested-comment'; 
            html += `
                <div class="${depthClass}" data-comment-id="${c.id}" style="${depth === 1 ? 'padding-left:0; border-left:none;' : ''}">
                    <div style="font-size:0.8rem; color: var(--text-muted); margin-bottom:0.2rem"><strong>${c.author}</strong> • ${new Date(c.timestamp).toLocaleString()}</div>
                    <div style="font-size:0.9rem; color: var(--text-dark); margin-bottom:0.3rem">${c.content}</div>
                    ${depth <= 6 ? `<button class="btn btn-sm reply-btn" style="padding:0; background:none; border:none; color:var(--primary-color); cursor:pointer; font-size:0.8rem;"><i class="fa-solid fa-reply"></i> Reply</button>` : ''}
                    
                    <div class="reply-input-container hidden" style="margin-top:0.5rem; display:flex; gap:0.5rem;">
                        <input type="text" class="reply-input" placeholder="Reply..." style="flex:1; padding: 0.3rem; border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--bg-card); color: var(--text-dark); font-size: 0.8rem;">
                        <button class="btn btn-primary submit-reply-btn btn-sm" data-post-id="${postId}" data-comment-id="${c.id}">Post</button>
                    </div>

                    ${window.renderComments(c.replies, depth + 1, postId)}
                </div>
            `;
        });
        return html;
    };

    window.renderPosts = async () => {
        const container = document.getElementById('posts-container');
        
        let posts = [];
        try {
            posts = await window.api.request('/posts');
        } catch(err) {
            container.innerHTML = `<div class="card" style="text-align:center; padding: 3rem; color: var(--danger)">Failed to load posts. Wait till backend connects.</div>`;
            return;
        }

        posts = posts.filter(p => p.status !== 'removed');
        
        const query = searchInput.value.toLowerCase();
        if(query) {
            posts = posts.filter(p => 
                p.title.toLowerCase().includes(query) || 
                p.content.toLowerCase().includes(query) || 
                (p.tags && p.tags.join(' ').toLowerCase().includes(query))
            );
        }

        if(window.activeTagFilter) {
            posts = posts.filter(p => p.tags && p.tags.map(t => t.toLowerCase()).includes(window.activeTagFilter.toLowerCase()));
        }

        if(window.activeFeedFilter === 'top') {
            posts.sort((a,b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
        } else if (window.activeFeedFilter === 'flagged') {
            posts = posts.filter(p => p.status === 'under review');
            posts.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else if (window.activeFeedFilter === 'safe') {
            posts = posts.filter(p => p.status === 'safe');
            posts.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else {
            posts.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        container.innerHTML = '';

        if(window.activeTagFilter) {
            container.innerHTML += `<div style="padding: 0.5rem; background: var(--primary-color); color: white; border-radius: 4px; margin-bottom: 1rem; display: flex; justify-content: space-between;">
                <span>Filtering by Tag: <strong>${window.activeTagFilter}</strong></span>
                <span style="cursor:pointer;" onclick="window.activeTagFilter=null; window.renderPosts();"><i class="fa-solid fa-xmark"></i> Clear</span>
            </div>`;
        }

        if(posts.length === 0) {
            container.innerHTML += `<div class="card" style="text-align:center; padding: 3rem; color: var(--text-muted)">No posts found.</div>`;
            return;
        }

        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'card post-card';
            if (post.isPinned) {
                card.classList.add('pinned-post');
            }
            
            let statusLabel = '';
            if (post.status === 'spam') {
                 statusLabel = `<span class="badge badge-danger">⚠️ Spam</span>`;
                 card.style.borderLeft = "4px solid var(--danger)";
            } else if (post.status === 'duplicate') {
                 statusLabel = `<span class="badge badge-danger">📋 Duplicate</span>`;
            } else if (post.status === 'similar') {
                 statusLabel = `<span class="badge badge-warning">📋 Similar</span>`;
            } else if (post.status === 'under review') {
                 statusLabel = `<span class="badge badge-warning">🚩 Under Review</span>`;
                 card.style.borderLeft = "4px solid var(--warning)";
            } else if (post.status === 'removed') {
                 statusLabel = `<span class="badge badge-danger">❌ Removed</span>`;
            }
            
            let displayTitle = post.isPinned ? `<i class="fa-solid fa-thumbtack pinned-icon"></i> ` + post.title : post.title;
            let displayContent = post.content;
            if(query) {
                 const regex = new RegExp(`(${query})`, 'gi');
                 displayTitle = post.title.replace(regex, '<span class="highlight">$1</span>');
                 displayContent = post.content.replace(regex, '<span class="highlight">$1</span>');
            }
            
            const tagsHtml = (post.tags || []).map(t => `<span class="post-tag badge" style="color: var(--text-dark);" data-tag="${t}">${t}</span>`).join('');
            const commentsHtml = window.renderComments(post.comments || [], 1, post._id);

            const fireReactions = post.reactions ? post.reactions.fire : 0;
            const laughReactions = post.reactions ? post.reactions.laugh : 0;
            const dislikeCount = post.dislikes || 0;
            const imageHtml = post.image ? `<img src="${post.image}" alt="Post attachment" class="post-attached-image">` : '';

            card.innerHTML = `
                <div class="post-votes">
                    <button class="vote-btn upvote" data-id="${post._id}"><i class="fa-solid fa-arrow-up"></i></button>
                    <span>${post.likes - dislikeCount}</span>
                    <button class="vote-btn down downvote" data-id="${post._id}"><i class="fa-solid fa-arrow-down"></i></button>
                </div>
                <div class="post-content-area">
                    <div class="post-meta">
                        <span>Posted by <strong>u/${post.author}</strong></span>
                        <span>•</span>
                        <span>${new Date(post.timestamp).toLocaleString()}</span>
                        <div style="margin-left:auto;">${statusLabel}</div>
                    </div>
                    <h3 class="post-title">${displayTitle}</h3>
                    <div style="margin-bottom: 0.5em; display: flex; gap: 0.3rem;">${tagsHtml}</div>
                    <div class="post-body">${displayContent}</div>
                    <div class="post-summary hidden" style="margin-bottom: 1rem; padding: 0.8rem; background: var(--secondary-color); border-left: 3px solid var(--primary-color); border-radius: 4px; font-style: italic; font-size: 0.9rem; color: var(--text-dark);"></div>
                    ${imageHtml}
                    
                    <div class="post-actions">
                        <button class="action-btn summarize-btn" data-id="${post._id}" data-content="${encodeURIComponent(post.content)}"><i class="fa-solid fa-bolt"></i> Summarize</button>
                        <button class="action-btn comment-btn"><i class="fa-regular fa-comment-dots"></i> ${post.comments ? post.comments.length : 0} Comments</button>
                        ${(currentUser && currentUser.role !== 'admin') ? `<button class="action-btn report-btn" data-id="${post._id}"><i class="fa-regular fa-flag"></i> Report</button>` : ''}
                        
                        <div class="emoji-reactions">
                            <button class="emoji-btn fire-react" data-id="${post._id}">🔥 ${fireReactions}</button>
                            <button class="emoji-btn laugh-react" data-id="${post._id}">😂 ${laughReactions}</button>
                        </div>
                    </div>

                    <div class="comments-section hidden" style="margin-top: 1rem;">
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                            <input type="text" class="comment-input" placeholder="What are your thoughts?" style="flex:1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius); background: var(--bg-light); color: var(--text-dark);">
                            <button class="btn btn-primary submit-comment-btn" data-id="${post._id}">Reply</button>
                        </div>
                        ${commentsHtml}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        attachActionListeners();
    };

    function attachActionListeners() {
        const handleVote = async (id, type) => {
            try {
                await window.api.request(`/posts/${id}/vote`, {
                    method: 'POST',
                    body: JSON.stringify({ type })
                });
                window.renderPosts();
            } catch(e) {
                alert(e.message);
            }
        };

        document.querySelectorAll('.upvote').forEach(btn => {
            btn.addEventListener('click', (e) => handleVote(e.currentTarget.dataset.id, 'up'));
        });
        document.querySelectorAll('.downvote').forEach(btn => {
            btn.addEventListener('click', (e) => handleVote(e.currentTarget.dataset.id, 'down'));
        });

        document.querySelectorAll('.fire-react').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                try {
                    await window.api.request(`/posts/${id}/react`, { method: 'POST', body: JSON.stringify({type: 'fire'}) });
                    window.renderPosts();
                } catch(err) { alert(err.message); }
            });
        });
        document.querySelectorAll('.laugh-react').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                try {
                    await window.api.request(`/posts/${id}/react`, { method: 'POST', body: JSON.stringify({type: 'laugh'}) });
                    window.renderPosts();
                } catch(err) { alert(err.message); }
            });
        });

        document.querySelectorAll('.summarize-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rawContent = decodeURIComponent(e.currentTarget.dataset.content);
                const summaryDiv = e.currentTarget.closest('.post-content-area').querySelector('.post-summary');
                
                if(summaryDiv.classList.contains('hidden')) {
                    const safeContent = rawContent.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    summaryDiv.innerHTML = `
                        <div class="summary-options">
                            <button class="summary-opt-btn" onclick="this.parentElement.nextElementSibling.innerHTML='<strong>✨ AI Summary (Short):</strong> ' + window.summarizeText('${safeContent}', 'short')">Short</button>
                            <button class="summary-opt-btn" onclick="this.parentElement.nextElementSibling.innerHTML='<strong>✨ AI Summary (Medium):</strong> ' + window.summarizeText('${safeContent}', 'medium')">Medium</button>
                            <button class="summary-opt-btn" onclick="this.parentElement.nextElementSibling.innerHTML='<strong>✨ AI Summary (Detailed):</strong> ' + window.summarizeText('${safeContent}', 'detailed')">Detailed</button>
                        </div>
                        <div class="summary-content"><strong>✨ AI Summary (Short):</strong> ${window.summarizeText(rawContent, 'short')}</div>
                    `;
                    summaryDiv.classList.remove('hidden');
                } else {
                    summaryDiv.classList.add('hidden');
                }
            });
        });

        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sect = e.currentTarget.parentElement.nextElementSibling;
                sect.classList.toggle('hidden');
            });
        });

        document.querySelectorAll('.submit-comment-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const input = e.currentTarget.previousElementSibling;
                if(!input.value.trim()) return;
                
                try {
                    await window.api.request(`/posts/${id}/comment`, {
                        method: 'POST',
                        body: JSON.stringify({ content: input.value })
                    });
                    updateNotifIcon(); 
                    window.renderPosts();
                } catch(err) { alert(err.message); }
            });
        });

        document.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reason = prompt("Please provide a reason for reporting:");
                if(reason === null) return;
                const id = e.currentTarget.dataset.id;
                try {
                    await window.api.request(`/posts/${id}/report`, {
                        method: 'POST',
                        body: JSON.stringify({ reason: reason || 'No reason' })
                    });
                    alert("Post added to the Report Queue and placed Under Review."); 
                    window.renderPosts();
                } catch(err) { alert(err.message); }
            });
        });

        document.querySelectorAll('.post-tag').forEach(tagEl => {
            tagEl.addEventListener('click', (e) => {
                window.activeTagFilter = e.currentTarget.dataset.tag;
                window.renderPosts();
            });
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            window.activeFeedFilter = e.currentTarget.dataset.filter;
            window.renderPosts();
        });
    });

    searchInput.addEventListener('input', window.renderPosts);
    window.renderPosts();

    document.addEventListener('click', async e => {
        if(e.target.closest('.reply-btn')) {
            const btn = e.target.closest('.reply-btn');
            const container = btn.nextElementSibling;
            if(container && container.classList.contains('reply-input-container')) {
                container.classList.toggle('hidden');
            }
        }
        if(e.target.closest('.submit-reply-btn')) {
            const btn = e.target.closest('.submit-reply-btn');
            const postId = btn.dataset.postId;
            const commentId = btn.dataset.commentId;
            const input = btn.previousElementSibling;
            if(!input.value.trim()) return;
            
            try {
                await window.api.request(`/posts/${postId}/comment`, {
                    method: 'POST',
                    body: JSON.stringify({ content: input.value, targetCommentId: commentId })
                });
                updateNotifIcon();
                window.renderPosts();
            } catch(err) { alert(err.message); }
        }
    });

});
