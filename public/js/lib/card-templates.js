/**
 * CycloPon Activity Card — themes & canvas sizes.
 *
 * Distinct looks spanning dark telemetry, paper editorial, and offline graphic styles:
 *   night-neon       — dark, cyan glow, duotone basemap
 *   paper-topo       — warm paper, sage route, editorial serif
 *   brutalist-mono   — white, black hairlines, monospace, no basemap
 *   peloton-emerald  — deep forest green & signal lime
 *   gravel-clay      — warm sand & terracotta gravel mood
 *   audax-blueprint  — technical navy blueprint, no basemap
 *   crimson-crit     — carbon dark & criterium red
 *   dawn-gold        — sunrise paper, slate ink & warm amber
 *
 * Plain data + tiny helpers only; the renderer owns all drawing.
 */

const CARD_DISPLAY_STACK = '"Barlow", "Plus Jakarta Sans", "Segoe UI", system-ui, -apple-system, sans-serif';
const CARD_MONO_STACK = '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
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
    tagline: 'Gelap, glow cyan & oranye',
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
    tagline: 'Peta kertas, kontur sage',
    swatch: ['#F6F3EC', '#2B4E30', '#966025'],
    layout: 'editorial',
    palette: {
      bgTop: '#F7F4ED',
      bgBottom: '#EFEAE0',
      mapBg: '#EDE7D9',
      ink: '#1B2620',
      muted: '#556157',
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
    tagline: 'Tanpa peta, angka tegas',
    swatch: ['#FFFFFF', '#0D1117', '#D0C9BF'],
    layout: 'brutalist',
    palette: {
      bgTop: '#FFFFFF',
      bgBottom: '#F4F2EE',
      artBg: '#FBFAF7',
      ink: '#0D1117',
      muted: '#5B6470',
      accent: '#0D1117',
      accent2: '#B8561B',
      border: 'rgba(13, 17, 23, 0.85)',
      panel: 'rgba(255, 255, 255, 0.9)',
      footerBg: '#0D1117',
      footerInk: '#FFFFFF'
    },
    typography: { display: CARD_MONO_STACK, label: CARD_MONO_STACK, weightDisplay: 700 },
    map: { enabled: false, provider: 'osm', treatment: 'none', maxZoom: 16 },
    grain: 0.015,
    route: { glow: 'rgba(13, 17, 23, 0.16)', main: '#0D1117', core: 'rgba(255,255,255,0.7)', width: 12, marker: '#B8561B' }
  },
  {
    id: 'peloton-emerald',
    label: 'CycloPon Verde',
    tagline: 'Forest gelap & lime balap',
    swatch: ['#0B1A11', '#A3E635', '#E8F5E9'],
    layout: 'panel-bottom',
    palette: {
      bgTop: '#0A170F',
      bgBottom: '#11261A',
      ink: '#F2F7F2',
      muted: '#9CB8A3',
      accent: '#A3E635',
      accent2: '#F59E0B',
      border: 'rgba(163, 230, 53, 0.24)',
      panel: 'rgba(10, 23, 15, 0.8)'
    },
    typography: { display: CARD_DISPLAY_STACK, label: CARD_MONO_STACK, weightDisplay: 800 },
    map: {
      enabled: true,
      provider: 'cyclosm',
      treatment: 'duotone',
      shadow: '#08130C',
      highlight: '#355E43',
      wash: 'rgba(8, 19, 12, 0.44)',
      opacity: 1,
      maxZoom: 16
    },
    grain: 0.045,
    route: { glow: 'rgba(163, 230, 53, 0.42)', main: '#A3E635', core: 'rgba(255,255,255,0.9)', width: 9, marker: '#F59E0B' }
  },
  {
    id: 'gravel-clay',
    label: 'Gravel Clay',
    tagline: 'Nuansa tanah & terakota',
    swatch: ['#F4EDE2', '#C2410C', '#4D6B4A'],
    layout: 'editorial',
    palette: {
      bgTop: '#F6F0E6',
      bgBottom: '#EAE0D0',
      mapBg: '#E6DAC8',
      ink: '#261C15',
      muted: '#6E5A4C',
      accent: '#9A3412',
      accent2: '#4D6B4A',
      border: 'rgba(154, 52, 18, 0.28)',
      panel: 'rgba(255, 250, 244, 0.6)'
    },
    typography: { display: CARD_DISPLAY_STACK, label: CARD_MONO_STACK, weightDisplay: 800 },
    map: {
      enabled: true,
      provider: 'osm',
      treatment: 'duotone',
      shadow: '#DFD2BF',
      highlight: '#8D745C',
      wash: 'rgba(246, 240, 230, 0.32)',
      opacity: 1,
      maxZoom: 16
    },
    grain: 0.035,
    route: { glow: 'rgba(154, 52, 18, 0.24)', main: '#C2410C', core: 'rgba(255,248,240,0.65)', width: 10, marker: '#3F6212' }
  },
  {
    id: 'audax-blueprint',
    label: 'Audax Blueprint',
    tagline: 'Tanpa peta, biru teknis',
    swatch: ['#0B1F3A', '#7DD3FC', '#FBBF24'],
    layout: 'brutalist',
    palette: {
      bgTop: '#0B1F3A',
      bgBottom: '#08172B',
      artBg: '#0E284B',
      ink: '#F0F7FF',
      muted: '#9EC5EB',
      accent: '#7DD3FC',
      accent2: '#FBBF24',
      border: 'rgba(125, 211, 252, 0.65)',
      panel: 'rgba(11, 31, 58, 0.9)',
      footerBg: '#FBBF24',
      footerInk: '#0B1F3A'
    },
    typography: { display: CARD_MONO_STACK, label: CARD_MONO_STACK, weightDisplay: 700 },
    map: { enabled: false, provider: 'osm', treatment: 'none', maxZoom: 16 },
    grain: 0.02,
    route: { glow: 'rgba(125, 211, 252, 0.35)', main: '#7DD3FC', core: '#FFFFFF', width: 11, marker: '#FBBF24' }
  },
  {
    id: 'crimson-crit',
    label: 'Criterium Red',
    tagline: 'Karbon gelap, merah balap',
    swatch: ['#121317', '#EF4444', '#F8FAFC'],
    layout: 'panel-bottom',
    palette: {
      bgTop: '#111216',
      bgBottom: '#1B1C22',
      ink: '#F8FAFC',
      muted: '#A1A8B3',
      accent: '#F87171',
      accent2: '#FBBF24',
      border: 'rgba(248, 113, 113, 0.28)',
      panel: 'rgba(17, 18, 22, 0.82)'
    },
    typography: { display: CARD_DISPLAY_STACK, label: CARD_MONO_STACK, weightDisplay: 800 },
    map: {
      enabled: true,
      provider: 'cyclosm',
      treatment: 'duotone',
      shadow: '#110E10',
      highlight: '#4D363A',
      wash: 'rgba(14, 14, 18, 0.48)',
      opacity: 1,
      maxZoom: 16
    },
    grain: 0.05,
    route: { glow: 'rgba(239, 68, 68, 0.45)', main: '#EF4444', core: 'rgba(255,255,255,0.9)', width: 9, marker: '#FBBF24' }
  },
  {
    id: 'dawn-gold',
    label: 'Dawn Gold',
    tagline: 'Fajar hangat, emas & navy',
    swatch: ['#FAF5EB', '#1E3A5F', '#D97706'],
    layout: 'editorial',
    palette: {
      bgTop: '#FAF5EB',
      bgBottom: '#F1E8D7',
      mapBg: '#EAE0CC',
      ink: '#162235',
      muted: '#526073',
      accent: '#1E3A5F',
      accent2: '#B45309',
      border: 'rgba(30, 58, 95, 0.28)',
      panel: 'rgba(255, 252, 245, 0.6)'
    },
    typography: { display: CARD_DISPLAY_STACK, label: CARD_MONO_STACK, weightDisplay: 800 },
    map: {
      enabled: true,
      provider: 'osm',
      treatment: 'duotone',
      shadow: '#E7DEC9',
      highlight: '#8091A6',
      wash: 'rgba(250, 245, 235, 0.34)',
      opacity: 1,
      maxZoom: 16
    },
    grain: 0.025,
    route: { glow: 'rgba(217, 119, 6, 0.26)', main: '#D97706', core: 'rgba(255,255,255,0.68)', width: 10, marker: '#1E3A5F' }
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