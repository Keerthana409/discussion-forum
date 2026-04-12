const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Usage = require('../models/Usage');

router.post('/', auth, async (req, res) => {
    try {
        const dateStr = new Date().toISOString().split('T')[0];
        
        let usage = await Usage.findOne({ username: req.user.username, date: dateStr });
        if(usage) {
            usage.timeSpent += 1; 
            await usage.save();
        } else {
            usage = new Usage({ username: req.user.username, date: dateStr, timeSpent: 1 });
            await usage.save();
        }
        res.json({ msg: 'Usage updated', usage });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
