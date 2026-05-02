const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const chatRoutes = require('./src/routes/chatRoutes');
const authRoutes = require('./src/routes/authRoutes');
const historyRoutes = require('./src/routes/historyRoutes');
const auth = require('./src/middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/chat', auth, chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/history', auth, historyRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Universal Browser Assistant API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
