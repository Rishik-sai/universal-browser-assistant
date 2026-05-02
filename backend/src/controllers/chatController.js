const agentPipeline = require('../services/agentPipeline');

exports.handleChat = async (req, res) => {
  try {
    const { message, url, sessionId, language, pageText, domSnapshot } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userId = req.user.id;
    const response = await agentPipeline.processMessage(message, url, sessionId || userId, language, pageText, domSnapshot);

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
};

exports.handleTranslateBulk = async (req, res) => {
  try {
    const { texts, targetLanguage } = req.body;
    if (!texts || !targetLanguage) {
      return res.status(400).json({ error: 'Texts and targetLanguage are required' });
    }
    const translations = await agentPipeline.translateBulk(texts, targetLanguage);
    res.json({ success: true, translations });
  } catch (error) {
    console.error('Translate bulk error:', error);
    res.status(500).json({ success: false, error: 'Failed to translate' });
  }
};
