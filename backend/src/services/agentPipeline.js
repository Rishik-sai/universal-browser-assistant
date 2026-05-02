const { ChatGroq } = require('@langchain/groq');
const { SystemMessage, HumanMessage, AIMessage } = require('@langchain/core/messages');

// Initialize Memory Storage
const memoryStore = {};

class AgentPipeline {
  constructor() {
    this.model = new ChatGroq({
      model: 'llama-3.1-8b-instant',
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async processMessage(userMessage, urlContext, sessionId, language = 'auto', pageText = '', domSnapshot = '') {
    const isInit = userMessage === '[INIT_SUGGESTIONS]';

    if (!memoryStore[sessionId]) {
      memoryStore[sessionId] = [];
    }

    // Step 1: Handle Initial Suggestions Mode
    if (isInit) {
      const initPrompt = `
        You are a proactive browser assistant. The user just opened your window on this website: ${urlContext}.
        
        === CONTEXT ===
        PAGE TEXT: ${pageText.substring(0, 1500)}
        
        TASK:
        Generate exactly 3 short, localized suggestions for the user to start a conversation about this page.
        Examples: "Summarize this page", "What are the key points?", "Explain this article".
        
        FORMAT:
        SUGGESTIONS: ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
        Return ONLY the suggestions JSON block. No introductory text.
        Target Language: ${language === 'auto' ? 'detect from page' : language}.
      `;

      const response = await this.model.invoke([new HumanMessage(initPrompt)]);
      let suggestions = [];
      if (response.content.includes('SUGGESTIONS:')) {
        try {
          suggestions = JSON.parse(response.content.split('SUGGESTIONS:')[1].trim());
        } catch (e) { }
      }

      return {
        reply: "",
        mode: 'QUERY_MODE',
        suggestions: suggestions,
        url: urlContext
      };
    }

    // Web Search Directive
    let searchDirective = "";
    let cleanMessage = userMessage;
    if (cleanMessage.startsWith('[WEB_SEARCH]')) {
      searchDirective = `\n\n[WEB SEARCH TRIGGERED]\nThe user has explicitly requested to SEARCH THE WEB for the selected text. Act as a search engine and provide a comprehensive, highly accurate, and up-to-date answer from your extensive knowledge base regarding the highlighted query.`;
      cleanMessage = cleanMessage.replace('[WEB_SEARCH]', '').trim();
    }

    // Save regular user message to memory
    memoryStore[sessionId].push(new HumanMessage(cleanMessage));

    // Step 2: Language Directive
    let langDirective = "";
    if (language && language.toLowerCase() !== 'auto') {
      langDirective = `STRICT LANGUAGE RULE: You MUST reply entirely in ${language}.`;
    } else {
      langDirective = `Reply in the user's language. Default to English.`;
    }

    const queryInstruction = `
      MODE: QUERY
      Answer naturally and helpfully based on the page content. 
      Use **bolding** for key terms. 
      
      RULES:
      1. Explain steps clearly using a numbered list (1., 2., 3.).
      2. NEVER ask for permission to proceed or ask "Should I continue?".
      3. You provide information only; you do not perform actions on behalf of the user.
      4. DO NOT ask the user if you should click or type something.
    `;

    const suggestionsInstruction = `
      === SUGGESTIONS AREA ===
      Format: SUGGESTIONS: ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
    `;

    const systemInstruction = `
      You are the Universal Browser Assistant. Helpful, professional, and clear.
      ${langDirective}
      
      === CONTEXT ===
      URL: ${urlContext}
      PAGE TEXT: ${pageText.substring(0, 3000)}
      
      ${queryInstruction}
      ${searchDirective}
      ${suggestionsInstruction}
    `;

    const messages = [
      new SystemMessage(systemInstruction),
      ...memoryStore[sessionId],
      new SystemMessage(`FINAL REMINDER: You are an INFORMATION tool. Never ask for permission to proceed. NEVER say 'Should I continue?'. STRICT RULE: You MUST speak entirely in ${language === 'auto' ? 'the user\'s original language' : language}. Just provide the information.`)
    ];

    const aiResponse = await this.model.invoke(messages);
    let fullContent = aiResponse.content;
    let finalReply = fullContent;
    let suggestions = [];

    if (fullContent.includes('SUGGESTIONS:')) {
      const parts = fullContent.split('SUGGESTIONS:');
      finalReply = parts[0].trim();
      try {
        suggestions = JSON.parse(parts[1].trim());
      } catch (e) { }
    }


    // Save AI response to memory
    memoryStore[sessionId].push(new AIMessage(finalReply));

    return {
      reply: finalReply,
      mode: 'QUERY_MODE',
      suggestions: suggestions,
      url: urlContext
    };
  }

  async translateBulk(texts, targetLanguage) {
    if (!texts || texts.length === 0) return [];

    // Safety check for empty strings
    const cleanTexts = texts.map(t => t.trim() === "" ? " " : t);

    const prompt = `
      You are a professional translator specializing in Indian regional languages. 
      TASK: Translate the following list of strings EXCLUSIVELY into ${targetLanguage}.
      
      CRITICAL RULES:
      1. Maintain exactly the same order.
      2. Separate each translation with the delimiter " ||| ".
      3. Example: Translation 1 ||| Translation 2 ||| Translation 3
      4. Do NOT add any conversational text, introductory text, or explanation. 
      5. Do NOT use JSON formatting, just the delimited list.

      INPUT LIST:
      ${cleanTexts.join('\n')}
    `;

    try {
      const response = await this.model.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      const parts = content.split('|||').map(s => s.trim());

      // If AI failed the delimiter but provided rows
      if (parts.length < texts.length) {
        return content.split('\n').map(s => s.trim().replace(/^\d+\.\s*/, ''));
      }

      return parts;
    } catch (e) {
      console.error("Bulk Translation Error:", e);
      return texts;
    }
  }
}

module.exports = new AgentPipeline();
