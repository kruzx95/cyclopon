#!/usr/bin/env node
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const isWin = os.platform() === 'win32';
const script = isWin
  ? path.join(__dirname, 'deploy-vps.ps1')
  : path.join(__dirname, 'deploy-vps.sh');

const cmd = isWin ? 'powershell.exe' : 'bash';
const args = isWin
  ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, ...process.argv.slice(2)]
  : [script, ...process.argv.slice(2)];

const child = spawn(cmd, args, { stdio: 'inherit' });

child.on('exit', (code) => {
  process.exit(code || 0);
});

