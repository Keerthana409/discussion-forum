const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { type: String, required: true },
    sender: { type: String, required: true },
    type: { type: String, required: true }, // 'comment', 'upvote', 'react', 'admin_spam_alert'
    context: { type: String, required: true }, // Short description e.g. post title
    postId: { type: String },
    isRead: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
