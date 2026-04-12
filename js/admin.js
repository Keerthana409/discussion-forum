document.addEventListener('DOMContentLoaded', () => {
    if(!document.getElementById('admin-section')) return;

    window.renderAdminPanel = async () => {
        const queueContainer = document.getElementById('report-queue-container');
        const allContainer = document.getElementById('manage-posts-table');
        
        let stats, usages, rawPosts, users;
        try {
            const data = await window.api.request('/admin/stats');
            stats = data.stats;
            usages = data.usages;
            rawPosts = data.rawPosts;
            users = data.users;
        } catch(e) {
            console.error(e);
            return;
        }

        const posts = rawPosts || [];
        
        // 1. Dashboard Stats
        if(document.getElementById('stat-posts')) document.getElementById('stat-posts').innerText = stats.totalPosts;
        if(document.getElementById('stat-spam')) document.getElementById('stat-spam').innerText = stats.spamPosts;
        if(document.getElementById('stat-removed')) document.getElementById('stat-removed').innerText = stats.removedPosts;
        if(document.getElementById('stat-reported')) document.getElementById('stat-reported').innerText = stats.reportedPosts;
        if(document.getElementById('stat-suspicious')) document.getElementById('stat-suspicious').innerText = stats.suspiciousUsers;
        
        // 2. Report Queue
        if(queueContainer) {
            queueContainer.innerHTML = '';
            const queuePosts = posts.filter(p => p.hasReport || p.status === 'under review' || p.status === 'spam');
            if(queuePosts.length === 0) {
                queueContainer.innerHTML = `<div style="padding: 1rem; color: var(--text-muted); text-align: center; border: 1px dashed var(--border-color); border-radius: var(--radius);">No posts currently under review. 🎉</div>`;
            } else {
                queuePosts.forEach(post => {
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.style.borderLeft = "4px solid var(--warning)";
                    const reasonSnippet = post.hasReport ? `<div style="margin-bottom: 0.5rem; background: rgba(255, 211, 0, 0.1); padding: 0.5rem; border-radius: 4px; font-size: 0.85rem;"><strong>Report Reason:</strong> ${post.reportReason || 'N/A'}</div>` : '';
                    
                    const isToxic = /hate|kill|scam|abuse|fraud|jerk|loser/i.test(post.title + ' ' + post.content);
                    const isSuspiciousUser = users.find(u => u.username === post.author)?.isSuspicious;
                    
                    let smartModHtml = '<div style="margin-bottom: 0.5rem; display:flex; gap:0.5rem; flex-wrap:wrap;">';
                    smartModHtml += `<span class="badge ${post.spamScore > 3 ? 'badge-danger' : 'badge-success'}">Spam Prob: ${post.spamScore || 0}</span>`;
                    if(isToxic) smartModHtml += `<span class="badge badge-danger">Toxic Content</span>`;
                    if(isSuspiciousUser) smartModHtml += `<span class="badge badge-warning" style="color:#000;">Suspicious User</span>`;
                    smartModHtml += '</div>';

                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items:flex-start; flex-wrap: wrap; gap: 1rem;">
                            <div style="flex: 1; min-width: 250px;">
                                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.3rem;">
                                    <strong>u/${post.author}</strong> - ${new Date(post.timestamp).toLocaleString()}
                                </div>
                                <h4 style="color: var(--text-dark); margin-bottom: 0.5rem;" >${post.title}</h4>
                                <p style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-dark);">${post.content}</p>
                                ${reasonSnippet}
                                ${smartModHtml}
                            </div>
                            <div style="display: flex; flex-direction:column; gap: 0.5rem;">
                                <button class="btn btn-success btn-sm approve-btn" data-id="${post._id}"><i class="fa-solid fa-check"></i> Mark Safe / Ignore</button>
                                <button class="btn btn-warning btn-sm warn-btn" data-author="${post.author}"><i class="fa-solid fa-triangle-exclamation"></i> Warn User</button>
                                <button class="btn btn-danger btn-sm remove-btn" data-id="${post._id}"><i class="fa-solid fa-xmark"></i> Remove</button>
                            </div>
                        </div>
                    `;
                    queueContainer.appendChild(card);
                });
            }
        }

        // 3. Manage All Posts
        if(allContainer) {
            allContainer.innerHTML = '';
            
            const filterSelect = document.getElementById('admin-post-filter');
            const currentFilter = filterSelect ? filterSelect.value : 'all';
            
            let filteredPosts = posts;
            if(currentFilter !== 'all') {
                filteredPosts = posts.filter(p => p.status === currentFilter);
            }

            if(filteredPosts.length === 0) {
                allContainer.innerHTML = `<div class="empty-state" style="padding: 1rem; color: var(--text-muted); text-align: center;">No posts match this filter.</div>`;
            } else {
                filteredPosts.forEach(post => {
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.style.padding = "0.8rem";
                    
                    let statusLabel = '';
                    if (post.status === 'spam') {
                         statusLabel = `<span class="badge badge-danger">Spam</span>`;
                    } else if (post.status === 'duplicate') {
                         statusLabel = `<span class="badge badge-danger">Duplicate</span>`;
                    } else if (post.status === 'similar') {
                         statusLabel = `<span class="badge badge-warning" style="color:#000;">Similar</span>`;
                    } else if (post.status === 'under review') {
                         statusLabel = `<span class="badge badge-warning" style="color:#000;">Under Review</span>`;
                    } else if (post.status === 'removed') {
                         statusLabel = `<span class="badge badge-danger">Removed</span>`;
                    } else {
                         statusLabel = `<span class="badge" style="background:transparent; color: var(--text-muted); border: 1px solid var(--border-color);">Safe</span>`;
                    }

                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items:flex-start;">
                            <div>
                                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.3rem;">
                                    <strong>u/${post.author}</strong> - Score: ${post.spamScore || 0}
                                </div>
                                <h4 style="color: var(--text-dark); margin-bottom: 0.2rem;" >${post.title}</h4>
                                <div style="margin-top: 0.5rem">${statusLabel}</div>
                            </div>
                            <div style="display:flex; gap:0.5rem;">
                                ${post.status === 'removed' ? `<button class="btn btn-success btn-sm restore-btn" data-id="${post._id}"><i class="fa-solid fa-rotate-left"></i> Restore</button>` : `<button class="btn btn-outline btn-sm remove-btn" data-id="${post._id}" style="border-color: var(--danger); color: var(--danger);"><i class="fa-solid fa-trash"></i></button>`}
                                <button class="btn btn-outline btn-sm pin-btn" data-id="${post._id}" style="border-color: var(--warning); color: var(--warning);">${post.isPinned ? 'Unpin' : 'Pin'}</button>
                            </div>
                        </div>
                    `;
                    allContainer.appendChild(card);
                });
            }
        }

        // Render Daily Usage Analytics
        const usageContainer = document.getElementById('usage-analytics-container');
        if(usageContainer) {
            usageContainer.innerHTML = '';
            
            const usageData = {};
            usages.forEach(u => {
                if(!usageData[u.date]) usageData[u.date] = [];
                usageData[u.date].push({user: u.username, mins: u.timeSpent});
            });

            const dates = Object.keys(usageData).sort();
            if(dates.length === 0) {
                usageContainer.innerHTML = `<div style="padding: 1rem; color: var(--text-muted); text-align: center;">No usage data tracked yet.</div>`;
            } else {
                dates.forEach(date => {
                    let totalMins = usageData[date].reduce((sum, item) => sum + item.mins, 0);
                    usageContainer.innerHTML += `
                        <div class="usage-list-item">
                            <strong style="color: var(--text-dark);">${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</strong>
                            <span style="color: var(--primary-color); font-weight: 600;">${totalMins} mins total</span>
                        </div>
                    `;
                });
            }
        }

        // Action Listeners
        const handleAdminPatch = async (id, action) => {
            try {
                await window.api.request(`/admin/post/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ action })
                });
                window.renderAdminPanel();
                if(window.renderPosts) window.renderPosts();
            } catch(e) { alert(e.message); }
        }

        document.querySelectorAll('.warn-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                alert(`Warning sent to u/${e.currentTarget.getAttribute('data-author')}`);
            });
        });

        document.querySelectorAll('.restore-btn').forEach(btn => {
            btn.addEventListener('click', (e) => handleAdminPatch(e.currentTarget.dataset.id, 'restore'));
        });

        document.querySelectorAll('.pin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => handleAdminPatch(e.currentTarget.dataset.id, 'pin'));
        });

        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', (e) => handleAdminPatch(e.currentTarget.dataset.id, 'safe'));
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(!confirm('Are you sure you want to remove this post?')) return;
                handleAdminPatch(e.currentTarget.dataset.id, 'remove');
            });
        });
        
        // Filter changes
        const filterSelect = document.getElementById('admin-post-filter');
        if(filterSelect && !filterSelect.dataset.listener) {
             filterSelect.dataset.listener = "true";
             filterSelect.addEventListener('change', window.renderAdminPanel);
        }
    };
});
