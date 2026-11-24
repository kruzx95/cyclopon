/**
 * CycloPon Activity Card — themes & canvas sizes.
 *
 * Three deliberately different looks so a card never feels monotonous:
 *   night-neon     — dark, neon glow, duotone basemap
 *   paper-topo     — warm paper, sage route, editorial serif
 *   brutalist-mono — white, black hairlines, monospace, no basemap
 *
 * Plain data + tiny helpers only; the renderer owns all drawing.
 */

const CARD_DISPLAY_STACK = '"Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const CARD_MONO_STACK = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Roboto Mono", monospace';
const CARD_SERIF_STACK = 'Georgia, "Times New Roman", "Noto Serif", serif';

const CARD_SIZES = {
  story: { id: 'story', label: 'Story 9:16', width: 1080, height: 1920, ratio: '1080 / 1920' },
  feed: { id: 'feed', label: 'Feed 4:5', width: 1080, height: 1350, ratio: '1080 / 1350' },
  square: { id: 'square', label: 'Square 1:1', width: 1080, height: 1080, ratio: '1080 / 1080' }
};

const CARD_SIZE_ORDER = ['story', 'feed', 'square'];

const CARD_TEMPLATES = [
  {
    id: 'night-neon',
    label: 'Night Neon',
    tagline: 'Gelap, glow, rute jadi bintang',
    swatch: ['#05070A', '#00E5FF', '#FF6B35'],
    layout: 'panel-bottom',
    palette: {
      bgTop: '#060A0F',
      bgBottom: '#0C131A',
      ink: '#F3F8FB',
      muted: '#8EA3B0',
      accent: '#00E5FF',
      accent2: '#FF6B35',
      border: 'rgba(0, 229, 255, 0.22)',
      panel: 'rgba(8, 13, 18, 0.78)'
    },
    typography: { display: CARD_DISPLAY_STACK, label: CARD_MONO_STACK, weightDisplay: 800 },
    map: {
      enabled: true,
      provider: 'cyclosm',
      treatment: 'duotone',
      shadow: '#05090D',
      highlight: '#2C4A57',
      wash: 'rgba(4, 8, 12, 0.45)',
      opacity: 1,
      maxZoom: 16
    },
    grain: 0.055,
    route: { glow: 'rgba(0, 229, 255, 0.45)', main: '#00E5FF', core: 'rgba(255,255,255,0.92)', width: 9, marker: '#FF6B35' }
  },
  {
    id: 'paper-topo',
    label: 'Paper Topo',
    tagline: 'Peta kertas, kontur sage, rapi',
    swatch: ['#F6F3EC', '#2B4E30', '#966025'],
    layout: 'editorial',
    palette: {
      bgTop: '#F7F4ED',
      bgBottom: '#EFEAE0',
      ink: '#1B2620',
      muted: '#6F7C70',
      accent: '#2B4E30',
      accent2: '#966025',
      border: 'rgba(43, 78, 48, 0.28)',
      panel: 'rgba(255, 255, 255, 0.55)'
    },
    typography: { display: CARD_SERIF_STACK, label: CARD_MONO_STACK, weightDisplay: 700 },
    map: {
      enabled: true,
      provider: 'osm',
      treatment: 'duotone',
      shadow: '#E4DFD2',
      highlight: '#7F9279',
      wash: 'rgba(247, 244, 237, 0.35)',
      opacity: 1,
      maxZoom: 16
    },
    grain: 0.03,
    route: { glow: 'rgba(43, 78, 48, 0.22)', main: '#2B4E30', core: 'rgba(255,255,255,0.55)', width: 10, marker: '#B8561B' }
  },
  {
    id: 'brutalist-mono',
    label: 'Brutalist Mono',
    tagline: 'Tanpa peta. Angka besar, garis tegas.',
    swatch: ['#FFFFFF', '#0D1117', '#D0C9BF'],
    layout: 'brutalist',
    palette: {
      bgTop: '#FFFFFF',
      bgBottom: '#F4F2EE',
      ink: '#0D1117',
      muted: '#5B6470',
      accent: '#0D1117',
      accent2: '#B8561B',
      border: 'rgba(13, 17, 23, 0.85)',
      panel: 'rgba(255, 255, 255, 0.9)'
    },
    typography: { display: CARD_MONO_STACK, label: CARD_MONO_STACK, weightDisplay: 700 },
    map: { enabled: false, provider: 'osm', treatment: 'none', maxZoom: 16 },
    grain: 0.015,
    route: { glow: 'rgba(13, 17, 23, 0.16)', main: '#0D1117', core: 'rgba(255,255,255,0.7)', width: 12, marker: '#B8561B' }
  }
];

function getCardSize(id) {
  return CARD_SIZES[id] || CARD_SIZES.story;
}

function getCardTemplate(id) {
  return CARD_TEMPLATES.find(template => template.id === id) || CARD_TEMPLATES[0];
}

/**
 * Everything the layout functions need, scaled from the 1080 px design width.
 */
function metricsFor(size) {
  const width = Number(size && size.width) || 1080;
  const height = Number(size && size.height) || 1920;
  const base = width / 1080;
  return {
    base,
    width,
    height,
    pad: Math.round(64 * base),
    framePad: Math.round(34 * base),
    radius: Math.round(30 * base),
    labelFont: Math.round(21 * base),
    metaFont: Math.round(24 * base),
    titleFont: Math.round(66 * base),
    heroFont: Math.round(Math.min(190 * base, height * 0.135)),
    metricFont: Math.round(58 * base),
    captionFont: Math.round(23 * base),
    footerFont: Math.round(19 * base),
    gutter: Math.round(28 * base)
  };
}

const CARD_TEMPLATE_API = {
  CARD_DISPLAY_STACK,
  CARD_MONO_STACK,
  CARD_SERIF_STACK,
  CARD_SIZES,
  CARD_SIZE_ORDER,
  CARD_TEMPLATES,
  getCardSize,
  getCardTemplate,
  metricsFor
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CARD_TEMPLATE_API;
}
if (typeof window !== 'undefined') {
  window.CardTemplates = CARD_TEMPLATE_API;
}