const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    reputation: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    isRestricted: { type: Boolean, default: false },
    isSuspicious: { type: Boolean, default: false },
    joined: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
