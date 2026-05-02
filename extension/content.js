class UniversalBrowserAssistant {
  constructor() {
    this.createWidget();
    this.applyDynamicTheme();
  }

  async createWidget() {
    const container = document.createElement("div");
    container.id = "uba-widget-container";
    container.style.position = "fixed";
    container.style.bottom = "20px";
    container.style.right = "20px";
    container.style.zIndex = "2147483647"; 
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "flex-end";
    
    this.shadowRoot = container.attachShadow({ mode: "open" });
    
    const linkElem = document.createElement("link");
    linkElem.setAttribute("rel", "stylesheet");
    linkElem.setAttribute("href", chrome.runtime.getURL("widget/style.css"));
    this.shadowRoot.appendChild(linkElem);

    try {
      const resp = await fetch(chrome.runtime.getURL("widget/index.html"));
      const htmlText = await resp.text();
      
      const wrapper = document.createElement("div");
      wrapper.innerHTML = htmlText;
      this.shadowRoot.appendChild(wrapper);

      if (typeof window.initUbaWidget === 'function') {
        window.initUbaWidget(this.shadowRoot);
      }
    } catch (e) {
      console.error("Failed to inject UBA Widget:", e);
    }
    
    document.body.appendChild(container);
  }

  applyDynamicTheme() {
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    document.documentElement.style.setProperty("--uba-page-bg", bodyBg);
  }
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new UniversalBrowserAssistant());
} else {
  new UniversalBrowserAssistant();
}
