/**
 * Shared utility: show a brief toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'success') {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  document.body.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => el.remove(), 350);
  }, 3200);
}

/**
 * Escape HTML characters to prevent XSS
 * @param {string} str
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Load a CSS file once (idempotent)
 * @param {string} href
 */
function loadCss(href) {
  if (!document.querySelector(`link[href="${href}"]`)) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }
}

/**
 * Load a JS script once, returns Promise
 * @param {string} src
 */
function loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * Load multiple scripts sequentially
 * @param {string[]} srcs
 */
function loadScripts(srcs) {
  return srcs.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve());
}
