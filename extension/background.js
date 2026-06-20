const BASE_URL = 'https://uba-8or4.onrender.com/api';

chrome.runtime.onInstalled.addListener(() => {
  console.log("Universal Browser Assistant Installed");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // ─── Send Chat to Backend ───
  if (request.action === "sendMessage") {
    chrome.storage.local.get("ubaToken", (data) => {
      if (!data.ubaToken) {
        return sendResponse({ success: false, error: "Please login to chat." });
      }
      fetch(`${BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${data.ubaToken}`
        },
        body: JSON.stringify(request.payload)
      })
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
    });
    return true;
  }

  // ─── Register ───
  if (request.action === "register") {
    fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          chrome.storage.local.set({ ubaToken: data.token, ubaUser: data.user });
        }
        sendResponse(data);
      })
      .catch(() => sendResponse({ success: false, error: "Network error" }));
    return true;
  }

  // ─── Login ───
  if (request.action === "login") {
    fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          chrome.storage.local.set({ ubaToken: data.token, ubaUser: data.user });
        }
        sendResponse(data);
      })
      .catch(() => sendResponse({ success: false, error: "Network error" }));
    return true;
  }

  // ─── Logout ───
  if (request.action === "logout") {
    chrome.storage.local.remove(["ubaToken", "ubaUser"], () => sendResponse({ success: true }));
    return true;
  }

  // ─── Get Auth State ───
  if (request.action === "getAuthState") {
    chrome.storage.local.get(["ubaToken", "ubaUser"], (data) => {
      sendResponse({ loggedIn: !!data.ubaToken, user: data.ubaUser || null, token: data.ubaToken || null });
    });
    return true;
  }

  // ─── Save History ───
  if (request.action === "saveHistory") {
    chrome.storage.local.get("ubaToken", (data) => {
      if (!data.ubaToken) return sendResponse({ success: false });
      fetch(`${BASE_URL}/history/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${data.ubaToken}` },
        body: JSON.stringify(request.payload)
      })
        .then(res => res.json())
        .then(d => sendResponse(d))
        .catch(() => sendResponse({ success: false }));
    });
    return true;
  }

  // ─── Load History ───
  if (request.action === "loadHistory") {
    chrome.storage.local.get("ubaToken", (data) => {
      if (!data.ubaToken) return sendResponse({ success: false, history: [] });
      const domain = encodeURIComponent(request.domain);
      fetch(`${BASE_URL}/history/${domain}`, {
        headers: { "Authorization": `Bearer ${data.ubaToken}` }
      })
        .then(res => res.json())
        .then(d => sendResponse(d))
        .catch(() => sendResponse({ success: false, history: [] }));
    });
    return true;
  }

  // ─── Bulk Translate ───
  if (request.action === "translateBulk") {
    chrome.storage.local.get("ubaToken", (data) => {
      if (!data.ubaToken) return sendResponse({ success: false, error: "Please login." });
      fetch(`${BASE_URL}/chat/translate-bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${data.ubaToken}`
        },
        body: JSON.stringify(request.payload)
      })
        .then(res => res.json())
        .then(d => sendResponse(d))
        .catch(err => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }

  // ─── Execute Action on Page ───
  if (request.action === "executeAction") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
          sendResponse(response);
        });
      } else {
        sendResponse({ success: false, error: "No active tab found" });
      }
    });
    return true;
  }
});
