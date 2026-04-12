const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');

const calculateSpamScore = (text) => {
    let score = 0;
    const lowerText = text.toLowerCase();
    const keywords = ['buy now', 'free', 'click here'];
    keywords.forEach(word => { if (lowerText.includes(word)) score += 2; });
    if (/(http|https|www\.)[^\s]+/i.test(text)) score += 3;
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length - 2; i++) {
        if (words[i] !== "" && words[i] === words[i+1] && words[i+1] === words[i+2]) {
            score += 2; break;
        }
    }
    const upperCount = (text.match(/[A-Z]/g) || []).length;
    const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (alphaCount > 5 && (upperCount / alphaCount) > 0.6) score += 2;
    return score;
};

const calculateSimilarity = (newText, oldText) => {
    const s1 = newText.toLowerCase().split(/\W+/).filter(w=>w.length>2);
    const s2 = oldText.toLowerCase().split(/\W+/).filter(w=>w.length>2);
    if(s1.length === 0 || s2.length === 0) return 0;
    const intersection = s1.filter(x => s2.includes(x));
    const unique = new Set([...s1, ...s2]);
    return (intersection.length / unique.size) * 100;
};

const checkBadWords = (text) => /hate|kill|scam|abuse|fraud|jerk|loser/i.test(text);

router.get('/', async (req, res) => {
    try {
        const posts = await Post.find().sort({ timestamp: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const { title, content, tags, image } = req.body;
        const allPosts = await Post.find();
        
        const fullText = title + " " + content;
        let maxSimilarity = 0;
        
        allPosts.forEach(p => {
            const sim = calculateSimilarity(fullText, p.title + " " + p.content);
            if(sim > maxSimilarity) maxSimilarity = sim;
        });

        const spamScore = calculateSpamScore(fullText);
        const hasBadWords = checkBadWords(fullText);

        let finalStatus = 'safe';
        if (spamScore > 3 || hasBadWords) {
            finalStatus = 'spam';
        } else if (maxSimilarity > 80) {
            finalStatus = 'duplicate';
        } else if (maxSimilarity > 60) {
            finalStatus = 'similar';
        }

        const newPost = new Post({
            title, content, tags, image,
            author: req.user.username,
            spamScore,
            status: finalStatus
        });

        const post = await newPost.save();
        res.json(post);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});

// Vote
router.post('/:id/vote', auth, async (req, res) => {
    try {
        const type = req.body.type;
        let post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });

        if (post.upvoters.includes(req.user.username) || post.downvoters.includes(req.user.username)) {
            return res.status(400).json({ msg: 'Already voted' });
        }

        let user = await User.findById(req.user.id);
        if(!user) user = { reputation: 0 }; 

        let rep = parseInt(user.reputation || 0);
        let weight = Math.max(1, Math.floor(Math.log(rep + 1)));

        if (type === 'up') {
            post.likes += weight;
            post.upvoters.push(req.user.username);
            
            if(post.author !== 'Administrator') {
                await User.findOneAndUpdate({ username: post.author }, { $inc: { reputation: 1 } });
            }
        } else {
            post.dislikes += weight;
            post.downvoters.push(req.user.username);
        }

        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Reaction
router.post('/:id/react', auth, async (req, res) => {
    try {
        const type = req.body.type;
        let post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });
        
        if(!post.reactions) post.reactions = {fire:0, laugh:0};
        post.reactions[type] = (post.reactions[type] || 0) + 1;
        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Comment generic recursive append
router.post('/:id/comment', auth, async (req, res) => {
    try {
        const { content, targetCommentId } = req.body;
        let post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });

        const newComment = { id: Date.now().toString() + Math.random(), author: req.user.username, content, timestamp: new Date(), replies: [] };

        if (!targetCommentId) {
            post.comments.push(newComment);
        } else {
            const insertReply = (commentsArr, targetId, reply) => {
                for (let c of commentsArr) {
                    if (c.id === targetId) {
                        if (!c.replies) c.replies = [];
                        c.replies.push(reply);
                        return true;
                    }
                    if (c.replies && insertReply(c.replies, targetId, reply)) return true;
                }
                return false;
            };
            insertReply(post.comments, targetCommentId, newComment);
        }
        
        post.markModified('comments'); 
        await post.save();
        res.json(post);
    } catch(err) {
        res.status(500).send('Server Error');
    }
});

// Report
router.post('/:id/report', auth, async (req, res) => {
    try {
        let post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });

        post.hasReport = true;
        post.reportReason = req.body.reason || "No reason provided";
        post.status = 'under review';

        await post.save();
        res.json(post);
    } catch(err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
