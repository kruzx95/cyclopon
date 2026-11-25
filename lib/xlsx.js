'use strict';

/**
 * Minimal dependency-free XLSX (SpreadsheetML) writer.
 *
 * Supports the subset of features CycloPon reports need:
 *  - multiple sheets, inline strings, numbers and booleans
 *  - styles (font, fill, border, alignment, number format)
 *  - merged cells, frozen panes, auto-filter
 *  - column widths, row heights, print setup (A4, fit to width, repeat titles)
 *
 * The archive is built with a tiny ZIP writer (deflate via node:zlib) so no
 * third-party package is required.
 */

const zlib = require('zlib');

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function escapeXml(value) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index) {
  let n = Number(index) || 0;
  let name = '';
  while (n >= 0) {
    name = String.fromCharCode((n % 26) + 65) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

function normalizeColor(color) {
  if (!color) return null;
  let hex = String(color).replace(/^#/, '').toUpperCase();
  if (hex.length === 6) hex = 'FF' + hex;
  return /^[0-9A-F]{8}$/.test(hex) ? hex : null;
}

function normalizeAlign(align) {
  if (!align) return null;
  const out = {};
  if (align.horizontal) out.horizontal = String(align.horizontal);
  if (align.vertical) out.vertical = String(align.vertical);
  if (align.wrapText) out.wrapText = true;
  if (align.textRotation) out.textRotation = Number(align.textRotation) || 0;
  return Object.keys(out).length ? out : null;
}
function normalizeFont(font) {
  if (!font) return null;
  return {
    name: font.name ? String(font.name) : 'Calibri',
    size: Number(font.size) || 11,
    bold: !!font.bold,
    italic: !!font.italic,
    underline: !!font.underline,
    color: normalizeColor(font.color)
  };
}

function normalizeFill(fill) {
  if (!fill) return null;
  const spec = typeof fill === 'string' ? { color: fill } : fill;
  const color = normalizeColor(spec.color);
  if (!color && !spec.patternType) return null;
  return { patternType: spec.patternType ? String(spec.patternType) : 'solid', color };
}

const BORDER_SIDES = ['left', 'right', 'top', 'bottom'];

function normalizeBorder(border) {
  if (!border) return null;
  const spec = typeof border === 'string' ? { all: { style: border } } : border;
  const fallback = spec.all || spec.default || null;
  const sides = {};
  for (const side of BORDER_SIDES) {
    const raw = spec[side] || fallback;
    if (!raw) continue;
    const item = typeof raw === 'string' ? { style: raw } : raw;
    sides[side] = {
      style: item.style ? String(item.style) : 'thin',
      color: normalizeColor(item.color)
    };
  }
  return Object.keys(sides).length ? { sides } : null;
}

function defaultFont() {
  return { name: 'Calibri', size: 11, bold: false, italic: false, underline: false, color: null };
}

function fontXml(font) {
  let out = '<font>';
  if (font.bold) out += '<b/>';
  if (font.italic) out += '<i/>';
  if (font.underline) out += '<u/>';
  out += `<sz val="${font.size}"/>`;
  if (font.color) out += `<color rgb="${font.color}"/>`;
  out += `<name val="${escapeXml(font.name)}"/>`;
  out += '<family val="2"/>';
  return out + '</font>';
}

function fillXml(fill) {
  if (fill.patternType === 'none' || fill.patternType === 'gray125') {
    return `<fill><patternFill patternType="${fill.patternType}"/></fill>`;
  }
  const fg = fill.color ? `<fgColor rgb="${fill.color}"/>` : '<fgColor indexed="64"/>';
  return `<fill><patternFill patternType="${fill.patternType}">${fg}<bgColor indexed="64"/></patternFill></fill>`;
}

function borderXml(border) {
  const sides = border.sides || {};
  const child = (side) => {
    const item = sides[side];
    if (!item) return `<${side}/>`;
    const color = item.color ? `<color rgb="${item.color}"/>` : '<color indexed="64"/>';
    return `<${side} style="${item.style}">${color}</${side}>`;
  };
  return `<border>${child('left')}${child('right')}${child('top')}${child('bottom')}<diagonal/></border>`;
}

function alignmentXml(align) {
  const attrs = [];
  if (align.horizontal) attrs.push(`horizontal="${align.horizontal}"`);
  if (align.vertical) attrs.push(`vertical="${align.vertical}"`);
  if (align.wrapText) attrs.push('wrapText="1"');
  if (align.textRotation) attrs.push(`textRotation="${align.textRotation}"`);
  return attrs.length ? `<alignment ${attrs.join(' ')}/>` : '';
}

class StyleRegistry {
  constructor() {
    this.fonts = [defaultFont()];
    this.fills = [{ patternType: 'none' }, { patternType: 'gray125' }];
    this.borders = [{ sides: {} }];
    this.numFmts = [];
    this.xfs = [{ fontId: 0, fillId: 0, borderId: 0, numFmtId: 0, align: null }];
    this.fontIndex = new Map([[JSON.stringify(this.fonts[0]), 0]]);
    this.fillIndex = new Map();
    this.borderIndex = new Map([[JSON.stringify(this.borders[0]), 0]]);
    this.numFmtIndex = new Map();
    this.xfIndex = new Map([['0|0|0|0|null', 0]]);
  }

  internFont(font) {
    const key = JSON.stringify(font);
    if (!this.fontIndex.has(key)) {
      this.fontIndex.set(key, this.fonts.length);
      this.fonts.push(font);
    }
    return this.fontIndex.get(key);
  }

  internFill(fill) {
    const key = JSON.stringify(fill);
    if (!this.fillIndex.has(key)) {
      this.fillIndex.set(key, this.fills.length);
      this.fills.push(fill);
    }
    return this.fillIndex.get(key);
  }

  internBorder(border) {
    const key = JSON.stringify(border);
    if (!this.borderIndex.has(key)) {
      this.borderIndex.set(key, this.borders.length);
      this.borders.push(border);
    }
    return this.borderIndex.get(key);
  }

  internNumFmt(code) {
    if (!this.numFmtIndex.has(code)) {
      const id = 164 + this.numFmts.length;
      this.numFmtIndex.set(code, id);
      this.numFmts.push({ id, code });
    }
    return this.numFmtIndex.get(code);
  }

  register(style) {
    const spec = style || {};
    const fontId = spec.font ? this.internFont(normalizeFont(spec.font)) : 0;
    const fillId = spec.fill ? this.internFill(normalizeFill(spec.fill)) : 0;
    const borderId = spec.border ? this.internBorder(normalizeBorder(spec.border)) : 0;
    const numFmtId = spec.numFmt ? this.internNumFmt(String(spec.numFmt)) : 0;
    const align = normalizeAlign(spec.align);
    const key = [fontId, fillId, borderId, numFmtId, JSON.stringify(align)].join('|');
    if (!this.xfIndex.has(key)) {
      this.xfIndex.set(key, this.xfs.length);
      this.xfs.push({ fontId, fillId, borderId, numFmtId, align });
    }
    return this.xfIndex.get(key);
  }

  toXml() {
    const numFmts = this.numFmts.length
      ? `<numFmts count="${this.numFmts.length}">${this.numFmts.map(f => `<numFmt numFmtId="${f.id}" formatCode="${escapeXml(f.code)}"/>`).join('')}</numFmts>`
      : '';
    const fonts = `<fonts count="${this.fonts.length}">${this.fonts.map(fontXml).join('')}</fonts>`;
    const fills = `<fills count="${this.fills.length}">${this.fills.map(fillXml).join('')}</fills>`;
    const borders = `<borders count="${this.borders.length}">${this.borders.map(borderXml).join('')}</borders>`;
    const xfs = this.xfs.map(xf => {
      const attrs = [`numFmtId="${xf.numFmtId}"`, `fontId="${xf.fontId}"`, `fillId="${xf.fillId}"`, `borderId="${xf.borderId}"`, 'xfId="0"'];
      if (xf.numFmtId) attrs.push('applyNumberFormat="1"');
      if (xf.fontId) attrs.push('applyFont="1"');
      if (xf.fillId) attrs.push('applyFill="1"');
      if (xf.borderId) attrs.push('applyBorder="1"');
      const align = xf.align ? alignmentXml(xf.align) : '';
      if (align) attrs.push('applyAlignment="1"');
      return align ? `<xf ${attrs.join(' ')}>${align}</xf>` : `<xf ${attrs.join(' ')}/>`;
    }).join('');
    return XML_HEADER +
      `<styleSheet xmlns="${NS_MAIN}">` +
      numFmts +
      fonts +
      fills +
      borders +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${this.xfs.length}">${xfs}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>';
  }
}
function normalizeCell(cell) {
  if (cell == null) return { value: '', style: null, type: null };
  if (typeof cell === 'object' && !Array.isArray(cell) && ('value' in cell || 'style' in cell || 'type' in cell)) {
    return { value: cell.value, style: cell.style || null, type: cell.type || null };
  }
  return { value: cell, style: null, type: null };
}

function cellXml(ref, cell, registry) {
  const styleAttr = cell.style ? ` s="${registry.register(cell.style)}"` : '';
  let type = cell.type;
  const value = cell.value;
  if (!type) {
    if (typeof value === 'number' && Number.isFinite(value)) type = 'number';
    else if (typeof value === 'boolean') type = 'boolean';
    else if (value == null || value === '') type = 'blank';
    else type = 'string';
  }
  if (type === 'blank') return styleAttr ? `<c r="${ref}"${styleAttr}/>` : '';
  if (type === 'number') return `<c r="${ref}"${styleAttr}><v>${Number(value)}</v></c>`;
  if (type === 'boolean') return `<c r="${ref}"${styleAttr} t="b"><v>${value ? 1 : 0}</v></c>`;
  return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function normalizeSheetName(name) {
  const cleaned = String(name || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').trim();
  return (cleaned || 'Sheet').slice(0, 31);
}

class Sheet {
  constructor(name, options = {}) {
    this.name = normalizeSheetName(name);
    this.columns = options.columns || [];
    this.rows = [];
    this.freeze = options.freeze || null;
    this.autoFilter = options.autoFilter || null;
    this.showGridLines = options.showGridLines === true;
    this.print = options.print || null;
    this.footer = options.footer || '';
    this.printTitles = options.printTitles || null;
  }

  addRow(row = {}) {
    const spec = Array.isArray(row) ? { cells: row } : row;
    const cells = (spec.cells || []).map(normalizeCell);
    const entry = { height: Number(spec.height) || null, cells, merges: [] };
    const mergeSpecs = Array.isArray(spec.merges) ? spec.merges : (spec.merge ? [spec.merge] : []);
    for (const merge of mergeSpecs) {
      if (!Array.isArray(merge) || merge.length !== 2) continue;
      const a = Number(merge[0]) || 0;
      const b = Number(merge[1]) || 0;
      entry.merges.push({ from: Math.max(0, Math.min(a, b)), to: Math.max(0, a, b) });
    }
    this.rows.push(entry);
    return this;
  }

  addRows(rows = []) {
    for (const row of rows) this.addRow(row);
    return this;
  }

  maxColumns() {
    return this.rows.reduce((max, row) => {
      const mergeEnd = row.merges && row.merges.length
        ? Math.max(...row.merges.map(m => m.to)) + 1
        : 0;
      return Math.max(max, row.cells.length, mergeEnd);
    }, this.columns.length || 1);
  }

  render(registry) {
    const rowsXml = [];
    const mergeRefs = [];
    const lastCol = this.maxColumns();

    this.rows.forEach((row, idx) => {
      const r = idx + 1;
      const merges = row.merges || [];
      const width = merges.length
        ? Math.max(row.cells.length, Math.max(...merges.map(m => m.to)) + 1)
        : row.cells.length;
      const cells = [];
      for (let c = 0; c < width; c++) {
        cells.push(cellXml(columnName(c) + r, row.cells[c] || { value: '', style: null, type: null }, registry));
      }
      const attrs = [`r="${r}"`];
      if (row.height) attrs.push(`ht="${row.height}"`, 'customHeight="1"');
      const body = cells.join('');
      rowsXml.push(body ? `<row ${attrs.join(' ')}>${body}</row>` : `<row ${attrs.join(' ')}/>`);
      for (const merge of merges) {
        mergeRefs.push(`${columnName(merge.from)}${r}:${columnName(merge.to)}${r}`);
      }
    });

    const dimension = `A1:${columnName(lastCol - 1)}${Math.max(this.rows.length, 1)}`;
    const colsXml = this.columns.length
      ? `<cols>${this.columns.map((col, i) => {
        if (!col) return '';
        const attrs = [`min="${i + 1}"`, `max="${i + 1}"`];
        if (col.width) attrs.push(`width="${Number(col.width)}"`, 'customWidth="1"');
        if (col.hidden) attrs.push('hidden="1"');
        return `<col ${attrs.join(' ')}/>`;
      }).join('')}</cols>`
      : '';

    let paneXml = '';
    if (this.freeze) {
      const frozenRows = Math.max(0, Number(this.freeze.rows) || 0);
      const frozenCols = Math.max(0, Number(this.freeze.cols) || 0);
      if (frozenRows || frozenCols) {
        const topLeft = this.freeze.topLeftCell || `${columnName(frozenCols)}${frozenRows + 1}`;
        const activePane = frozenRows && frozenCols ? 'bottomRight' : frozenRows ? 'bottomLeft' : 'topRight';
        const attrs = [];
        if (frozenCols) attrs.push(`xSplit="${frozenCols}"`);
        if (frozenRows) attrs.push(`ySplit="${frozenRows}"`);
        attrs.push(`topLeftCell="${topLeft}"`, `activePane="${activePane}"`, 'state="frozen"');
        paneXml = `<pane ${attrs.join(' ')}/><selection pane="${activePane}" activeCell="${topLeft}" sqref="${topLeft}"/>`;
      }
    }

    const sheetViewAttrs = ['workbookViewId="0"'];
    if (!this.showGridLines) sheetViewAttrs.push('showGridLines="0"');
    const sheetViews = paneXml
      ? `<sheetViews><sheetView ${sheetViewAttrs.join(' ')}>${paneXml}</sheetView></sheetViews>`
      : `<sheetViews><sheetView ${sheetViewAttrs.join(' ')}/></sheetViews>`;

    const print = this.print || {};
    const orientation = print.orientation === 'portrait' ? 'portrait' : 'landscape';
    const fitToWidth = print.fitToWidth != null ? Number(print.fitToWidth) : 1;
    const fitToHeight = print.fitToHeight != null ? Number(print.fitToHeight) : 0;
    const margins = print.margins || {};
    const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

    return XML_HEADER +
      `<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
      '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
      `<dimension ref="${dimension}"/>` +
      sheetViews +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      colsXml +
      `<sheetData>${rowsXml.join('')}</sheetData>` +
      (this.autoFilter ? `<autoFilter ref="${this.autoFilter}"/>` : '') +
      (mergeRefs.length ? `<mergeCells count="${mergeRefs.length}">${mergeRefs.map(ref => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>` : '') +
      `<pageMargins left="${num(margins.left, 0.35)}" right="${num(margins.right, 0.35)}" top="${num(margins.top, 0.5)}" bottom="${num(margins.bottom, 0.5)}" header="${num(margins.header, 0.25)}" footer="${num(margins.footer, 0.25)}"/>` +
      `<pageSetup paperSize="${num(print.paperSize, 9)}" orientation="${orientation}" fitToWidth="${fitToWidth}" fitToHeight="${fitToHeight}"/>` +
      (this.footer ? `<headerFooter><oddFooter>${escapeXml(this.footer)}</oddFooter></headerFooter>` : '') +
      '</worksheet>';
  }
}
function quoteSheetName(name) {
  return `'${String(name).replace(/'/g, "''")}'`;
}

function zipEntries(entries) {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data), 'utf8');
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x0021, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localChunks.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x0021, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralChunks.push(central, name);

    offset += local.length + name.length + compressed.length;
  }

  const centralSize = centralChunks.reduce((size, buffer) => size + buffer.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, ...centralChunks, end]);
}

class Workbook {
  constructor(options = {}) {
    this.creator = options.creator || 'CycloPon';
    this.title = options.title || '';
    this.styles = new StyleRegistry();
    this.sheets = [];
  }

  addSheet(name, options = {}) {
    const sheet = new Sheet(name, options);
    this.sheets.push(sheet);
    return sheet;
  }

  toBuffer() {
    const count = this.sheets.length;
    if (!count) throw new Error('Workbook harus memiliki minimal satu sheet.');
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const stylesId = count + 1;

    const contentTypes = XML_HEADER +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      `<Override PartName="/xl/workbook.xml" ContentType="${XLSX_MIME}.main+xml"/>` +
      this.sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      '</Types>';

    const rootRels = XML_HEADER +
      `<Relationships xmlns="${NS_PKG_REL}">` +
      `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>` +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      `<Relationship Id="rId3" Type="${NS_REL}/extended-properties" Target="docProps/app.xml"/>` +
      '</Relationships>';

    const workbookRels = XML_HEADER +
      `<Relationships xmlns="${NS_PKG_REL}">` +
      this.sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
      `<Relationship Id="rId${stylesId}" Type="${NS_REL}/styles" Target="styles.xml"/>` +
      '</Relationships>';

    const sheetTags = this.sheets.map((sheet, i) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
    const definedNames = this.sheets.map((sheet, i) => {
      if (!sheet.printTitles) return '';
      const ref = `${quoteSheetName(sheet.name)}!${sheet.printTitles}`;
      return `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${escapeXml(ref)}</definedName>`;
    }).join('');

    const workbookXml = XML_HEADER +
      `<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
      '<bookViews><workbookView activeTab="0"/></bookViews>' +
      `<sheets>${sheetTags}</sheets>` +
      (definedNames ? `<definedNames>${definedNames}</definedNames>` : '') +
      '<calcPr calcId="171027"/>' +
      '</workbook>';

    const coreXml = XML_HEADER +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      `<dc:title>${escapeXml(this.title || this.sheets[0].name)}</dc:title>` +
      `<dc:creator>${escapeXml(this.creator)}</dc:creator>` +
      `<cp:lastModifiedBy>${escapeXml(this.creator)}</cp:lastModifiedBy>` +
      `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>` +
      `<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>` +
      '</cp:coreProperties>';

    const appXml = XML_HEADER +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
      '<Application>CycloPon Race Control</Application>' +
      '</Properties>';

    const renderedSheets = this.sheets.map((sheet, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: sheet.render(this.styles)
    }));
    // Styles must be serialized after every sheet has registered its cells.
    const stylesXml = this.styles.toXml();

    const files = [
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rootRels },
      { name: 'docProps/core.xml', data: coreXml },
      { name: 'docProps/app.xml', data: appXml },
      { name: 'xl/workbook.xml', data: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', data: workbookRels },
      { name: 'xl/styles.xml', data: stylesXml },
      ...renderedSheets
    ];

    return zipEntries(files);
  }
}

module.exports = {
  Workbook,
  Sheet,
  XLSX_MIME,
  columnName,
  escapeXml
};