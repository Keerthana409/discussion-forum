const mongoose = require('mongoose');

const usageSchema = new mongoose.Schema({
    username: { type: String, required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    timeSpent: { type: Number, default: 0 } // in minutes
});

module.exports = mongoose.model('Usage', usageSchema);
