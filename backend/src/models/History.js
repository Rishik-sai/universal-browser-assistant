const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  query: {
    type: String,
    required: true
  },
  response: {
    type: String,
    default: ''
  },
  mode: {
    type: String,
    default: 'QUERY_MODE'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for fast lookups by user + domain
HistorySchema.index({ userId: 1, domain: 1, timestamp: -1 });

module.exports = mongoose.model('History', HistorySchema);
