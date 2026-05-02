window.initUbaWidget = function (shadowRoot) {
  const triggerBtn = shadowRoot.getElementById('uba-trigger-btn');
  const chatWindow = shadowRoot.getElementById('uba-chat-window');
  const closeBtn = shadowRoot.getElementById('uba-close-btn');

  // Tabs
  const tabChat = shadowRoot.getElementById('uba-tab-chat');
  const tabHistory = shadowRoot.getElementById('uba-tab-history');
  const tabSettings = shadowRoot.getElementById('uba-tab-settings');

  // Views
  const viewChat = shadowRoot.getElementById('uba-view-chat');
  const viewHistory = shadowRoot.getElementById('uba-view-history');
  const viewSettings = shadowRoot.getElementById('uba-view-settings');

  // Chat Elements
  const inputField = shadowRoot.getElementById('uba-input-field');
  const sendBtn = shadowRoot.getElementById('uba-send-btn');
  const messagesArea = shadowRoot.getElementById('uba-messages');
  const voiceBtn = shadowRoot.getElementById('uba-voice-btn');
  const suggestionsContainer = shadowRoot.getElementById('uba-suggestions');

  // State
  let recognition = null;
  let isRecording = false;
  let voiceEnabled = false; // Default OFF as requested

  // UI Translations
  const UI_STRINGS = {
    auto: { greeting: "Hello! I can help you understand this page. How can I help you?", placeholder: "Type a message...", settings: "Settings", history: "History", theme: "Theme", language: "Language", voice: "Voice Interaction", login: "Login", historyEmpty: "No previous conversations on this site.", historyTitle: "History (This Website)" },
    English: { greeting: "Hello! I can help you understand this page. How can I help you?", placeholder: "Type a message...", settings: "Settings", history: "History", theme: "Theme", language: "Language", voice: "Voice Interaction", login: "Login", historyEmpty: "No previous conversations on this site.", historyTitle: "History (This Website)" },
    Hindi: { greeting: "नमस्ते! मैं इस पेज को समझने में आपकी मदद कर सकता हूँ।", placeholder: "संदेश लिखें...", settings: "सेटिंग्स", history: "इतिहास", theme: "थीम", language: "भाषा", voice: "आवाज़ बातचीत", login: "लॉगिन", historyEmpty: "इस साइट पर कोई बातचीत नहीं।", historyTitle: "इतिहास (यह वेबसाइट)" },
    Telugu: { greeting: "నమస్కారం! ఈ పేజీని అర్థం చేసుకోవడంలో నేను సహాయం చేయగలను.", placeholder: "సందేశం టైప్ చేయండి...", settings: "సెట్టింగ్‌లు", history: "చరిత్ర", theme: "థీమ్", language: "భాష", voice: "వాయిస్ ఇంటరాక్షన్", login: "లాగిన్", historyEmpty: "ఈ సైట్‌లో మునుపటి సంభాషణలు లేవు.", historyTitle: "చరిత్ర (ఈ వెబ్‌సైట్)" },
    Tamil: { greeting: "வணக்கம்! இந்தப் பக்கத்தைப் புரிந்துகொள்ள நான் உங்களுக்கு உதவ முடியும்.", placeholder: "செய்தியைத் தட்டச்சு செய்க...", settings: "அமைப்புகள்", history: "வரலாறு", theme: "தீம்", language: "மொழி", voice: "குரல் தொடர்பு", login: "உள்நுழை", historyEmpty: "இங்கே உரையாடல்கள் எதுவும் இல்லை.", historyTitle: "வரலாறு" },
    Bengali: { greeting: "নমস্কার! আমি আপনাকে এই পৃষ্ঠাটি বুঝতে সাহায্য করতে পারি।", placeholder: "বার্তা টাইপ করুন...", settings: "সেটিংস", history: "ইতিহাস", theme: "থিম", language: "ভাষা", voice: "ভয়েস ইন্টারঅ্যাকশন", login: "লগইন", historyEmpty: "কোনো পূর্ববর্তী কথোপকথন নেই।", historyTitle: "ইতিহাস" },
    Marathi: { greeting: "नमस्कार! मी तुम्हाला हे पान समजून घेण्यास मदत करू शकतो।", placeholder: "संदेश टाइप करा...", settings: "सेटिंग्ज", history: "इतिहास", theme: "थीम", language: "भाषा", voice: "व्हॉइस संवाद", login: "लॉगिन", historyEmpty: "कोणताही इतिहास नाही।", historyTitle: "इतिहास" },
    Kannada: { greeting: "ನಮಸ್ಕಾರ! ಈ ಪುಟವನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ।", placeholder: "ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ...", settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", history: "ಇತಿಹಾಸ", theme: "ಥೀಮ್", language: "ಭಾಷೆ", voice: "ಧ್ವನಿ ಸಂವಹನ", login: "ಲಾಗಿನ್", historyEmpty: "ಯಾವುದೇ ಇತಿಹಾಸವಿಲ್ಲ।", historyTitle: "ಇತಿಹಾಸ" },
    Malayalam: { greeting: "നമസ്കാരം! ഈ പേജ് മനസ്സിലാക്കാൻ ഞാൻ നിങ്ങളെ സഹായിക്കാം।", placeholder: "സന്ദേശം ടൈപ്പ് ചെയ്യുക...", settings: "ക്രമീകരണങ്ങൾ", history: "ചരിത്രം", theme: "തീം", language: "ഭാഷ", voice: "വോയ്‌സ് ഇൻ്ററാക്ഷൻ", login: "ലോഗിൻ", historyEmpty: "ചരിത്രം ലഭ്യമല്ല।", historyTitle: "ചരിത്രം" },
    Gujarati: { greeting: "નમસ્તે! હું તમને આ પૃષ્ઠ સમજવામાં મદદ કરી શકું છું।", placeholder: "સંદેશ લખો...", settings: "સેટિંગ્સ", history: "ઇતિહાસ", theme: "થીમ", language: "ભાષા", voice: "વૉઇસ ઇન્ટરેક્શન", login: "લોગિન", historyEmpty: "કોઈ ઇતિહાસ નથી।", historyTitle: "ઇતિહાસ" },
    Punjabi: { greeting: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਇਸ ਪੰਨੇ ਨੂੰ ਸਮਝਣ ਵਿੱਚ ਤੁਹਾਡੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ।", placeholder: "ਸੁਨੇਹਾ ਲਿਖੋ...", settings: "ਸੈਟਿੰਗਾਂ", history: "ਇਤਿಹಾಸ", theme: "ਥੀਮ", language: "ਭਾਸ਼ਾ", voice: "ਵੌਇਸ ਇੰਟਰੈਕਸ਼ਨ", login: "ਲੌਗਿਨ", historyEmpty: "ਕੋਈ ਇਤਿਹਾਸ ਨਹੀਂ।", historyTitle: "ਇਤਿಹಾಸ" }
  };

  function applyUILanguage(lang) {
    const s = UI_STRINGS[lang] || UI_STRINGS.auto;
    const firstBubble = shadowRoot.getElementById('uba-greeting-bubble');
    if (firstBubble) firstBubble.textContent = s.greeting;

    const h3 = shadowRoot.querySelector('.uba-header-title h3');
    if (h3) h3.textContent = 'Browser Assistant';

    const settingsTitle = shadowRoot.querySelector('#uba-view-settings .uba-view-title');
    if (settingsTitle) settingsTitle.textContent = s.settings;
    const historyTitle = shadowRoot.querySelector('#uba-view-history .uba-view-title');
    if (historyTitle) historyTitle.textContent = s.historyTitle;

    const settingLabels = shadowRoot.querySelectorAll('.uba-setting-item > label:first-child');
    const labelTexts = [s.language, s.theme, s.voice];
    settingLabels.forEach((lbl, i) => { if (labelTexts[i]) lbl.textContent = labelTexts[i]; });
  }

  // Toggle Window
  triggerBtn.addEventListener('click', () => {
    chatWindow.classList.remove('uba-hidden');
    triggerBtn.style.display = 'none';
    if (currentUser) loadHistory();

    const messageCount = messagesArea.querySelectorAll('.uba-message').length;
    if (messageCount <= 1) loadProactiveSuggestions();

    // Highlight-to-Ask Contextual Feature
    const selection = window.getSelection().toString().trim();
    if (selection) {
      inputField.value = `[WEB_SEARCH] Explain this: "${selection}"`;
      inputField.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    chatWindow.classList.add('uba-hidden');
    triggerBtn.style.display = 'flex';
  });

  // Keyboard Shortcut: Ctrl + Shift + A to open
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      if (chatWindow.classList.contains('uba-hidden')) {
        triggerBtn.click();
      }
    }
  });

  // Tab switching
  function switchTab(activeBtn, activeView) {
    [tabChat, tabHistory, tabSettings].forEach(b => b.classList.remove('active'));
    [viewChat, viewHistory, viewSettings].forEach(v => {
      v.classList.remove('active');
      v.classList.add('uba-hidden');
    });
    activeBtn.classList.add('active');
    activeView.classList.remove('uba-hidden');
    activeView.classList.add('active');
  }

  tabChat.addEventListener('click', () => switchTab(tabChat, viewChat));
  tabHistory.addEventListener('click', () => switchTab(tabHistory, viewHistory));
  tabSettings.addEventListener('click', () => switchTab(tabSettings, viewSettings));

  // Voice Interaction Toggle Logic
  const voiceToggleProxy = shadowRoot.getElementById('uba-voice-toggle-proxy');
  voiceToggleProxy.addEventListener('change', (e) => {
    voiceEnabled = e.target.checked;
    if (voiceEnabled) {
      voiceBtn.classList.remove('uba-hidden');
    } else {
      voiceBtn.classList.add('uba-hidden');
      stopRecording();
    }
  });

  function appendMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `uba-message ${isUser ? 'user' : 'bot'}`;
    const bubble = document.createElement('div');
    bubble.className = 'uba-bubble';

    if (isUser) {
      bubble.textContent = text;
    } else {
      bubble.innerHTML = formatRichText(text);
    }
    msgDiv.appendChild(bubble);
    messagesArea.appendChild(msgDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  function formatRichText(text) {
    if (!text) return "";
    let safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Premium Step Detection (Handles numbers, bullets, and multilingual prefixes)
    safe = safe.replace(/^\s*(\d+)[\.\)\-\:]\s*(.+)$/gm, '<div class="uba-step-row"><span class="uba-step-badge">$1</span><span class="uba-step-text">$2</span></div>');

    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
    safe = safe.replace(/\n/g, '<br>');
    return safe;
  }

  async function sendMessage() {
    const text = inputField.value.trim();
    if (!text) return;

    appendMessage(text, true);
    inputField.value = '';
    saveToHistory('user', text);

    const languageSelect = shadowRoot.getElementById('uba-language-select');
    const overrideLang = languageSelect ? languageSelect.value : 'auto';
    const pageText = document.body.innerText.substring(0, 3000);

    chrome.runtime.sendMessage(
      {
        action: "sendMessage",
        payload: {
          message: text,
          url: window.location.href,
          language: overrideLang,
          pageText
        }
      },
      (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          appendMessage("Sorry, I'm having trouble connecting right now.");
        } else {
          const resData = response.data?.data || response.data;
          const replyText = resData?.reply;
          const suggestions = resData?.suggestions || [];

          if (replyText) {
            appendMessage(replyText);
            renderSuggestions(suggestions);
            if (voiceEnabled) speakText(replyText);
            saveToHistory('bot', replyText);
          }
        }
      }
    );
  }

  async function loadProactiveSuggestions() {
    const languageSelect = shadowRoot.getElementById('uba-language-select');
    const overrideLang = languageSelect ? languageSelect.value : 'auto';
    const pageText = document.body.innerText.substring(0, 2000);

    chrome.runtime.sendMessage(
      {
        action: "sendMessage",
        payload: {
          message: "[INIT_SUGGESTIONS]",
          url: window.location.href,
          language: overrideLang,
          pageText
        }
      },
      (response) => {
        if (response && response.success) {
          const suggestions = response.data?.data?.suggestions || response.data?.suggestions || [];
          renderSuggestions(suggestions);
        }
      }
    );
  }

  function renderSuggestions(suggestions) {
    suggestionsContainer.innerHTML = '';
    if (!suggestions || suggestions.length === 0) {
      suggestionsContainer.classList.add('uba-hidden');
      return;
    }
    suggestionsContainer.classList.remove('uba-hidden');
    suggestions.forEach(text => {
      const chip = document.createElement('div');
      chip.className = 'uba-suggestion-chip';
      chip.textContent = text;
      chip.addEventListener('click', () => {
        inputField.value = text;
        sendMessage();
      });
      suggestionsContainer.appendChild(chip);
    });
  }

  sendBtn.addEventListener('click', sendMessage);
  inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Voice Input Setup
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.onstart = () => {
      isRecording = true;
      voiceBtn.textContent = '⏹️';
      voiceBtn.classList.add('uba-pulse');
    };
    recognition.onresult = (event) => {
      inputField.value = event.results[0][0].transcript;
      sendMessage();
    };
    recognition.onerror = () => stopRecording();
    recognition.onend = () => stopRecording();
  }

  function stopRecording() {
    if (recognition && isRecording) recognition.stop();
    isRecording = false;
    voiceBtn.textContent = '🎤';
    voiceBtn.classList.remove('uba-pulse');
  }

  voiceBtn.addEventListener('click', () => {
    if (!voiceEnabled) return;
    if (isRecording) {
      stopRecording();
    } else {
      if (recognition) recognition.start();
    }
  });

  function speakText(text) {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  shadowRoot.getElementById('uba-language-select')?.addEventListener('change', (e) => applyUILanguage(e.target.value));

  const themeSelect = shadowRoot.getElementById('uba-theme-select');
  themeSelect.addEventListener('change', (e) => {
    chatWindow.classList.remove('theme-dark', 'theme-light');
    if (e.target.value !== 'default') chatWindow.classList.add(`theme-${e.target.value}`);
  });

  // Auth & History (Simplified)
  let currentUser = null;
  const pageDomain = window.location.hostname;

  function loadHistory() {
    if (!currentUser) return;
    chrome.runtime.sendMessage({ action: "loadHistory", domain: pageDomain }, (res) => {
      const list = shadowRoot.getElementById('uba-history-list');
      list.innerHTML = '';
      if (!res?.history?.length) {
        list.innerHTML = '<p class="uba-empty-text">No previous conversations.</p>';
        return;
      }
      res.history.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'uba-history-item';

        const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        item.innerHTML = `
          <div class="uba-history-content">
            <span class="uba-history-text" title="${entry.query}">${entry.query}</span>
            <span class="uba-history-time">${time}</span>
          </div>
          <span class="uba-history-icon">💬</span>
        `;
        item.addEventListener('click', () => {
          inputField.value = entry.query;
          switchTab(tabChat, viewChat);
        });
        list.appendChild(item);
      });
    });
  }

  function saveToHistory(role, text) {
    if (!currentUser || role !== 'bot') return;
    const userMsgs = shadowRoot.querySelectorAll('.uba-message.user .uba-bubble');
    const lastUserMsg = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].textContent : '[Interaction]';
    chrome.runtime.sendMessage({
      action: "saveHistory",
      payload: { domain: pageDomain, query: lastUserMsg, response: text, mode: 'QUERY_MODE' }
    });
  }

  chrome.runtime.sendMessage({ action: "getAuthState" }, (res) => {
    if (res?.loggedIn) {
      currentUser = res.user;
      shadowRoot.getElementById('uba-user-email').textContent = res.user.email;
      shadowRoot.getElementById('uba-user-info').classList.remove('uba-hidden');
      shadowRoot.getElementById('uba-auth-form').classList.add('uba-hidden');
    }
  });

  const emailInput = shadowRoot.getElementById('uba-email-input');
  const passwordInput = shadowRoot.getElementById('uba-password-input');
  const authError = shadowRoot.getElementById('uba-auth-error');

  function handleAuth(action) {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
      authError.textContent = 'Email and password are required.';
      return;
    }
    
    authError.textContent = 'Processing...';
    
    chrome.runtime.sendMessage(
      { action, payload: { email, password } },
      (res) => {
        if (res && res.success) {
          authError.textContent = '';
          location.reload(); // Reload to apply new state
        } else {
          authError.textContent = res?.error || 'Authentication failed.';
        }
      }
    );
  }

  shadowRoot.getElementById('uba-login-btn').addEventListener('click', () => handleAuth('login'));
  shadowRoot.getElementById('uba-register-btn').addEventListener('click', () => handleAuth('register'));

  shadowRoot.getElementById('uba-logout-btn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "logout" }, () => location.reload());
  });

  // ─── Language Translation Overlay Logic ─── 
  let originalTextMap = new Map();
  const translateBtn = shadowRoot.getElementById('uba-translate-page-btn');
  const restoreBtn = shadowRoot.getElementById('uba-restore-page-btn');

  function scanTextNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let node;
    while (node = walker.nextNode()) {
      const parent = node.parentElement;
      // Skip scripts, styles, and our own widget
      if (parent &&
        parent.tagName !== 'SCRIPT' &&
        parent.tagName !== 'STYLE' &&
        !parent.closest('#uba-widget-container')) {
        const val = node.nodeValue.trim();
        if (val.length > 1) nodes.push({ node, original: node.nodeValue });
      }
    }
    return nodes;
  }

  async function translatePage() {
    const languageSelect = shadowRoot.getElementById('uba-language-select');
    const targetLang = languageSelect ? languageSelect.value : 'auto';

    if (targetLang === 'auto' || targetLang === 'English') {
      alert("Please select a regional Indian language (e.g., Hindi, Telugu) in Settings first!");
      return;
    }

    translateBtn.textContent = "⏳ Processing...";
    translateBtn.disabled = true;

    const nodesToTranslate = scanTextNodes();
    const batchSize = 20;
    const totalBatches = Math.ceil(nodesToTranslate.length / batchSize);

    console.log(`[UBA] Found ${nodesToTranslate.length} nodes to translate.`);

    for (let i = 0; i < nodesToTranslate.length; i += batchSize) {
      const batch = nodesToTranslate.slice(i, i + batchSize);
      const texts = batch.map(n => n.original);

      const progress = Math.round(((i / batchSize) + 1) / totalBatches * 100);
      translateBtn.textContent = `⏳ ${progress}% Done...`;

      try {
        const res = await new Promise(resolve => {
          chrome.runtime.sendMessage({
            action: "translateBulk",
            payload: { texts, targetLanguage: targetLang }
          }, resolve);
        });

        if (res && res.success && res.translations) {
          batch.forEach((item, idx) => {
            if (res.translations[idx] && item.node.isConnected) {
              if (!originalTextMap.has(item.node)) {
                originalTextMap.set(item.node, item.original);
              }
              item.node.nodeValue = res.translations[idx];
            }
          });
        }
      } catch (e) {
        console.error("Batch translation error:", e);
      }
    }

    translateBtn.textContent = "🌐 Translate Page";
    translateBtn.disabled = false;
    restoreBtn.classList.remove('uba-hidden');
  }

  function restorePage() {
    originalTextMap.forEach((original, node) => {
      node.nodeValue = original;
    });
    originalTextMap.clear();
    restoreBtn.classList.add('uba-hidden');
  }

  translateBtn?.addEventListener('click', translatePage);
  restoreBtn?.addEventListener('click', restorePage);
}
