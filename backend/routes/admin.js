const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');
const Usage = require('../models/Usage');

// Middleware to check admin Role
const adminAuth = (req, res, next) => {
    if(req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }
    next();
};

router.get('/stats', auth, adminAuth, async (req, res) => {
    try {
        const posts = await Post.find();
        const users = await User.find();
        const usages = await Usage.find();

        const stats = {
            totalPosts: posts.length,
            spamPosts: posts.filter(p => p.status === 'spam').length,
            removedPosts: posts.filter(p => p.status === 'removed').length,
            reportedPosts: posts.filter(p => p.hasReport || p.status === 'under review').length,
            suspiciousUsers: users.filter(u => u.isSuspicious).length
        };

        // Get basic user info for suspicious list if needed
        const usersInfo = users.map(u => ({ username: u.username, isSuspicious: u.isSuspicious }));

        res.json({ stats, usages, users: usersInfo, rawPosts: posts });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.patch('/post/:id', auth, adminAuth, async (req, res) => {
    try {
        const { action } = req.body; 
        let post = await Post.findById(req.params.id);
        if(!post) return res.status(404).json({ msg: 'Post not found' });

        if(action === 'safe' || action === 'restore') {
            post.status = 'safe';
            post.hasReport = false;
        } else if(action === 'remove') {
            post.status = 'removed';
        } else if(action === 'pin') {
            post.isPinned = !post.isPinned;
        }

        await post.save();
        res.json(post);
    } catch(err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
