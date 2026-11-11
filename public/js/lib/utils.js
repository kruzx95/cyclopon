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

/**
 * Global Admin Fetch Interceptor:
 * Ensures requests to admin endpoints always include Bearer Authorization token
 * and credentials ('include') so authentication never fails across server reboots,
 * HTTP/HTTPS transitions, or cookie restrictions.
 */
(function() {
  const _origFetch = window.fetch;
  window.fetch = async function(resource, init = {}) {
    const url = typeof resource === 'string' ? resource : (resource?.url || '');
    const isAdminEndpoint = url.startsWith('/api/admin') ||
                            url.includes('/api/events/admin') ||
                            url.includes('/api/auth/admin/session');

    const adminToken = sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken');

    if (adminToken && isAdminEndpoint) {
      init = Object.assign({}, init);
      init.credentials = 'include';

      if (!init.headers) {
        init.headers = { 'Authorization': `Bearer ${adminToken}` };
      } else if (init.headers instanceof Headers) {
        if (!init.headers.has('Authorization')) {
          init.headers.set('Authorization', `Bearer ${adminToken}`);
        }
      } else if (Array.isArray(init.headers)) {
        if (!init.headers.some(([k]) => k.toLowerCase() === 'authorization')) {
          init.headers.push(['Authorization', `Bearer ${adminToken}`]);
        }
      } else {
        if (!init.headers['Authorization'] && !init.headers['authorization']) {
          init.headers['Authorization'] = `Bearer ${adminToken}`;
        }
      }
    }

    const res = await _origFetch(resource, init);

    // If server responds 401 on an admin endpoint, gracefully notify user
    if (res.status === 401 && isAdminEndpoint && !url.includes('/api/auth/admin/login')) {
      console.warn('[Admin Auth] Session token invalid or expired on server.');
    }

    return res;
  };
})();

