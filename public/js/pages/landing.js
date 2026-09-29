function renderLanding() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center;background:radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.06) 0%, transparent 55%)">
      <div style="font-size:80px;margin-bottom:12px;filter:drop-shadow(0 0 28px rgba(0,229,255,0.35));animation:fadeIn 0.6s ease">🚴</div>
      <h1 class="fade-in" style="font-size:44px;font-weight:800;background:linear-gradient(135deg,#00E5FF 0%,#E6EDF3 60%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;line-height:1.1">CycloPon</h1>
      <p class="fade-in" style="color:var(--text-secondary);font-size:17px;margin-bottom:48px;max-width:420px;line-height:1.6">Live GPS tracking untuk event bersepeda.<br>Track posisi rider secara real-time.</p>

      <div style="display:flex;flex-direction:column;gap:14px;width:100%;max-width:340px">
        <button id="btnRider" class="btn btn-primary fade-in" style="font-size:16px;padding:18px 24px;border-radius:16px">
          🚴‍♂️ &nbsp;Saya Rider
        </button>

        <div id="activeEventSection" style="display:none">
          <p style="color:var(--text-secondary);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">Event Aktif</p>
          <div id="activeEventLinks"></div>
        </div>

        <button id="btnAdmin" class="btn btn-outline fade-in" style="font-size:14px;padding:14px;margin-top:4px">
          ⚙️ &nbsp;Admin Panel
        </button>
      </div>

      <p style="color:var(--text-secondary);font-size:12px;margin-top:48px;opacity:0.6">
        Powered by Traccar — GPS tracking open source
      </p>
    </div>
  `;

  document.getElementById('btnRider').addEventListener('click', () => Router.navigate('/rider'));
  document.getElementById('btnAdmin').addEventListener('click', () => Router.navigate('/admin'));

  // Fetch active events for spectator quick links
  fetch('/api/events')
    .then(r => r.json())
    .then(events => {
      const active = events.filter(e => e.active);
      if (!active.length) return;

      document.getElementById('activeEventSection').style.display = 'block';
      document.getElementById('activeEventLinks').innerHTML = active.map(ev => `
        <a class="btn btn-outline fade-in" style="display:flex;width:100%;margin-bottom:8px;font-size:14px;padding:14px 18px;justify-content:flex-start;gap:10px"
           href="/watch/${ev.id}" data-link>
          <span>📍</span>
          <span style="flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ev.name}</span>
          <span style="color:var(--color-green);font-size:11px;font-weight:700">LIVE</span>
        </a>
      `).join('');
    })
    .catch(() => {}); // silently ignore if API not ready
}
