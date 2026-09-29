function renderLanding() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center;background:radial-gradient(ellipse at 50% 0%, rgba(255,230,0,0.1) 0%, transparent 60%)">
      <div style="font-size:80px;margin-bottom:12px;filter:drop-shadow(0 0 32px rgba(255,230,0,0.45));animation:fadeIn 0.6s ease">🚴</div>
      <h1 class="fade-in" style="font-size:48px;font-weight:900;letter-spacing:-0.03em;background:linear-gradient(135deg,#FFE600 0%,#FFFFFF 70%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;line-height:1.1">CycloPon</h1>
      <p class="fade-in" style="color:var(--text-secondary);font-size:16px;margin-bottom:44px;max-width:440px;line-height:1.6">Live GPS tracking untuk event bersepeda jarak jauh.<br>Layar HP mati, pelacakan tetap berjalan lancar.</p>

      <div style="display:flex;flex-direction:column;gap:14px;width:100%;max-width:340px">
        <button id="btnRider" class="btn btn-primary fade-in" style="font-size:16px;padding:18px 24px;border-radius:16px">
          🚴‍♂️ &nbsp;Saya Rider (Pesepeda)
        </button>

        <div id="activeEventSection" style="display:none">
          <p style="color:var(--text-secondary);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">Event Sedang Berlangsung</p>
          <div id="activeEventLinks"></div>
        </div>

        <button id="btnAdmin" class="btn btn-outline fade-in" style="font-size:14px;padding:14px;margin-top:4px">
          ⚙️ &nbsp;Admin Panel
        </button>
      </div>

      <p style="color:var(--text-secondary);font-size:12px;margin-top:54px;opacity:0.6">
        Tour de France 2025 Edition · Powered by Traccar GPS
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
          <span style="color:var(--color-green);font-size:11px;font-weight:800;letter-spacing:0.05em">LIVE</span>
        </a>
      `).join('');
    })
    .catch(() => {});
}
