const History = require('../models/History');

// POST /api/history/save
exports.saveHistory = async (req, res) => {
  // User is already attached to req by auth middleware
  const user = req.user;

  try {
    const { domain, query, response, mode } = req.body;
    if (!domain || !query) return res.status(400).json({ error: 'domain and query required' });

    const entry = await History.create({
      userId: user.id,
      email: user.email,
      domain,
      query,
      response: response || '',
      mode: mode || 'QUERY_MODE'
    });
    res.json({ success: true, entry });
  } catch (err) {
    console.error('Save history error:', err);
    res.status(500).json({ error: 'Failed to save history' });
  }
};

// GET /api/history/:domain
exports.getHistory = async (req, res) => {
  // User is already attached to req by auth middleware
  const user = req.user;

  try {
    const { domain } = req.params;
    const entries = await History.find({ userId: user.id, domain })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();
    res.json({ success: true, history: entries });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};
