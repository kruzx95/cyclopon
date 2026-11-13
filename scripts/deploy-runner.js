#!/usr/bin/env node
/**
 * CycloPon Cross-Platform VPS Deployment Runner
 * Works seamlessly on Windows, Linux, and macOS without PowerShell/WSL quirks.
 */

const { spawnSync, spawn } = require('child_process');

const VPS_USER = process.env.VPS_USER || 'ubuntu';
const VPS_IP   = process.env.VPS_IP   || '43.173.51.161';
const VPS_PORT = process.env.VPS_PORT || '22';
const VPS_DIR  = process.env.VPS_DIR  || '/home/ubuntu/cyclopon';

console.log('\x1b[36m====================================================\x1b[0m');
console.log('\x1b[36m🚀 [CycloPon] Automated VPS Deployment\x1b[0m');
console.log('\x1b[36m====================================================\x1b[0m');
console.log(`Target Server : \x1b[33m${VPS_USER}@${VPS_IP}:${VPS_DIR}\x1b[0m`);

// Step 1: Git Status & Auto-commit if any dirty files exist
console.log('\n\x1b[36m[1/3] Memeriksa status Git lokal...\x1b[0m');
const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
if (status.stdout && status.stdout.trim()) {
  console.log('\x1b[33m⚠️ Terdeteksi perubahan yang belum di-commit. Menyimpan perubahan...\x1b[0m');
  spawnSync('git', ['add', '-A'], { stdio: 'inherit' });
  spawnSync('git', ['commit', '-m', 'chore(deploy): sync changes before vps deploy'], { stdio: 'inherit' });
}

// Step 2: Push changes to remote GitHub master
console.log('\n\x1b[36m[2/3] Mendorong perubahan ke remote GitHub (master)...\x1b[0m');
spawnSync('git', ['push', 'origin', 'master'], { stdio: 'inherit' });
console.log('\x1b[32m✓ Git master tersinkronisasi.\x1b[0m');

// Step 3: Remote execution via SSH
console.log('\n\x1b[36m[3/3] Menghubungkan ke VPS via SSH untuk rebuild container...\x1b[0m');

const remoteCommands = [
  `cd ${VPS_DIR}`,
  'echo "→ Menarik update terbaru dari GitHub..."',
  'git -c core.fileMode=false pull origin master',
  'COMPOSE_FILE="docker-compose.yml"',
  'if [ -f "docker-compose.prod.yml" ]; then COMPOSE_FILE="docker-compose.prod.yml"; fi',
  'echo "→ Menggunakan compose file: $COMPOSE_FILE"',
  'echo "→ Membangun ulang (rebuild) container CycloPon..."',
  'docker compose -f $COMPOSE_FILE up -d --build --force-recreate',
  'echo "→ Menjalankan pembersihan data demo..."',
  'docker compose -f $COMPOSE_FILE exec -T cyclopon node scripts/clean-demo-data.js || true',
  'echo "→ Status container aktif:"',
  'docker compose -f $COMPOSE_FILE ps'
].join(' && ');

const sshArgs = ['-p', VPS_PORT, `${VPS_USER}@${VPS_IP}`, remoteCommands];

const child = spawn('ssh', sshArgs, { stdio: 'inherit' });
child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n\x1b[32m====================================================\x1b[0m');
    console.log('\x1b[32m🎉 [CycloPon] Deployment ke VPS Berhasil Selesai!\x1b[0m');
    console.log('\x1b[32m====================================================\x1b[0m');
    console.log(`Web App URL : \x1b[36mhttps://${VPS_IP} (atau http://${VPS_IP}:3000)\x1b[0m`);
    console.log(`Traccar GPS : \x1b[36mhttp://${VPS_IP}:8082\x1b[0m`);
  } else {
    console.log(`\n\x1b[31m[!] SSH selesai dengan kode keluar: ${code}\x1b[0m`);
  }
  process.exit(code || 0);
});
