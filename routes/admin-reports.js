const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { requireAdminAuth } = require('../lib/admin-auth');

const reportsDir = path.join(__dirname, '..', 'reports');

/**
 * Parse markdown report file to structured JSON for UI display
 */
function parseReportMarkdown(md) {
  if (!md || typeof md !== 'string') return null;

  // Extract metadata
  const dateMatch = md.match(/> \*\*Tanggal Uji:\*\*\s*(.+)/i);
  const statusMatch = md.match(/> \*\*Status Kesiapan:\*\*\s*`([^`]+)`/i);
  const durationMatch = md.match(/> \*\*Durasi Eksekusi Trial:\*\*\s*`([^`]+)`/i);

  // Extract system info
  const osMatch = md.match(/\|\s*\*\*Sistem Operasi\*\*\s*\|\s*([^|]+)\|/i);
  const cpuMatch = md.match(/\|\s*\*\*Prosesor \(CPU\)\*\*\s*\|\s*([^|]+)\|/i);
  const ramMatch = md.match(/\|\s*\*\*Memori Sistem \(RAM\)\*\*\s*\|\s*([^|]+)\|/i);
  const nodeMatch = md.match(/\|\s*\*\*Node\.js Runtime\*\*\s*\|\s*([^|]+)\|/i);
  const walMatch = md.match(/\|\s*\*\*Mode Jurnal DB\*\*\s*\|\s*`([^`]+)`/i);

  // Extract table rows
  const tableRows = [];
  const rowRegex = /\|\s*(\d+)\s*\|\s*\*\*([^*]+)\*\*\s*\|\s*([^|]+)\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*\*\*([^*]+)\*\*\s*\|/gi;
  let match;
  while ((match = rowRegex.exec(md)) !== null) {
    tableRows.push({
      num: parseInt(match[1]),
      category: match[2].trim(),
      metric: match[3].trim(),
      target: match[4].trim(),
      actual: match[5].trim(),
      status: match[6].trim().replace(/^[^\w]+/, '') // Strip emoji if any
    });
  }

  // Quick summary metrics
  const ingestRow = tableRows.find(r => r.category.includes('Database') || r.metric.includes('Ingestion'));
  const wsRow = tableRows.find(r => r.category.includes('WebSocket') || r.metric.includes('Packet Loss'));
  const cotRow = tableRows.find(r => r.category.includes('Race Engine') || r.metric.includes('Split'));
  const sosRow = tableRows.find(r => r.category.includes('Darurat') || r.metric.includes('SOS'));
  const secRow = tableRows.find(r => r.category.includes('Keamanan'));
  const memRow = tableRows.find(r => r.category.includes('Resource') || r.category.includes('Memori'));

  return {
    testedAt: dateMatch ? dateMatch[1].trim() : 'Baru saja',
    verdict: statusMatch ? statusMatch[1].trim() : 'SIAP',
    duration: durationMatch ? durationMatch[1].trim() : '-',
    isReady: statusMatch ? (statusMatch[1].includes('SIAP') && !statusMatch[1].includes('PERLU')) : true,
    system: {
      os: osMatch ? osMatch[1].trim() : '-',
      cpu: cpuMatch ? cpuMatch[1].trim() : '-',
      ram: ramMatch ? ramMatch[1].trim() : '-',
      node: nodeMatch ? nodeMatch[1].trim() : '-',
      walMode: walMatch ? walMatch[1].trim() : 'WAL'
    },
    metricsSummary: {
      ingest: ingestRow ? ingestRow.actual : '-',
      wsFanOut: wsRow ? wsRow.actual : '-',
      cot: cotRow ? cotRow.actual : '-',
      sos: sosRow ? sosRow.actual : '-',
      security: secRow ? secRow.actual : '-',
      memory: memRow ? memRow.actual : '-'
    },
    tableRows
  };
}

// GET /api/admin/reports/latest — Fetch latest test report details
router.get('/latest', (req, res) => {
  try {
    const latestFile = path.join(reportsDir, 'LATEST_REPORT.md');
    if (!fs.existsSync(latestFile)) {
      // Check if any report file exists
      if (fs.existsSync(reportsDir)) {
        const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.md')).sort().reverse();
        if (files.length > 0) {
          const content = fs.readFileSync(path.join(reportsDir, files[0]), 'utf8');
          return res.json({
            success: true,
            hasReport: true,
            filename: files[0],
            parsed: parseReportMarkdown(content),
            markdown: content
          });
        }
      }
      return res.json({ success: true, hasReport: false, report: null });
    }

    const content = fs.readFileSync(latestFile, 'utf8');
    const parsed = parseReportMarkdown(content);

    res.json({
      success: true,
      hasReport: true,
      filename: 'LATEST_REPORT.md',
      parsed,
      markdown: content
    });
  } catch (err) {
    console.error('[Admin Reports] Error fetching latest report:', err);
    res.status(500).json({ error: 'Gagal membaca laporan diagnostik: ' + err.message });
  }
});

// GET /api/admin/reports — List all historical test reports
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(reportsDir)) {
      return res.json({ success: true, reports: [] });
    }
    const files = fs.readdirSync(reportsDir)
      .filter(f => f.endsWith('.md'))
      .map(file => {
        const stat = fs.statSync(path.join(reportsDir, file));
        return {
          filename: file,
          sizeBytes: stat.size,
          updatedAt: stat.mtime
        };
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({ success: true, reports: files });
  } catch (err) {
    console.error('[Admin Reports] Error listing reports:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat laporan' });
  }
});

// POST /api/admin/reports/run — Trigger diagnostic trial from Admin Dashboard
router.post('/run', requireAdminAuth, (req, res) => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'generate-test-report.js');
  if (!fs.existsSync(scriptPath)) {
    return res.status(500).json({ error: 'Script generator pengujian tidak ditemukan' });
  }

  // Execute trial runner asynchronously
  exec(`node "${scriptPath}"`, { cwd: path.join(__dirname, '..'), timeout: 35000 }, (error, stdout, stderr) => {
    if (error && error.code !== 0) {
      console.error('[Admin Reports] Diagnostic run failed:', stderr || stdout);
      return res.status(500).json({
        error: 'Eksekusi uji diagnostik gagal: ' + (stderr || error.message),
        output: stdout
      });
    }

    try {
      const latestFile = path.join(reportsDir, 'LATEST_REPORT.md');
      const content = fs.existsSync(latestFile) ? fs.readFileSync(latestFile, 'utf8') : '';
      const parsed = parseReportMarkdown(content);

      res.json({
        success: true,
        message: 'Uji diagnostik berhasil diselesaikan!',
        parsed,
        markdown: content,
        output: stdout
      });
    } catch (parseErr) {
      res.json({
        success: true,
        message: 'Uji coba selesai, namun terjadi kendala membaca berkas laporan.',
        output: stdout
      });
    }
  });
});

module.exports = router;
