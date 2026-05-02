function getAllInteractiveElements(root = document) {
  let elements = [];
  
  // 1. Get elements in the current root
  const currentLevel = root.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [aria-label]');
  elements = elements.concat(Array.from(currentLevel));
  
  // 2. Find all shadow hosts in the current root
  const allElements = root.querySelectorAll('*');
  allElements.forEach(el => {
    if (el.shadowRoot) {
      // Recursive call for shadow root
      elements = elements.concat(getAllInteractiveElements(el.shadowRoot));
    }
  });
  
  return elements;
}

// Example usage to build a snapshot string
function buildSnapshot() {
  const all = getAllInteractiveElements();
  return all.map(el => {
    const tag = el.tagName.toLowerCase();
    const text = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.title || '').trim().substring(0, 50);
    return `[${tag}] "${text}"`;
  }).join('\n');
}

console.log("Found interactive elements across all shadow roots:", getAllInteractiveElements().length);
