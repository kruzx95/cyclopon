/**
 * Minimal client-side router for CycloPon SPA
 * Supports parameterized paths like /watch/:eventId
 */
const Router = {
  routes: {},

  register(path, handler) {
    this.routes[path] = handler;
  },

  navigate(path) {
    window.history.pushState({}, '', path);
    this.resolve(path);
  },

  resolve(path) {
    // Strip query string for matching
    const cleanPath = path.split('?')[0];

    for (const [pattern, handler] of Object.entries(this.routes)) {
      const regex = new RegExp('^' + pattern.replace(/:([^/]+)/g, '([^/]+)') + '$');
      const match = cleanPath.match(regex);
      if (match) {
        const paramNames = [...pattern.matchAll(/:([^/]+)/g)].map(m => m[1]);
        const params = {};
        paramNames.forEach((name, i) => { params[name] = match[i + 1]; });

        // Parse query string (e.g. ?bib=001)
        const searchStr = path.includes('?') ? path.split('?')[1] : (window.location.search ? window.location.search.slice(1) : '');
        params.query = {};
        if (searchStr) {
          new URLSearchParams(searchStr).forEach((val, key) => { params.query[key] = val; });
        }

        handler(params);
        return;
      }
    }

    // 404 fallback
    document.getElementById('app').innerHTML = `
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;">
        <div style="font-size:64px;margin-bottom:16px">🚧</div>
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Halaman tidak ditemukan</h1>
        <p style="color:#8B949E;margin-bottom:24px">Path: ${cleanPath}</p>
        <a href="/" data-link style="color:var(--color-yellow);text-decoration:none;font-weight:700">← Kembali ke beranda</a>
      </div>
    `;
  },

  init() {
    window.addEventListener('popstate', () => this.resolve(window.location.pathname));

    // Intercept all data-link anchors for SPA navigation
    document.addEventListener('click', e => {
      const a = e.target.closest('a[data-link]');
      if (a) {
        e.preventDefault();
        const href = a.getAttribute('href');
        if (href) this.navigate(href);
      }
    });

    this.resolve(window.location.pathname);
  }
};
