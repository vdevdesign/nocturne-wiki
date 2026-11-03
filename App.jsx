const { createElement: h } = React;

const nocturneThemes = ['nocturne', 'dracula', 'alucard', 'sylvan', 'steampunk', 'frost', 'starlight', 'lush', 'mystic', 'potion', 'underdark'];
const savedTheme = (() => {
  try { return window.localStorage.getItem('nocturne-theme'); } catch (_) { return null; }
})();
const savedSidebarWidth = (() => {
  try { return Number(window.localStorage.getItem('nocturne-sidebar-width')) || 260; } catch (_) { return 260; }
})();
const savedSidebarCollapsed = (() => {
  try { return window.localStorage.getItem('nocturne-sidebar-collapsed') === 'true'; } catch (_) { return false; }
})();

function applySidebarWidth(width) {
  const nextWidth = Math.min(420, Math.max(220, Number(width) || 260));
  document.documentElement.style.setProperty('--sidebar-width', `${nextWidth}px`);
  try { window.localStorage.setItem('nocturne-sidebar-width', String(nextWidth)); } catch (_) { /* private browsing */ }
  updateBackgroundLayerBounds();
}

applySidebarWidth(savedSidebarWidth);

function setSidebarCollapsed(collapsed) {
  const sidebar = document.getElementById('appSidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed', collapsed);
  const toggle = document.getElementById('sidebarCollapseToggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Expand navigation menu' : 'Collapse navigation menu');
    toggle.textContent = collapsed ? '›' : '‹';
  }
  try { window.localStorage.setItem('nocturne-sidebar-collapsed', String(collapsed)); } catch (_) { /* private browsing */ }
  updateBackgroundLayerBounds();
}

function startSidebarResize(event) {
  if (window.matchMedia('(max-width: 560px)').matches) return;
  event.preventDefault();
  const sidebar = document.getElementById('appSidebar');
  if (!sidebar) return;
  const startX = event.clientX;
  const startWidth = sidebar.getBoundingClientRect().width;
  const handleMove = moveEvent => applySidebarWidth(startWidth + moveEvent.clientX - startX);
  const stopResize = () => {
    document.body.classList.remove('sidebar-resizing');
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', stopResize);
  };
  document.body.classList.add('sidebar-resizing');
  window.addEventListener('pointermove', handleMove);
  window.addEventListener('pointerup', stopResize, { once: true });
}

function setNocturneTheme(theme) {
  const nextTheme = nocturneThemes.includes(theme) ? theme : 'nocturne';

  document.documentElement.dataset.theme = nextTheme;
  try { window.localStorage.setItem('nocturne-theme', nextTheme); } catch (_) { /* private browsing */ }
  if (typeof window.persistNocturneTheme === 'function') window.persistNocturneTheme(nextTheme);
  // Override: clear per-user color tweaks and custom CSS so the premade
  // theme shows exactly as designed.
  window.nocturneColorOverrides = {};
  applyColorOverrides();
  applyNocturneCustomCss('');
  markAppearanceSaved();
  if (typeof window.setNocturneCustomCss === 'function') {
    // ensure the editor textarea syncs to the cleared state
    window.dispatchEvent(new CustomEvent('nocturne-custom-css-updated'));
  }
  window.dispatchEvent(new CustomEvent('nocturne-theme-updated'));
  return true;
}

// Signed-out screens always use the standard theme. The account preference is
// loaded after authentication by onSignedIn().
// DEFERRED to the DOMContentLoaded handler below: calling setNocturneTheme at
// top-level runs BEFORE window.nocturneSwatches exists (declared further down),
// crashing applyColorOverrides ('forEach' of undefined) => blank purple page.
window.setNocturneTheme = setNocturneTheme;
// (The setter itself dispatches 'nocturne-theme-updated'; no wrapper needed.)

function Sigil({ size = 40 }) {
  return h('svg', { width: size, height: size, viewBox: '0 0 40 40', fill: 'none', 'aria-hidden': true },
    h('circle', { cx: 20, cy: 20, r: 17, stroke: 'var(--gold-dim)', strokeWidth: 1.2 }),
    h('circle', { cx: 20, cy: 20, r: 12, stroke: 'var(--gold)', strokeWidth: 0.8, strokeDasharray: '2 3' }),
    h('path', { d: 'M20 6 L20 12 M20 28 L20 34 M6 20 L12 20 M28 20 L34 20', stroke: 'var(--gold-dim)', strokeWidth: 1 }),
    h('path', { d: 'M14 9 L24 31', stroke: 'var(--rose)', strokeWidth: 0.8, opacity: 0.6 }),
    h('circle', { cx: 20, cy: 20, r: 2.2, fill: 'var(--gold)' })
  );
}

function AuthScreen() {
  return h('div', { id: 'authScreen' },
    h('div', { className: 'auth-box' },
      h(Sigil, { size: 52 }),
      h('h1', null, 'Nocturne'),
      h('p', { className: 'tagline' }, 'Sign in to reach the campaign hub.'),
      h('div', { className: 'auth-tabs' },
        h('button', { type: 'button', id: 'tabSignIn', className: 'active', onClick: () => window.setAuthMode('signin') }, 'Sign In'),
        h('button', { type: 'button', id: 'tabSignUp', onClick: () => window.setAuthMode('signup') }, 'Sign Up')
      ),
      h('form', { id: 'authForm', onSubmit: event => window.handleAuthSubmit(event) },
        h('label', { htmlFor: 'authUsername' }, 'Username'),
        h('input', { type: 'text', id: 'authUsername', placeholder: 'Character First Name', required: true }),
        h('label', { htmlFor: 'authPass' }, 'Password'),
        h('div', { className: 'password-field' },
          h('input', { type: 'password', id: 'authPass', autoComplete: 'current-password', placeholder: '•••••••••' }),
          h('button', { type: 'button', className: 'password-toggle', id: 'authPasswordToggle', 'aria-label': 'Show password', 'aria-pressed': 'false', onClick: () => window.toggleAuthPassword() }, 'Show')
        ),
        h('button', { type: 'submit', className: 'btn', id: 'authSubmitBtn' }, 'Sign In'),
        h('div', { className: 'auth-error', id: 'authError' })
      ),
      h('button', { type: 'button', className: 'auth-link', id: 'forgotPasswordBtn', onClick: () => window.handleForgotPassword() }, 'Request a password reset'),
      h('button', { type: 'button', className: 'btn btn-secondary', id: 'devSignInBtn', style: { display: window.location.protocol === 'file:' ? 'block' : 'none', width: '100%', marginTop: 8 }, onClick: () => window.enterDevMode() }, 'Dev Preview (Offline)'),
      h('p', { className: 'auth-note', id: 'authNote' }, 'New players: use Sign Up to create an account. Everyone starts as a player — the DM promotes accounts manually in Supabase.')
    )
  );
}

const navigation = [
  ['home', 'Home', '⌂'], ['characters', 'Players', '♙'],
  ['loot', 'Inventory', '◈'], ['npcs', 'NPCs & Friendship Points', '♧'],
  ['common-rooms', 'Common Rooms', '✧'], ['games', 'House Games', '✦'], ['quest-board', 'Quest & Rumor Board', '⚑'], ['summaries', 'Session Summaries', '≡'],
  ['worldbook', 'Worldbook', '◇'], ['primer', 'Player Primer', '✦']
];

let currentPage = window.history.state?.nocturnePage || null;
let navigationIndex = Number.isInteger(window.history.state?.nocturneIndex)
  ? window.history.state.nocturneIndex
  : 0;

function updateBackButtons(showBack) {
  document.querySelectorAll('#react-root .page-back-button').forEach(button => {
    button.hidden = !showBack || navigationIndex <= 0;
  });
}

function renderPage(target, showBack = false) {
  window.setMobileNavOpen(false);
  currentPage = target;
  document.documentElement.classList.toggle('theme-studio-fullscreen', target === 'theme-studio');
  document.getElementById('appMain')?.classList.toggle('session-chats-active', target === 'session-chats');
  window.localStorage.setItem('nocturne-active-page', target);
  document.querySelectorAll('#react-root .navlist button[data-target]').forEach(button => {
    button.classList.toggle('active', button.dataset.target === target);
  });
  document.querySelectorAll('#react-root main section').forEach(section => {
    section.classList.toggle('active', section.id === target);
  });
  updateBackButtons(showBack);
  if (target === 'home') window.loadDashboard();
  if (target === 'common-rooms') window.loadCommonRoom();
  if (target === 'session-chats' && window.loadSessionChatPage) window.loadSessionChatPage();
  if (target === 'games' && window.refreshGames) window.refreshGames();
}

function navigateTo(target, showBack = false) {
  if (target === currentPage) {
    renderPage(target, showBack);
    return;
  }

  navigationIndex = currentPage === null ? 0 : navigationIndex + 1;
  const state = {
    ...(window.history.state || {}),
    nocturnePage: target,
    nocturneIndex: navigationIndex,
    nocturneShowBack: showBack
  };
  if (currentPage === null) {
    window.history.replaceState(state, '', window.location.href);
  } else {
    window.history.pushState(state, '', window.location.href);
  }
  renderPage(target, showBack);
}

function navigateBack() {
  if (navigationIndex > 0) window.history.back();
}

window.navigateBack = navigateBack;
window.navigateTo = navigateTo;

window.addEventListener('popstate', event => {
  const { nocturnePage, nocturneIndex, nocturneShowBack } = event.state || {};
  if (typeof nocturnePage !== 'string' || !document.getElementById(nocturnePage)) return;
  navigationIndex = Number.isInteger(nocturneIndex) ? nocturneIndex : 0;
  renderPage(nocturnePage, nocturneShowBack === true);
});

function setMobileNavOpen(open) {
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('mobileNavBackdrop');
  const toggle = document.getElementById('mobileNavToggle');
  if (!sidebar || !backdrop || !toggle) return;

  const wasOpen = sidebar.classList.contains('open');
  const isOpen = open && window.matchMedia('(max-width: 560px)').matches;
  sidebar.classList.toggle('open', isOpen);
  backdrop.classList.toggle('open', isOpen);
  toggle.setAttribute('aria-expanded', String(isOpen));
  toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
  document.body.classList.toggle('mobile-nav-open', isOpen);
  updateBackgroundLayerBounds();

  if (isOpen) {
    const closeButton = sidebar.querySelector('.mobile-nav-close');
    if (closeButton) closeButton.focus();
  } else if (wasOpen && window.matchMedia('(max-width: 560px)').matches) {
    toggle.focus();
  }
}

window.setMobileNavOpen = setMobileNavOpen;
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') setMobileNavOpen(false);
});
window.addEventListener('resize', () => {
  if (!window.matchMedia('(max-width: 560px)').matches) setMobileNavOpen(false);
  // Solo motif tracks viewport size; tiled geometry is size-independent.
  const state = window.nocturnePatternState;
  if (state && state.soloMain) applyPatternGeometry();
});

/* ============ Appearance state: pattern geometry, colors, brightness ============ */

// Range constants live at the TOP of this section — every clamp() call below
// (including the ones inside initAppearanceState, which runs immediately)
// depends on them. Keep any new range consts above their first use.
const PATTERN_MIN = 90, PATTERN_MAX = 240;
const SVG_MIN = 40, SVG_MAX = 120;   // % of tile the motif may occupy
const GRID_MIN = 1, GRID_MAX = 12;   // motif repeats per tile axis
const MOTIF_SIZE_MIN = 10, MOTIF_SIZE_MAX = 200;
const OPACITY_MIN = 4, OPACITY_MAX = 70;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

window.nocturnePatternState = { flames: true, tilt: -7.5, tile: 140, svgSize: 70, gridCols: 1, gridRows: 1, opacity: 45, layout: 'stagger', soloMain: false, sidebarPattern: true, noBackground: false, sidebarMatchMain: true, motif: 'dragon', animateMotif: true,
  // Dual-editor background state: independent sidebar/main settings. Each
  // layer picks its own motif, grid density (which LITERALLY dictates how
  // many motif copies repeat across the layer), opacity, tiled-vs-single
  // mode, and fixed-vs-scrolling attachment.
  sidebar: { motif: 'fireflies', gridCols: 2, gridRows: 2, opacity: 35, size: 85, tilt: 0, alignX: 0, alignY: 0, single: false, sticky: true },
  main: { motif: 'dragon', gridCols: 1, gridRows: 1, opacity: 45, size: 100, tilt: 0, alignX: 0, alignY: 0, single: true, sticky: true }
};
window.nocturneColorOverrides = {};
window.nocturneSidebarColorOverrides = {};
window.nocturneMainColorOverrides = {};
window.nocturneCustomCss = '';

// Declared BEFORE initAppearanceState() runs below — it validates stored
// overrides against this list.
window.nocturneSwatches = [
  { varName: '--bg', label: 'Page background', description: 'The site-wide page background color.' },
  { varName: '--bg-alt', label: 'Alternate background', description: 'Secondary page surfaces, including the navigation sidebar.' },
  { varName: '--surface', label: 'Card surface', description: 'The base fill for cards, panels, and raised controls.' },
  { varName: '--surface-2', label: 'Raised surface', description: 'A contrasting surface used for selected cards, inputs, and motif fills.' },
  { varName: '--line', label: 'Borders', description: 'The color of borders, dividers, and outlines.' },
  { varName: '--text', label: 'Primary text', description: 'Main headings, labels, and body text.' },
  { varName: '--text-dim', label: 'Secondary text', description: 'Supporting copy and less prominent labels.' },
  { varName: '--text-faint', label: 'Muted text', description: 'Subtle hints, metadata, and placeholder text.' },
  { varName: '--gold', label: 'Accent', description: 'Primary accent used for highlights, links, and decorative strokes.' },
  { varName: '--gold-dim', label: 'Accent glow', description: 'Muted accent used for glows, focus rings, and softer details.' },
  { varName: '--purple', label: 'Secondary accent', description: 'Secondary highlight color for selected controls and decorative details.' },
  { varName: '--purple-dim', label: 'Muted secondary accent', description: 'Soft secondary accents and subdued control states.' },
  { varName: '--rose', label: 'Flame / warning', description: 'Fire colors and warning or destructive-action accents.' },
  { varName: '--rose-dim', label: 'Muted flame', description: 'Soft fire accents and muted warning backgrounds.' },
  { varName: '--text-main', label: 'Text on accent', description: 'Foreground color intended for text over strongly colored surfaces.' },
  { varName: '--symbol', label: 'Navigation symbols', description: 'Icons and symbols in the navigation sidebar.' },
  { varName: '--button-text', label: 'Button text', description: 'Foreground text on filled buttons.' },
  { varName: '--session-note', label: 'Session notes', description: 'Text color used for session-note content.' },
  { varName: '--glow-primary', label: 'Primary page glow', description: 'The first soft radial glow behind the page.' },
  { varName: '--glow-secondary', label: 'Secondary page glow', description: 'The secondary soft radial glow behind the page.' }
];

function emitAppearanceChange() {
  window.dispatchEvent(new CustomEvent('nocturne-pattern-updated'));
  window.dispatchEvent(new CustomEvent('nocturne-theme-updated'));
}

function readAppearancePref(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (_) { return fallback; }
}

(function initAppearanceState() {
  let backgroundDefaultsMigrated = false;
  let dragonHeroDefaultMigrated = false;
  let sidebarFirefliesDefaultMigrated = false;
  try {
    backgroundDefaultsMigrated = window.localStorage.getItem('nocturne-background-default-off-v1') === 'true';
    dragonHeroDefaultMigrated = window.localStorage.getItem('nocturne-background-dragon-hero-v2') === 'true';
    sidebarFirefliesDefaultMigrated = window.localStorage.getItem('nocturne-background-sidebar-fireflies-v1') === 'true';
  } catch (_) { /* private browsing */ }
  const stored = readAppearancePref('nocturne-pattern-state', null);
  if (!backgroundDefaultsMigrated) {
    if (stored && typeof stored === 'object') {
      stored.noBackground = true;
      stored.sidebarPattern = false;
      try { window.localStorage.setItem('nocturne-pattern-state', JSON.stringify(stored)); } catch (_) { /* private browsing */ }
    }
    try { window.localStorage.setItem('nocturne-background-default-off-v1', 'true'); } catch (_) { /* private browsing */ }
  }
  if (!dragonHeroDefaultMigrated) {
    const applyDragonHeroDefaults = pattern => {
      if (!pattern || typeof pattern !== 'object') return;
      pattern.noBackground = false;
      pattern.sidebarPattern = false;
      pattern.motif = 'dragon';
      pattern.opacity = 45;
      pattern.main = {
        ...(pattern.main && typeof pattern.main === 'object' ? pattern.main : {}),
        motif: 'dragon',
        gridCols: 1,
        gridRows: 1,
        opacity: 45,
        size: 100,
        single: true
      };
    };
    if (stored && typeof stored === 'object') {
      applyDragonHeroDefaults(stored);
      try { window.localStorage.setItem('nocturne-pattern-state', JSON.stringify(stored)); } catch (_) { /* private browsing */ }
    }
    const settled = readAppearancePref('nocturne-settled-snapshot', null);
    if (settled && typeof settled === 'object') {
      applyDragonHeroDefaults(settled.pattern);
      try { window.localStorage.setItem('nocturne-settled-snapshot', JSON.stringify(settled)); } catch (_) { /* private browsing */ }
    }
    try { window.localStorage.setItem('nocturne-background-dragon-hero-v2', 'true'); } catch (_) { /* private browsing */ }
  }
  if (!sidebarFirefliesDefaultMigrated) {
    const applySidebarFireflyDefaults = pattern => {
      if (!pattern || typeof pattern !== 'object') return;
      const sidebar = pattern.sidebar && typeof pattern.sidebar === 'object' ? pattern.sidebar : null;
      const wasDefault = pattern.sidebarPattern === false && (!sidebar || sidebar.motif === 'candelabra');
      if (wasDefault) {
        pattern.sidebarPattern = true;
        pattern.sidebar = { ...(sidebar || {}), motif: 'fireflies' };
      }
    };
    if (stored && typeof stored === 'object') {
      applySidebarFireflyDefaults(stored);
      try { window.localStorage.setItem('nocturne-pattern-state', JSON.stringify(stored)); } catch (_) { /* private browsing */ }
    }
    const settled = readAppearancePref('nocturne-settled-snapshot', null);
    if (settled && typeof settled === 'object') {
      applySidebarFireflyDefaults(settled.pattern);
      try { window.localStorage.setItem('nocturne-settled-snapshot', JSON.stringify(settled)); } catch (_) { /* private browsing */ }
    }
    try { window.localStorage.setItem('nocturne-background-sidebar-fireflies-v1', 'true'); } catch (_) { /* private browsing */ }
  }
  if (stored && typeof stored === 'object') {
    const s = window.nocturnePatternState;
    if (typeof stored.flames === 'boolean') s.flames = stored.flames;
    if (Number.isFinite(stored.tilt)) s.tilt = clamp(stored.tilt, -25, 25);
    if (Number.isFinite(stored.tile)) s.tile = clamp(stored.tile, PATTERN_MIN, PATTERN_MAX);
    if (Number.isFinite(stored.svgSize)) s.svgSize = clamp(stored.svgSize, SVG_MIN, SVG_MAX);
    if (Number.isFinite(stored.gridCols)) s.gridCols = clamp(Math.round(stored.gridCols), GRID_MIN, GRID_MAX);
    if (Number.isFinite(stored.gridRows)) s.gridRows = clamp(Math.round(stored.gridRows), GRID_MIN, GRID_MAX);
    if (typeof stored.soloMain === 'boolean') s.soloMain = stored.soloMain;
    if (typeof stored.sidebarPattern === 'boolean') s.sidebarPattern = stored.sidebarPattern;
    if (typeof stored.noBackground === 'boolean') s.noBackground = stored.noBackground;
    if (typeof stored.sidebarMatchMain === 'boolean') s.sidebarMatchMain = stored.sidebarMatchMain;
    if (    ['candelabra', 'fleur', 'fish', 'fireflies', 'dragon'].includes(stored.motif)) s.motif = stored.motif;
    if (typeof stored.animateMotif === 'boolean') s.animateMotif = stored.animateMotif;
    if (Number.isFinite(stored.opacity)) s.opacity = clamp(stored.opacity, OPACITY_MIN, OPACITY_MAX);
    if (stored.layout === 'grid' || stored.layout === 'stagger') s.layout = stored.layout;
    // Restore per-layer dual-editor settings (sidebar / main backgrounds).
    ['sidebar', 'main'].forEach(layer => {
      const src = stored[layer];
      if (!src || typeof src !== 'object') return;
      const dst = s[layer];
      if (['candelabra', 'fleur', 'fish', 'fireflies', 'dragon'].includes(src.motif)) dst.motif = src.motif;
      if (Number.isFinite(src.gridCols)) dst.gridCols = clamp(Math.round(src.gridCols), GRID_MIN, GRID_MAX);
      if (Number.isFinite(src.gridRows)) dst.gridRows = clamp(Math.round(src.gridRows), GRID_MIN, GRID_MAX);
      if (Number.isFinite(src.opacity)) dst.opacity = clamp(Math.round(src.opacity), OPACITY_MIN, OPACITY_MAX);
      if (Number.isFinite(src.size)) dst.size = clamp(Math.round(src.size), MOTIF_SIZE_MIN, MOTIF_SIZE_MAX);
      if (Number.isFinite(src.tilt)) dst.tilt = clamp(Math.round(src.tilt), -180, 180);
      if (Number.isFinite(src.alignX)) dst.alignX = clamp(Math.round(src.alignX), -50, 50);
      if (Number.isFinite(src.alignY)) dst.alignY = clamp(Math.round(src.alignY), -50, 50);
      if (typeof src.single === 'boolean') dst.single = src.single;
      if (typeof src.sticky === 'boolean') dst.sticky = src.sticky;
    });
  }
  const overrides = readAppearancePref('nocturne-color-overrides', {});
  if (overrides && typeof overrides === 'object' && Array.isArray(window.nocturneSwatches)) {
    window.nocturneSwatches.forEach(({ varName }) => {
      const value = overrides[varName];
      if (typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value)) window.nocturneColorOverrides[varName] = value;
    });
  }
  const sidebarOverrides = readAppearancePref('nocturne-sidebar-color-overrides', {});
  if (sidebarOverrides && typeof sidebarOverrides === 'object') {
    window.nocturneSwatches.forEach(({ varName }) => {
      const color = sidebarOverrides[varName];
      if (typeof color === 'string' && /^#[0-9a-f]{3,8}$/i.test(color)) window.nocturneSidebarColorOverrides[varName] = color;
    });
  }
  const mainOverrides = readAppearancePref('nocturne-main-color-overrides', {});
  if (mainOverrides && typeof mainOverrides === 'object') {
    window.nocturneSwatches.forEach(({ varName }) => {
      const color = mainOverrides[varName];
      if (typeof color === 'string' && /^#[0-9a-f]{3,8}$/i.test(color)) window.nocturneMainColorOverrides[varName] = color;
    });
  }
  const css = readAppearancePref('nocturne-custom-css', '');
  if (typeof css === 'string') window.nocturneCustomCss = css.slice(0, 4000);
})();

function persistAppearanceState() {
  try {
    window.localStorage.setItem('nocturne-pattern-state', JSON.stringify(window.nocturnePatternState));
    window.localStorage.setItem('nocturne-color-overrides', JSON.stringify(window.nocturneColorOverrides));
    window.localStorage.setItem('nocturne-sidebar-color-overrides', JSON.stringify(window.nocturneSidebarColorOverrides));
    window.localStorage.setItem('nocturne-main-color-overrides', JSON.stringify(window.nocturneMainColorOverrides));
    window.localStorage.setItem('nocturne-custom-css', window.nocturneCustomCss);
  } catch (_) { /* private browsing */ }
  if (typeof window.persistNocturneTheme === 'function') window.persistNocturneTheme(document.documentElement.dataset.theme);
}

/* ======== Persisted appearance baseline ======== */

function captureAppearanceSnapshot() {
  return JSON.stringify({
    pattern: window.nocturnePatternState,
    colors: window.nocturneColorOverrides,
    sidebarColors: window.nocturneSidebarColorOverrides,
    mainColors: window.nocturneMainColorOverrides,
    css: window.nocturneCustomCss,
    brightness: document.documentElement.dataset.brightness || 'dark'
  });
}

function markAppearanceSaved() {
  const snapshot = captureAppearanceSnapshot();
  try { window.localStorage.setItem('nocturne-settled-snapshot', snapshot); } catch (_) {}
}

window.markAppearanceSaved = markAppearanceSaved;

// Reloading the page DISCARDS unsaved edits by design: start every session
// from the persisted settled baseline, wiping any leftover edit-state keys
// that a crash/close might have left behind.
(function resetUnsavedEditsOnLoad() {
  try {
    const settled = window.localStorage.getItem('nocturne-settled-snapshot');
    if (!settled) return;
    const baseline = JSON.parse(settled);
    if (!baseline || typeof baseline !== 'object') return;
    // Restore pattern/colors/CSS exactly as they were when last settled.
    if (baseline.pattern && typeof baseline.pattern === 'object') {
      try { window.localStorage.setItem('nocturne-pattern-state', JSON.stringify(baseline.pattern)); } catch (_) {}
    }
    if (baseline.colors && typeof baseline.colors === 'object') {
      try { window.localStorage.setItem('nocturne-color-overrides', JSON.stringify(baseline.colors)); } catch (_) {}
    }
    if (baseline.sidebarColors && typeof baseline.sidebarColors === 'object') {
      try { window.localStorage.setItem('nocturne-sidebar-color-overrides', JSON.stringify(baseline.sidebarColors)); } catch (_) {}
    }
    if (baseline.mainColors && typeof baseline.mainColors === 'object') {
      try { window.localStorage.setItem('nocturne-main-color-overrides', JSON.stringify(baseline.mainColors)); } catch (_) {}
    }
    const css = typeof baseline.css === 'string' ? baseline.css : '';
    try { window.localStorage.setItem('nocturne-custom-css', css); } catch (_) {}
    if (baseline.brightness) {
      try { window.localStorage.setItem('nocturne-brightness', baseline.brightness); } catch (_) {}
    }
  } catch (_) { /* malformed baseline — ignore */ }
})();

let dragonFlameAnimationFrame = 0;
const pausedMotifTimelines = new WeakSet();

// Drive nested SVG timelines explicitly so cloned Studio previews keep animating.
function updateDragonFlameAnimationDriver() {
  const state = window.nocturnePatternState;
  const canAnimate = state.animateMotif !== false
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    && [...document.querySelectorAll('.dragon-flames')].some(group =>
      group.querySelector('animateTransform')
      && !group.closest('.motif-animation-off')
      && group.getBoundingClientRect().width > 0
    );
  if (!canAnimate) {
    if (dragonFlameAnimationFrame) cancelAnimationFrame(dragonFlameAnimationFrame);
    dragonFlameAnimationFrame = 0;
    return;
  }
  if (dragonFlameAnimationFrame) return;

  const advanceDragonFlame = () => {
    dragonFlameAnimationFrame = 0;
    if (window.nocturnePatternState.animateMotif === false
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const time = performance.now() / 1000;
    const svgRoots = new Set();
    document.querySelectorAll('.dragon-flames').forEach(group => {
      if (group.querySelector('animateTransform')
        && !group.closest('.motif-animation-off')
        && group.getBoundingClientRect().width > 0) {
        svgRoots.add(group.ownerSVGElement);
      }
    });
    svgRoots.forEach(svg => svg.setCurrentTime(time));
    dragonFlameAnimationFrame = requestAnimationFrame(advanceDragonFlame);
  };
  dragonFlameAnimationFrame = requestAnimationFrame(advanceDragonFlame);
}
window.updateDragonFlameAnimationDriver = updateDragonFlameAnimationDriver;

function applyFlameGlow() {
  const state = window.nocturnePatternState;
  const motionLayers = [
    ...document.querySelectorAll('#nocturnePatternLayer, #sidebarPattern, .theme-preview-main-pattern, .theme-preview-sidebar-pattern')
  ];
  motionLayers.forEach(layer => layer.classList.toggle('flames-off', !state.flames));
  motionLayers.flatMap(layer => [...layer.querySelectorAll('.candelabra-flames, .dragon-flames')]).forEach(group => {
    group.style.filter = state.flames ? '' : 'none';
  });
}

function applyFlameAnimation() {
  const state = window.nocturnePatternState;
  const animAllowed = state.animateMotif !== false
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  applyFlameGlow();
  const motionLayers = [
    ...document.querySelectorAll('#nocturnePatternLayer, #sidebarPattern, .theme-preview-main-pattern, .theme-preview-sidebar-pattern')
  ];
  const svgTimelines = new Set(
    motionLayers.flatMap(layer => [...layer.querySelectorAll('animate, animateTransform')])
      .map(animation => animation.ownerSVGElement)
      .filter(Boolean)
  );
  svgTimelines.forEach(svg => {
    if (animAllowed && pausedMotifTimelines.has(svg) && typeof svg.unpauseAnimations === 'function') {
      svg.unpauseAnimations();
      pausedMotifTimelines.delete(svg);
    } else if (!animAllowed && typeof svg.pauseAnimations === 'function') {
      svg.pauseAnimations();
      pausedMotifTimelines.add(svg);
    }
  });
  updateDragonFlameAnimationDriver();
}
window.applyNocturnePatternAnimation = applyFlameAnimation;

function applyPatternGeometry() {
  const state = window.nocturnePatternState;
  const root = document.documentElement;
  // Opacity per layer now — global opacity stays as the shared default for
  // legacy snapshots; per-layer values (state.sidebar.opacity / state.main.opacity)
  // are applied at the bottom of this function.
  const op = (state.opacity / 100).toFixed(3);
  root.style.setProperty('--candelabra-pattern-opacity', op);
  root.style.setProperty('--candelabra-pattern-opacity-sidebar', op);
  root.style.setProperty('--candelabra-solo-opacity', op);
  // Sidebar pattern on/off + per-layer single-motif mode + no background.
  // "Single" now maps onto the existing solo-motif machinery: the main
  // layer's choice drives the viewport solo overlay, the sidebar's toggles
  // a sidebar-scoped single rendering.
  root.classList.toggle('sidebar-pattern-off', !state.sidebarPattern);
  root.classList.toggle('no-background', !!state.noBackground);
  // Rebuild each SVG from its own layer settings and theme-inheriting markup.
  ['sidebar', 'main'].forEach(layer => {
    const svg = document.querySelector(`#${layer === 'sidebar' ? 'sidebarPattern' : 'nocturnePatternLayer'} svg[data-layer="${layer}"]`);
    const layerElement = document.getElementById(layer === 'sidebar' ? 'sidebarPattern' : 'nocturnePatternLayer');
    const config = state[layer] || {};
    layerElement?.classList.toggle('fireflies-active', config.motif === 'fireflies');
    layerElement?.classList.toggle('motif-animation-off', state.animateMotif === false);
    layerElement?.style.setProperty('--firefly-offset-x', `${clamp(Number(config.alignX) || 0, -50, 50)}%`);
    layerElement?.style.setProperty('--firefly-offset-y', `${clamp(Number(config.alignY) || 0, -50, 50)}%`);
    if (!svg) return;
    const coordinateHeight = getLayerCoordinateHeight(layer, svg);
    svg.setAttribute('viewBox', `0 0 100 ${coordinateHeight}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.innerHTML = buildLayerSvgContent(layer, coordinateHeight);
    svg.dataset.coordinateHeight = String(coordinateHeight);
  });
  // Per-layer opacity + sticky(scroll) attachment via CSS variables.
  const sidebarCfg = state.sidebar || {};
  const mainCfg = state.main || {};
  root.style.setProperty('--nocturne-main-layer-position', mainCfg.sticky === false ? 'absolute' : 'fixed');
  root.style.setProperty('--nocturne-sidebar-layer-position', sidebarCfg.sticky === false ? 'absolute' : 'fixed');
  root.style.setProperty('--candelabra-pattern-opacity', ((Number.isFinite(mainCfg.opacity) ? mainCfg.opacity : state.opacity) / 100).toFixed(3));
  root.style.setProperty('--candelabra-pattern-opacity-sidebar', ((Number.isFinite(sidebarCfg.opacity) ? sidebarCfg.opacity : state.opacity) / 100).toFixed(3));
  root.style.setProperty('--candelabra-bg-attachment', mainCfg.sticky === false ? 'scroll' : 'fixed');
  root.style.setProperty('--candelabra-bg-attachment-sidebar', sidebarCfg.sticky === false ? 'scroll' : 'fixed');
  updateBackgroundLayerBounds();
}

function updateBackgroundLayerBounds() {
  const sidebar = document.getElementById('appSidebar');
  const mainPattern = document.getElementById('nocturnePatternLayer');
  const sidebarPattern = document.getElementById('sidebarPattern');
  const root = document.documentElement;
  const state = window.nocturnePatternState;
  if (!state) return;
  const isMobile = window.matchMedia('(max-width: 560px)').matches;
  const sidebarRect = sidebar?.getBoundingClientRect();
  const mainOffset = isMobile ? 0 : (sidebarRect?.width || 0);

  root.style.setProperty('--nocturne-main-left', `${mainOffset}px`);
  if (mainPattern) {
    const fixed = state.main?.sticky !== false;
    mainPattern.style.position = fixed ? 'fixed' : 'absolute';
    mainPattern.style.top = '0';
    mainPattern.style.left = `${mainOffset}px`;
    mainPattern.style.right = '0';
    mainPattern.style.bottom = fixed ? 'auto' : '0';
    mainPattern.style.height = fixed ? '100vh' : '100%';
  }
  if (sidebarPattern) {
    const fixed = state.sidebar?.sticky !== false;
    sidebarPattern.style.position = fixed ? 'fixed' : 'absolute';
    if (fixed && sidebarRect) {
      sidebarPattern.style.top = `${sidebarRect.top}px`;
      sidebarPattern.style.left = `${sidebarRect.left}px`;
      sidebarPattern.style.width = `${sidebarRect.width}px`;
      sidebarPattern.style.height = '100vh';
      sidebarPattern.style.right = 'auto';
      sidebarPattern.style.bottom = 'auto';
    } else {
      sidebarPattern.style.top = '0';
      sidebarPattern.style.left = '0';
      sidebarPattern.style.width = 'auto';
      sidebarPattern.style.height = 'auto';
      sidebarPattern.style.right = '0';
      sidebarPattern.style.bottom = '0';
    }
  }
  ['sidebar', 'main'].forEach(layer => refreshLayerSvgAspect(layer));
  applyFlameAnimation();
}

window.addEventListener('resize', updateBackgroundLayerBounds);
let observedBackgroundSidebar = null;
let sidebarBoundsObserver = null;
function observeSidebarForBackgroundBounds() {
  const sidebar = document.getElementById('appSidebar');
  if (!sidebar || sidebar === observedBackgroundSidebar || typeof ResizeObserver !== 'function') return;
  sidebarBoundsObserver?.disconnect();
  observedBackgroundSidebar = sidebar;
  sidebarBoundsObserver = new ResizeObserver(updateBackgroundLayerBounds);
  sidebarBoundsObserver.observe(sidebar);
}
if (typeof MutationObserver === 'function' && document.body) {
  const sidebarMountObserver = new MutationObserver(() => {
    if (document.getElementById('appSidebar') !== observedBackgroundSidebar) {
      observeSidebarForBackgroundBounds();
      if (observedBackgroundSidebar) updateBackgroundLayerBounds();
    }
  });
  sidebarMountObserver.observe(document.body, { childList: true, subtree: true });
}
document.addEventListener('transitionend', event => {
  if (event.target?.id === 'appSidebar' && event.propertyName === 'width') {
    updateBackgroundLayerBounds();
  }
});
window.addEventListener('nocturne-pattern-updated', () => {
  requestAnimationFrame(updateDragonFlameAnimationDriver);
});
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', applyFlameAnimation);

function getLayerCoordinateHeight(layer, svg) {
  const layerId = layer === 'sidebar' ? 'sidebarPattern' : 'nocturnePatternLayer';
  const rect = document.getElementById(layerId)?.getBoundingClientRect();
  if (rect?.width > 0 && rect.height > 0) return 100 * rect.height / rect.width;
  return svg?.viewBox?.baseVal?.height || 100;
}

function refreshLayerSvgAspect(layer, targetSvg = null, targetLayer = null) {
  const layerId = layer === 'sidebar' ? 'sidebarPattern' : 'nocturnePatternLayer';
  const svg = targetSvg || document.querySelector(`#${layerId} svg[data-layer="${layer}"]`);
  const rect = (targetLayer || document.getElementById(layerId))?.getBoundingClientRect();
  if (!svg || !rect || rect.width <= 0 || rect.height <= 0) return false;
  const coordinateHeight = 100 * rect.height / rect.width;
  const previousHeight = Number(svg.dataset.coordinateHeight) || 100;
  if (Math.abs(coordinateHeight - previousHeight) < 0.01) return false;
  svg.setAttribute('viewBox', `0 0 100 ${coordinateHeight}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.innerHTML = buildLayerSvgContent(layer, coordinateHeight);
  svg.dataset.coordinateHeight = String(coordinateHeight);
  return true;
}

window.refreshNocturnePatternSvg = refreshLayerSvgAspect;

// Legacy single-config tile builder retained for theme snapshots; new code
// uses buildLayerTile() which handles per-layer motif/grid/geometry.
function buildPatternTile(state) {
  const baseScale = 0.7 * (state.svgSize / 100) * (140 / state.tile);
  const cells = [];
  const cols = state.layout === 'grid' ? state.gridCols : Math.max(1, state.gridCols);
  const rows = state.layout === 'grid' ? state.gridRows : Math.max(1, state.gridRows);
  const cellW = state.tile / cols;
  const cellH = state.tile / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Stagger: offset odd rows by half a cell, like brickwork.
      const staggerX = state.layout === 'stagger' && r % 2 === 1 ? cellW / 2 : 0;
      cells.push(`<g transform="translate(${(c * cellW + cellW / 2 - 50 * baseScale + staggerX).toFixed(1)}, ${(r * cellH + cellH / 2 - 50 * baseScale).toFixed(1)}) scale(${baseScale.toFixed(3)}) rotate(${state.tilt}, 50, 50)">${CANDELABRA_MOTIF_MARKUP()}</g>`);
    }
  }
  return cells.join('');
}

function applyColorOverrides() {
  const root = document.documentElement;
  window.nocturneSwatches.forEach(({ varName }) => {
    const override = window.nocturneColorOverrides[varName];
    if (override) root.style.setProperty(varName, override);
    else root.style.removeProperty(varName);
  });
  applyMainColorOverrides();
  applySidebarColorOverrides();
}

function setScopedColorStyle(styleId, selector, overrides, aliases = {}) {
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  const declarations = [];
  window.nocturneSwatches.forEach(({ varName }) => {
    const color = overrides[varName];
    if (typeof color === 'string' && /^#[0-9a-f]{3,8}$/i.test(color)) declarations.push(`${varName}:${color}`);
  });
  Object.entries(aliases).forEach(([varName, value]) => declarations.push(`${varName}:${value}`));
  style.textContent = declarations.length ? `${selector}{${declarations.join(';')}}` : '';
}

function applyMainColorOverrides() {
  const colors = window.nocturneMainColorOverrides || {};
  const aliases = Object.keys(colors).length ? {
    '--theme-main-bg': 'var(--bg)',
    '--theme-accent': 'var(--gold)',
    '--theme-accent-glow': 'var(--gold-dim)',
    '--theme-fire': 'var(--rose)',
    '--theme-text': 'var(--text)',
    '--candelabra-stroke': 'var(--gold)',
    '--candelabra-fill': 'var(--surface-2)',
    '--candelabra-flame': 'var(--rose)',
    '--candelabra-flame-glow': 'var(--gold-dim)'
  } : {};
  if (colors['--bg']) aliases['background-color'] = 'var(--theme-main-bg)';
  else aliases['background-color'] = 'transparent';
  setScopedColorStyle('nocturne-main-color-style', '#appMain, .theme-preview-main', colors, aliases);
}
window.applyNocturneMainColorOverrides = applyMainColorOverrides;

function applyNocturneCustomCss(cssText) {
  const trimmed = String(cssText == null ? '' : cssText).slice(0, 4000);
  let styleEl = document.getElementById('nocturneCustomCssStyle');
  if (!trimmed.trim()) {
    if (styleEl) styleEl.textContent = '';
    window.nocturneCustomCss = '';
    persistAppearanceState();
    emitAppearanceChange();
    return { ok: true };
  }
  // Guard: reject anything that looks like it tries to escape the style scope.
  if (/<\/?style|<script|javascript:/i.test(trimmed)) {
    return { ok: false, error: 'Custom CSS cannot contain <style>, <script>, or javascript: URLs.' };
  }
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'nocturneCustomCssStyle';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = trimmed;
  window.nocturneCustomCss = trimmed;
  persistAppearanceState();
  emitAppearanceChange();
  return { ok: true };
}
window.applyNocturneCustomCss = applyNocturneCustomCss;

function setNocturneCustomCss(cssText) {
  const result = applyNocturneCustomCss(cssText);
  if (result.ok) {
    window.nocturneCustomCss = String(cssText == null ? '' : cssText).slice(0, 4000);
    persistAppearanceState();
    // An explicit "Save & apply" in the CSS editor is a settle point. This
    // event also fires from restore paths — those pass no marker and leave
    // dirty state untouched.
    markAppearanceSaved();
    window.dispatchEvent(new CustomEvent('nocturne-custom-css-updated'));
    emitAppearanceChange();
  }
  return result;
}
window.setNocturneCustomCss = setNocturneCustomCss;

function setNocturneColorOverride(varName, color) {
  if (!window.nocturneSwatches.some(item => item.varName === varName)) return;
  if (color && /^#[0-9a-f]{3,8}$/i.test(color)) window.nocturneColorOverrides[varName] = color;
  else delete window.nocturneColorOverrides[varName];
  applyColorOverrides();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneColorOverride = setNocturneColorOverride;

function setNocturnePatternFlames(on) {
  window.nocturnePatternState.flames = !!on;
  applyFlameGlow();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturnePatternFlames = setNocturnePatternFlames;

function setNocturnePatternTilt(value) {
  window.nocturnePatternState.tilt = clamp(Math.round(Number(value)) || 0, -180, 180);
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturnePatternTilt = setNocturnePatternTilt;

function setNocturnePatternTile(value) {
  window.nocturnePatternState.tile = clamp(parseInt(value, 10) || PATTERN_MIN, PATTERN_MIN, PATTERN_MAX);
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturnePatternTile = setNocturnePatternTile;

function setNocturneSvgSize(value) {
  window.nocturnePatternState.svgSize = clamp(parseInt(value, 10) || SVG_MIN, SVG_MIN, SVG_MAX);
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneSvgSize = setNocturneSvgSize;

function setNocturneGridColumns(value) {
  window.nocturnePatternState.gridCols = clamp(Math.round(Number(value)) || GRID_MIN, GRID_MIN, GRID_MAX);
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneGridColumns = setNocturneGridColumns;

function setNocturneGridRows(value) {
  window.nocturnePatternState.gridRows = clamp(Math.round(Number(value)) || GRID_MIN, GRID_MIN, GRID_MAX);
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneGridRows = setNocturneGridRows;

function setNocturneSoloMain(on) {
  window.nocturnePatternState.soloMain = !!on;
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneSoloMain = setNocturneSoloMain;

function setNocturneSidebarPattern(on) {
  window.nocturnePatternState.sidebarPattern = !!on;
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneSidebarPattern = setNocturneSidebarPattern;

/* ======== Sidebar theme editor: independent sidebar colors ======== */
// Sidebar pattern colors live in sidebar-scoped CSS variables
// (--sidebar-stroke etc.). "Match main" (default) points them back at the
// main pattern's variables; overriding decouples them.

const SIDEBAR_COLOR_MAP = {
  '--gold': '--sidebar-stroke',
  '--surface-2': '--sidebar-fill',
  '--rose': '--sidebar-flame',
  '--gold-dim': '--sidebar-flame-glow'
};

function applySidebarColorOverrides() {
  const root = document.documentElement;
  const matchMain = !!window.nocturnePatternState.sidebarMatchMain;
  root.classList.toggle('sidebar-colors-match', matchMain);
  Object.values(SIDEBAR_COLOR_MAP).forEach(v => root.style.removeProperty(v));
  const colors = matchMain ? {} : (window.nocturneSidebarColorOverrides || {});
  const aliases = Object.keys(colors).length ? {
    '--theme-sidebar-bg': 'var(--bg-alt)',
    '--theme-accent': 'var(--gold)',
    '--theme-accent-glow': 'var(--gold-dim)',
    '--theme-fire': 'var(--rose)',
    '--theme-text': 'var(--text)',
    '--candelabra-stroke': 'var(--gold)',
    '--candelabra-fill': 'var(--surface-2)',
    '--candelabra-flame': 'var(--rose)',
    '--candelabra-flame-glow': 'var(--gold-dim)',
    '--sidebar-stroke': colors['--gold'] || 'var(--gold)',
    '--sidebar-fill': colors['--surface-2'] || 'var(--surface-2)',
    '--sidebar-flame': colors['--rose'] || 'var(--rose)',
    '--sidebar-flame-glow': colors['--gold-dim'] || 'var(--gold-dim)'
  } : {};
  setScopedColorStyle('nocturne-sidebar-color-style', '#appSidebar, .theme-preview-sidebar', colors, aliases);
}

function setNocturneSidebarMatchMain(match) {
  window.nocturnePatternState.sidebarMatchMain = !!match;
  applySidebarColorOverrides();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneSidebarMatchMain = setNocturneSidebarMatchMain;

function setNocturneSidebarColorOverride(mainVar, color) {
  if (!window.nocturneSwatches.some(item => item.varName === mainVar)) return;
  if (color && /^#[0-9a-f]{3,8}$/i.test(color)) window.nocturneSidebarColorOverrides[mainVar] = color;
  else delete window.nocturneSidebarColorOverrides[mainVar];
  window.nocturnePatternState.sidebarMatchMain = false;  // overriding = independent
  applySidebarColorOverrides();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneSidebarColorOverride = setNocturneSidebarColorOverride;

function setNocturneMainColorOverride(varName, color) {
  if (!window.nocturneSwatches.some(item => item.varName === varName)) return;
  if (color && /^#[0-9a-f]{3,8}$/i.test(color)) window.nocturneMainColorOverrides[varName] = color;
  else delete window.nocturneMainColorOverrides[varName];
  applyMainColorOverrides();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneMainColorOverride = setNocturneMainColorOverride;

function setNocturneNoBackground(on) {
  window.nocturnePatternState.noBackground = !!on;
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneNoBackground = setNocturneNoBackground;

function setNocturneMotif(motif) {
  if (!['candelabra', 'fleur', 'fish', 'fireflies', 'dragon'].includes(motif)) return;
  window.nocturnePatternState.motif = motif;
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneMotif = setNocturneMotif;

function setNocturneAnimateMotif(on) {
  window.nocturnePatternState.animateMotif = !!on;
  applyPatternGeometry();  // rebuild embeds (or drops) the SMIL animations
  applyFlameAnimation();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneAnimateMotif = setNocturneAnimateMotif;

/* ======== Dual-editor per-layer background setters ========
   Each background layer (sidebar / main) has its own motif, literal grid
   density, opacity, tiled-vs-single mode, and fixed-vs-scroll attachment. */

function layerConfig(layer) {
  const state = window.nocturnePatternState;
  if (!state[layer] || typeof state[layer] !== 'object') {
    state[layer] = { motif: state.motif || 'candelabra', gridCols: 2, gridRows: 2, opacity: state.opacity || 35, size: 85, tilt: 0, single: false, sticky: true };
  }
  return state[layer];
}

function setNocturneLayerMotif(layer, motif) {
  if (layer !== 'sidebar' && layer !== 'main') return;
  if (!['candelabra', 'fleur', 'fish', 'fireflies', 'dragon'].includes(motif)) return;
  layerConfig(layer).motif = motif;
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneLayerMotif = setNocturneLayerMotif;

function setNocturneLayerGrid(layer, axis, value) {
  if (layer !== 'sidebar' && layer !== 'main') return;
  if (axis !== 'gridCols' && axis !== 'gridRows') return;
  layerConfig(layer)[axis] = clamp(Math.round(Number(value)) || GRID_MIN, GRID_MIN, GRID_MAX);
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneLayerGrid = setNocturneLayerGrid;

function setNocturneLayerSize(layer, value) {
  if (layer !== 'sidebar' && layer !== 'main') return;
  layerConfig(layer).size = clamp(Math.round(Number(value)), MOTIF_SIZE_MIN, MOTIF_SIZE_MAX);
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneLayerSize = setNocturneLayerSize;

function setNocturneLayerTilt(layer, value) {
  if (layer !== 'sidebar' && layer !== 'main') return;
  layerConfig(layer).tilt = clamp(Math.round(Number(value)), -180, 180);
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneLayerTilt = setNocturneLayerTilt;

function setNocturneLayerAlignment(layer, axis, value) {
  if (layer !== 'sidebar' && layer !== 'main') return;
  if (axis !== 'alignX' && axis !== 'alignY') return;
  layerConfig(layer)[axis] = clamp(Math.round(Number(value) || 0), -50, 50);
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneLayerAlignment = setNocturneLayerAlignment;

function setNocturneLayerOpacity(layer, value) {
  if (layer !== 'sidebar' && layer !== 'main') return;
  layerConfig(layer).opacity = clamp(parseInt(value, 10) || OPACITY_MIN, OPACITY_MIN, OPACITY_MAX);
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneLayerOpacity = setNocturneLayerOpacity;

function setNocturneLayerSingle(layer, on) {
  if (layer !== 'sidebar' && layer !== 'main') return;
  layerConfig(layer).single = !!on;
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneLayerSingle = setNocturneLayerSingle;

function setNocturneLayerSticky(layer, on) {
  if (layer !== 'sidebar' && layer !== 'main') return;
  layerConfig(layer).sticky = !!on;
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneLayerSticky = setNocturneLayerSticky;

// Convenience dispatcher used by paired slider/text inputs: routes
// gridCols/gridRows to the grid setter and opacity to the opacity setter.
function setNocturneLayerGridOrOpacity(layer, field, value) {
  if (field === 'opacity') setNocturneLayerOpacity(layer, value);
  else setNocturneLayerGrid(layer, field, value);
}
window.setNocturneLayerGridOrOpacity = setNocturneLayerGridOrOpacity;

function setNocturnePatternOpacity(value) {
  window.nocturnePatternState.opacity = clamp(parseInt(value, 10) || OPACITY_MIN, OPACITY_MIN, OPACITY_MAX);
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturnePatternOpacity = setNocturnePatternOpacity;

function setNocturnePatternLayout(layout) {
  window.nocturnePatternState.layout = layout === 'grid' ? 'grid' : 'stagger';
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturnePatternLayout = setNocturnePatternLayout;

function nocturneDisplayMode() {
  return document.documentElement.dataset.brightness || 'dark';
}
window.nocturneDisplayMode = nocturneDisplayMode;

function setNocturneDisplayMode(mode) {
  const next = mode === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.brightness = next;
  document.documentElement.classList.toggle('brightness-light', next === 'light');
  try { window.localStorage.setItem('nocturne-brightness', next); } catch (_) { /* private browsing */ }
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneDisplayMode = setNocturneDisplayMode;

function resetNocturneAppearance() {
  window.nocturnePatternState = { flames: true, tilt: -7.5, tile: 140, svgSize: 70, gridCols: 1, gridRows: 1, opacity: 45, layout: 'stagger', soloMain: false, sidebarPattern: true, noBackground: false, sidebarMatchMain: true, motif: 'dragon', animateMotif: true,
    sidebar: { motif: 'fireflies', gridCols: 2, gridRows: 2, opacity: 35, size: 85, tilt: 0, alignX: 0, alignY: 0, single: false, sticky: true },
    main: { motif: 'dragon', gridCols: 1, gridRows: 1, opacity: 45, size: 100, tilt: 0, alignX: 0, alignY: 0, single: true, sticky: true }
  };
  window.nocturneColorOverrides = {};
  window.nocturneSidebarColorOverrides = {};
  window.nocturneMainColorOverrides = {};
  window.nocturneCustomCss = '';
  document.documentElement.dataset.brightness = 'dark';
  document.documentElement.classList.remove('brightness-light');
  applyColorOverrides();
  applyFlameAnimation();
  applyPatternGeometry();
  applyNocturneCustomCss('');
  // Resetting means "back to the current premade theme, untouched" — re-apply
  // it so theme-level variables (which the sliders may have shadowed) restore.
  const currentTheme = document.documentElement.dataset.theme || 'nocturne';
  document.documentElement.dataset.theme = '';
  document.documentElement.dataset.theme = currentTheme;
  persistAppearanceState();
  markAppearanceSaved();  // reset = explicit settle
  emitAppearanceChange();
  window.dispatchEvent(new CustomEvent('nocturne-custom-css-updated'));
}
window.resetNocturneAppearance = resetNocturneAppearance;

/* ======== Shared custom themes (saved for everyone to use) ======== */

// Snapshot the current appearance into a portable theme object.
function snapshotNocturneTheme() {
  const root = document.documentElement;
  return {
    colors: { ...window.nocturneColorOverrides },
    sidebarColors: { ...window.nocturneSidebarColorOverrides },
    mainColors: { ...window.nocturneMainColorOverrides },
    pattern: { ...window.nocturnePatternState },
    css: window.nocturneCustomCss,
    brightness: root.dataset.brightness || 'dark',
    patternInverted: root.classList.contains('pattern-inverted')
  };
}

function applyNocturneThemeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  const root = document.documentElement;
  const colors = (snapshot.colors && typeof snapshot.colors === 'object') ? snapshot.colors : {};
  window.nocturneColorOverrides = {};
  window.nocturneSwatches.forEach(({ varName }) => {
    const value = colors[varName];
    if (typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value)) window.nocturneColorOverrides[varName] = value;
  });
  if (snapshot.pattern && typeof snapshot.pattern === 'object') {
    const s = window.nocturnePatternState;
    if (typeof snapshot.pattern.flames === 'boolean') s.flames = snapshot.pattern.flames;
    if (Number.isFinite(snapshot.pattern.tilt)) s.tilt = clamp(snapshot.pattern.tilt, -25, 25);
    if (Number.isFinite(snapshot.pattern.tile)) s.tile = clamp(snapshot.pattern.tile, PATTERN_MIN, PATTERN_MAX);
    if (Number.isFinite(snapshot.pattern.svgSize)) s.svgSize = clamp(snapshot.pattern.svgSize, SVG_MIN, SVG_MAX);
    if (Number.isFinite(snapshot.pattern.gridCols)) s.gridCols = clamp(Math.round(snapshot.pattern.gridCols), GRID_MIN, GRID_MAX);
    if (Number.isFinite(snapshot.pattern.gridRows)) s.gridRows = clamp(Math.round(snapshot.pattern.gridRows), GRID_MIN, GRID_MAX);
    if (Number.isFinite(snapshot.pattern.opacity)) s.opacity = clamp(snapshot.pattern.opacity, OPACITY_MIN, OPACITY_MAX);
    if (snapshot.pattern.layout === 'grid' || snapshot.pattern.layout === 'stagger') s.layout = snapshot.pattern.layout;
    ['sidebar', 'main'].forEach(layer => {
      const src = snapshot.pattern[layer];
      if (!src || typeof src !== 'object') return;
      const dst = s[layer];
      if (['candelabra', 'fleur', 'fish', 'fireflies', 'dragon'].includes(src.motif)) dst.motif = src.motif;
      if (Number.isFinite(src.gridCols)) dst.gridCols = clamp(Math.round(src.gridCols), GRID_MIN, GRID_MAX);
      if (Number.isFinite(src.gridRows)) dst.gridRows = clamp(Math.round(src.gridRows), GRID_MIN, GRID_MAX);
      if (Number.isFinite(src.opacity)) dst.opacity = clamp(Math.round(src.opacity), OPACITY_MIN, OPACITY_MAX);
      if (Number.isFinite(src.size)) dst.size = clamp(Math.round(src.size), MOTIF_SIZE_MIN, MOTIF_SIZE_MAX);
      if (Number.isFinite(src.tilt)) dst.tilt = clamp(Math.round(src.tilt), -180, 180);
      if (Number.isFinite(src.alignX)) dst.alignX = clamp(Math.round(src.alignX), -50, 50);
      if (Number.isFinite(src.alignY)) dst.alignY = clamp(Math.round(src.alignY), -50, 50);
      if (typeof src.single === 'boolean') dst.single = src.single;
      if (typeof src.sticky === 'boolean') dst.sticky = src.sticky;
    });
    if (typeof snapshot.pattern.soloMain === 'boolean') s.soloMain = snapshot.pattern.soloMain;
    if (typeof snapshot.pattern.sidebarPattern === 'boolean') s.sidebarPattern = snapshot.pattern.sidebarPattern;
    if (typeof snapshot.pattern.noBackground === 'boolean') s.noBackground = snapshot.pattern.noBackground;
    if (typeof snapshot.pattern.sidebarMatchMain === 'boolean') s.sidebarMatchMain = snapshot.pattern.sidebarMatchMain;
  }
  const sidebarColors = (snapshot.sidebarColors && typeof snapshot.sidebarColors === 'object') ? snapshot.sidebarColors : {};
  window.nocturneSidebarColorOverrides = {};
  window.nocturneSwatches.forEach(({ varName }) => {
    const value = sidebarColors[varName];
    if (typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value)) window.nocturneSidebarColorOverrides[varName] = value;
  });
  const mainColors = (snapshot.mainColors && typeof snapshot.mainColors === 'object') ? snapshot.mainColors : {};
  window.nocturneMainColorOverrides = {};
  window.nocturneSwatches.forEach(({ varName }) => {
    const value = mainColors[varName];
    if (typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value)) window.nocturneMainColorOverrides[varName] = value;
  });
  applySidebarColorOverrides();
  const css = typeof snapshot.css === 'string' ? snapshot.css.slice(0, 4000) : '';
  applyColorOverrides();
  applyFlameAnimation();
  applyPatternGeometry();
  applyNocturneCustomCss(css);
  const mode = snapshot.brightness === 'light' ? 'light' : 'dark';
  root.dataset.brightness = mode;
  root.classList.toggle('brightness-light', mode === 'light');
  try { window.localStorage.setItem('nocturne-brightness', mode); } catch (_) { /* private browsing */ }
  const inverted = snapshot.patternInverted !== false;
  root.classList.toggle('pattern-inverted', inverted);
  try { window.localStorage.setItem('nocturne-pattern-inverted', String(inverted)); } catch (_) { /* private browsing */ }
  persistAppearanceState();
  emitAppearanceChange();
}

// Save the current look as a named shared theme. New submissions start as
// 'pending' — the DM approves them before anyone else sees them as usable.
async function saveNocturneSharedTheme(name) {
  const cleanName = String(name || '').trim().slice(0, 60);
  if (!cleanName) return { ok: false, error: 'Give your theme a name first.' };
  const sbApi = window.sb;
  if (!sbApi || !window.currentUserId) {
    // Offline / dev mode: persist locally only.
    try {
      const local = JSON.parse(window.localStorage.getItem('nocturne-local-themes') || '[]');
      local.push({ name: cleanName, creator: 'you', snapshot: snapshotNocturneTheme(), approved: false, created_at: new Date().toISOString() });
      window.localStorage.setItem('nocturne-local-themes', JSON.stringify(local.slice(0, 20)));
      return { ok: true, localOnly: true };
    } catch (_) { return { ok: false, error: 'Could not save locally.' }; }
  }
  try {
    const { error } = await sbApi.from('custom_themes').insert({
      name: cleanName,
      created_by: window.currentUserId,
      creator_name: window.currentPlayerName || 'Player',
      snapshot: snapshotNocturneTheme(),
      approved: false
    });
    if (error) return { ok: false, error: error.message };
    if (typeof markAppearanceSaved === 'function') markAppearanceSaved();
    return { ok: true };
  } catch (err) { return { ok: false, error: err?.message || String(err) }; }
}
window.saveNocturneSharedTheme = saveNocturneSharedTheme;

// List shared themes. Players see only approved ones (+ their own pending);
// the DM sees everything with approval controls.
async function listNocturneSharedThemes() {
  const out = [];
  const sbApi = window.sb;
  if (sbApi && window.currentUserId) {
    try {
      let query = sbApi.from('custom_themes')
        .select('id, name, creator_name, created_by, snapshot, approved, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!window.currentUserIsDM) {
        // Pending themes are invisible to everyone except their creator.
        query = query.or(`approved.eq.true,created_by.eq.${window.currentUserId}`);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        data.forEach(row => out.push({
          id: row.id,
          name: row.name,
          creator: row.creator_name || 'Player',
          snapshot: row.snapshot,
          approved: row.approved === true,
          mine: row.created_by === window.currentUserId,
          isDM: !!window.currentUserIsDM
        }));
      }
    } catch (_) { /* table may not exist yet */ }
  }
  try {
    const local = JSON.parse(window.localStorage.getItem('nocturne-local-themes') || '[]');
    local.forEach((row, i) => out.push({ id: 'local-' + i, name: row.name, creator: row.creator, snapshot: row.snapshot, approved: !!row.approved, mine: true }));
  } catch (_) { /* none */ }
  return out;
}
window.listNocturneSharedThemes = listNocturneSharedThemes;

// DM review: approve or reject a pending theme submission.
async function reviewNocturneSharedTheme(id, approve) {
  if (!window.currentUserIsDM) return { ok: false, error: 'Only the DM can review themes.' };
  const sbApi = window.sb;
  if (!sbApi) return { ok: false, error: 'Not connected.' };
  if (String(id).startsWith('local-')) {
    try {
      const index = parseInt(String(id).slice(6), 10);
      const local = JSON.parse(window.localStorage.getItem('nocturne-local-themes') || '[]');
      if (approve) local[index].approved = true; else local.splice(index, 1);
      window.localStorage.setItem('nocturne-local-themes', JSON.stringify(local));
      window.dispatchEvent(new CustomEvent('nocturne-shared-themes-changed'));
      return { ok: true };
    } catch (_) { return { ok: false, error: 'Could not update local theme.' }; }
  }
  if (approve === false) {
    const { error } = await sbApi.from('custom_themes').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await sbApi.from('custom_themes').update({ approved: true }).eq('id', id);
    if (error) return { ok: false, error: error.message };
  }
  window.dispatchEvent(new CustomEvent('nocturne-shared-themes-changed'));
  return { ok: true };
}
window.reviewNocturneSharedTheme = reviewNocturneSharedTheme;

async function applyNocturneSharedTheme(id) {
  const themes = await listNocturneSharedThemes();
  const theme = themes.find(t => String(t.id) === String(id));
  if (!theme) return { ok: false, error: 'Theme not found.' };
  applyNocturneThemeSnapshot(theme.snapshot);
  // Applying someone's theme counts as a save point — no unsaved-changes
  // warning on the next premade switch.
  if (typeof markAppearanceSaved === 'function') markAppearanceSaved();
  return { ok: true };
}
window.applyNocturneSharedTheme = applyNocturneSharedTheme;

(function restoreBrightness() {
  let stored = null;
  try { stored = window.localStorage.getItem('nocturne-brightness'); } catch (_) { /* private browsing */ }
  const mode = stored === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.brightness = mode;
  document.documentElement.classList.toggle('brightness-light', mode === 'light');
  applySidebarColorOverrides();
})();

// Apply saved pattern / color / CSS preferences once the DOM is ready.
let appearanceReady = false;
window.addEventListener('DOMContentLoaded', () => {
  appearanceReady = true;
  // Deferred initial premade theme: everything below (swatches, appearance
  // state, snapshot machinery) is initialized by now, so setNocturneTheme
  // cannot crash. Sets data-theme unless the account restore already did.
  if (!document.documentElement.dataset.theme) setNocturneTheme('nocturne');
  applyFlameAnimation();
  applyPatternGeometry();
  applyColorOverrides();
  if (window.nocturneCustomCss.trim()) applyNocturneCustomCss(window.nocturneCustomCss);
  // NOW everything (localStorage restore + DOM classes + applied CSS) is in
  // its resting state — this is the correct "saved" baseline. Reload resets
  // unsaved edits to this persisted baseline (see resetUnsavedEditsOnLoad).
  markAppearanceSaved();
});

// When a sign-in restores the account's saved theme/custom CSS, re-apply the
// locally stored pattern overrides that do not persist server-side.
window.addEventListener('nocturne-auth-changed', () => {
  if (!appearanceReady) return;
  applyFlameAnimation();
  applyPatternGeometry();
  applyColorOverrides();
});

// Repeating candelabra SVG background layer. Colors are drawn from the live
// theme variables (--gold / --surface-2 / --rose), so every theme recolors
// the pattern instantly. Two overlapping tilted motifs (-7.5deg) tile a 140px
// grid; patternUnits=userSpaceOnUse keeps it crisp at any viewport size.
const CANDELABRA_TILE = 140;

function candelabraTilePx() {
  const state = window.nocturnePatternState;
  if (state && Number.isFinite(state.tile)) return state.tile;
  const parsed = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--candelabra-tile'));
  return Number.isFinite(parsed) && parsed > 40 ? parsed : CANDELABRA_TILE;
}

/* ======== Motif library: candelabra, fleur-de-lis, fish, fireflies ========
   All motifs draw in a ~100×100 box (centered at 50,50) and read the same
   --candelabra-* variables, so the color editor and opacity work for every
   one. Animated motifs (fish, fireflies) embed SMIL animations that are
   paused globally when animateMotif is off. */

function fleurDeLisMotif() {
  return `\
<g class="pattern-motif">\
<path d="M50 8 C46 16 40 20 40 28 C40 34 44 38 47 40 C42 44 36 48 36 56 C36 62 40 66 45 68 L45 78 L38 92 L50 86 L62 92 L55 78 L55 68 C60 66 64 62 64 56 C64 48 58 44 53 40 C56 38 60 34 60 28 C60 20 54 16 50 8 Z" fill="var(--candelabra-fill)" stroke="var(--candelabra-stroke)" stroke-width="2" stroke-linejoin="round"/>\
<path d="M50 40 L50 86" stroke="var(--candelabra-stroke)" stroke-width="1.4" opacity="0.7"/>\
<path d="M36 52 C24 46 16 38 18 28 C19 24 23 22 25 26 C27 30 28 40 34 46" fill="none" stroke="var(--candelabra-stroke)" stroke-width="2" stroke-linecap="round"/>\
<path d="M64 52 C76 46 84 38 82 28 C81 24 77 22 75 26 C73 30 72 40 66 46" fill="none" stroke="var(--candelabra-stroke)" stroke-width="2" stroke-linecap="round"/>\
<circle cx="50" cy="30" r="3" fill="var(--candelabra-flame)" opacity="0.9"/>\
</g>`;
}

function fishMotif() {
  // Koi-style fish; the tail sways via SMIL rotate (gated by animateMotif).
  const tailAnim = window.nocturnePatternState.animateMotif
    ? '<animateTransform attributeName="transform" type="rotate" values="-12 26 50; 12 26 50; -12 26 50" dur="2.2s" repeatCount="indefinite"/>'
    : '';
  return `\
<g class="pattern-motif">\
<g transform="rotate(${-8}, 50, 50)">\
<g>${tailAnim}<path d="M26 50 C14 40 8 44 6 50 C8 56 14 60 26 50 C14 44 8 56 6 50" fill="var(--candelabra-fill)" stroke="var(--candelabra-stroke)" stroke-width="1.6"/></g>\
<path d="M26 50 C32 40 48 34 62 40 C70 43 74 47 76 50 C74 53 70 57 62 60 C48 66 32 60 26 50 Z" fill="var(--candelabra-fill)" stroke="var(--candelabra-stroke)" stroke-width="1.8"/>\
<path d="M56 41 C60 44 60 56 56 59" fill="none" stroke="var(--candelabra-stroke)" stroke-width="1.2" opacity="0.7"/>\
<path d="M48 38 C52 36 58 36 61 39" fill="none" stroke="var(--candelabra-stroke)" stroke-width="1.4"/>\
<circle cx="68" cy="47" r="2" fill="var(--candelabra-flame)"/>\
<circle cx="40" cy="48" r="2.2" fill="var(--candelabra-stroke)" opacity="0.6"/>\
</g>\
</g>`;
}

function firefliesMotif() {
  return '';
}

window.nocturneDragonHeadStatus = 'loading';
let nocturneDragonHeadMarkup = '';

function loadNocturneDragonHead() {
  const appScript = [...document.scripts].find(script => /(?:^|\/)App\.jsx(?:\?|$)/i.test(script.src));
  if (!appScript) {
    window.nocturneDragonHeadStatus = 'error';
    console.error('Could not locate App.jsx to load the supplied Breathing Dragon SVG.');
    return;
  }
  const artworkUrl = new URL('dragon%20head.svg', appScript.src);
  fetch(artworkUrl)
    .then(response => {
      if (!response.ok) throw new Error(`SVG request failed with status ${response.status}`);
      return response.text();
    })
    .then(source => {
      const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
      const sourceSvg = parsed.documentElement;
      if (sourceSvg.localName !== 'svg' || parsed.querySelector('parsererror')) {
        throw new Error('The supplied SVG is not valid XML.');
      }
      const viewBox = sourceSvg.getAttribute('viewBox') || '0 0 1024 1024';
      const firePaths = [...sourceSvg.querySelectorAll('path')].filter(path =>
        /fill\s*:\s*rgb\(\s*204\s*,\s*53\s*,\s*0\s*\)/i.test(path.getAttribute('style') || '')
      );
      if (!firePaths.length) throw new Error('The supplied SVG has no identifiable fire paths.');
      const flameMotions = [
        { values: '0 0; 0 -3; 2.5 -1.5; 0 0', duration: '3.8s' },
        { values: '0 0; 1.5 -2.5; -2 -1; 0 0', duration: '4.1s' },
        { values: '0 0; -1 -3.5; 2 -2; 0 0', duration: '3.5s' },
        { values: '0 0; 2 -2; -1.5 0.5; 0 0', duration: '4.4s' }
      ];
      let flameIndex = 0;
      sourceSvg.querySelectorAll('path').forEach(path => {
        const isFire = firePaths.includes(path);
        path.setAttribute('fill', isFire ? 'var(--candelabra-flame)' : 'var(--candelabra-stroke)');
        if (isFire) {
          const flameMotion = flameMotions[flameIndex++ % flameMotions.length];
          path.classList.add('dragon-fire');
          const flamesGroup = path.parentElement;
          flamesGroup?.classList.add('dragon-flames');
          path.style.removeProperty('fill');
          const animation = parsed.createElementNS('http://www.w3.org/2000/svg', 'animate');
          animation.setAttribute('attributeName', 'opacity');
          animation.setAttribute('values', '0.9;0.96;0.91;0.94;0.9');
          animation.setAttribute('keyTimes', '0;0.25;0.5;0.75;1');
          animation.setAttribute('keySplines', '0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1');
          animation.setAttribute('calcMode', 'spline');
          animation.setAttribute('dur', '2.8s');
          animation.setAttribute('repeatCount', 'indefinite');
          path.appendChild(animation);
          const wave = parsed.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
          wave.setAttribute('attributeName', 'transform');
          wave.setAttribute('type', 'translate');
          wave.setAttribute('values', flameMotion.values);
          wave.setAttribute('keyTimes', '0;0.33;0.67;1');
          wave.setAttribute('keySplines', '0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1');
          wave.setAttribute('calcMode', 'spline');
          wave.setAttribute('dur', flameMotion.duration);
          wave.setAttribute('repeatCount', 'indefinite');
          path.appendChild(wave);
        }
      });
      nocturneDragonHeadMarkup = `<g class="dragon-head"><svg x="0" y="0" width="100" height="100" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${sourceSvg.innerHTML}</svg></g>`;
      window.nocturneDragonHeadStatus = 'ready';
      window.dispatchEvent(new CustomEvent('nocturne-dragon-head-ready'));
      if (window.nocturnePatternState) {
        applyPatternGeometry();
        emitAppearanceChange();
      }
    })
    .catch(error => {
      window.nocturneDragonHeadStatus = 'error';
      console.error('Could not load the supplied Breathing Dragon SVG artwork.', error);
      window.dispatchEvent(new CustomEvent('nocturne-dragon-head-error', { detail: error }));
    });
}

loadNocturneDragonHead();

const MOTIF_BUILDERS = {
  candelabra: candelabraMotif,
  fleur: fleurDeLisMotif,
  fish: fishMotif,
  fireflies: firefliesMotif,
  dragon: dragonHeadMotif
};

function motifMarkup() {
  const state = window.nocturnePatternState;
  const build = MOTIF_BUILDERS[state && state.motif] || candelabraMotif;
  return build();
}

function candelabraMotif() {
  return `\
<path d="M 42 88 Q 50 84 58 88 L 56 82 Q 50 80 44 82 Z" fill="var(--candelabra-stroke)" opacity="0.6"/>\
<path d="M 44 82 C 44 76, 47 70, 48 62 L 52 62 C 53 70, 56 76, 56 82 Z" fill="var(--candelabra-fill)" stroke="var(--candelabra-stroke)" stroke-width="1.8" stroke-linejoin="round"/>\
<path d="M 50 62 L 50 28" stroke="var(--candelabra-stroke)" stroke-width="2.34" stroke-linecap="round"/>\
<circle cx="50" cy="58" r="2.7" fill="var(--candelabra-stroke)"/>\
<circle cx="50" cy="42" r="3.24" fill="var(--candelabra-fill)" stroke="var(--candelabra-stroke)" stroke-width="1.8"/>\
<path d="M 50 50 C 35 50, 22 42, 22 28 C 22 22, 28 22, 28 26 C 28 32, 38 40, 50 42" fill="none" stroke="var(--candelabra-stroke)" stroke-width="1.8" stroke-linecap="round"/>\
<path d="M 32 44 C 26 48, 20 54, 22 60 C 24 64, 28 62, 26 58" fill="none" stroke="var(--candelabra-stroke)" stroke-width="1.44"/>\
<path d="M 50 50 C 65 50, 78 42, 78 28 C 78 22, 72 22, 72 26 C 72 32, 62 40, 50 42" fill="none" stroke="var(--candelabra-stroke)" stroke-width="1.8" stroke-linecap="round"/>\
<path d="M 68 44 C 74 48, 80 54, 78 60 C 76 64, 72 62, 74 58" fill="none" stroke="var(--candelabra-stroke)" stroke-width="1.44"/>\
<path d="M 18 28 C 18 34, 26 34, 26 28 Z" fill="var(--candelabra-fill)" stroke="var(--candelabra-stroke)" stroke-width="1.8"/>\
<path d="M 46 28 C 46 34, 54 34, 54 28 Z" fill="var(--candelabra-fill)" stroke="var(--candelabra-stroke)" stroke-width="1.8"/>\
<path d="M 74 28 C 74 34, 82 34, 82 28 Z" fill="var(--candelabra-fill)" stroke="var(--candelabra-stroke)" stroke-width="1.8"/>\
<rect x="20" y="14" width="4" height="14" rx="1" fill="var(--candelabra-stroke)" opacity="0.9"/>\
<path d="M 20 18 Q 19 20 20 22" stroke="var(--candelabra-stroke)" stroke-width="0.8" fill="none"/>\
<rect x="48" y="10" width="4" height="18" rx="1" fill="var(--candelabra-stroke)" opacity="0.9"/>\
<path d="M 52 16 Q 53 18 52 21" stroke="var(--candelabra-stroke)" stroke-width="0.8" fill="none"/>\
<rect x="76" y="14" width="4" height="14" rx="1" fill="var(--candelabra-stroke)" opacity="0.9"/>\
<line x1="22" y1="14" x2="22" y2="11" stroke="var(--candelabra-stroke)" stroke-width="1"/>\
<line x1="50" y1="10" x2="50" y2="7" stroke="var(--candelabra-stroke)" stroke-width="1"/>\
<line x1="78" y1="14" x2="78" y2="11" stroke="var(--candelabra-stroke)" stroke-width="1"/>\
<g class="candelabra-flames">\
<path d="M 22 11 Q 19 6 22 2 Q 25 6 22 11 Z" fill="var(--candelabra-flame)"><animate attributeName="d" values="M 22 11 Q 19 6 22 2 Q 25 6 22 11 Z; M 22 11 Q 20 7 22 3 Q 24 5 22 11 Z; M 22 11 Q 19 6 22 2 Q 25 6 22 11 Z" dur="1.8s" repeatCount="indefinite"/></path>\
<circle cx="22" cy="6" r="3" fill="var(--candelabra-flame-glow)" opacity="0.3"/>\
<path d="M 50 7 Q 46 2 50 -3 Q 54 2 50 7 Z" fill="var(--candelabra-flame)"><animate attributeName="d" values="M 50 7 Q 46 2 50 -3 Q 54 2 50 7 Z; M 50 7 Q 48 3 50 -2 Q 52 1 50 7 Z; M 50 7 Q 46 2 50 -3 Q 54 2 50 7 Z" dur="1.4s" repeatCount="indefinite"/></path>\
<circle cx="50" cy="2" r="4" fill="var(--candelabra-flame-glow)" opacity="0.35"/>\
<path d="M 78 11 Q 75 6 78 2 Q 81 6 78 11 Z" fill="var(--candelabra-flame)"><animate attributeName="d" values="M 78 11 Q 75 6 78 2 Q 81 6 78 11 Z; M 78 11 Q 77 5 78 3 Q 79 7 78 11 Z; M 78 11 Q 75 6 78 2 Q 81 6 78 11 Z" dur="2.1s" repeatCount="indefinite"/></path>\
<circle cx="78" cy="6" r="3" fill="var(--candelabra-flame-glow)" opacity="0.3"/>\
</g>`;
}

function dragonHeadMotif() {
  return nocturneDragonHeadMarkup;
}

// SVG's pattern viewBox maps one 100×100 motif into each exact grid cell.
function buildLayerSvgContent(layer, coordinateHeight = 100) {
  const state = window.nocturnePatternState;
  const cfg = (state && state[layer]) || {};
  const motif = cfg.motif || state.motif || 'candelabra';
  if (motif === 'fireflies') return '';
  const build = MOTIF_BUILDERS[motif] || candelabraMotif;
  const savedMotif = state.motif;
  state.motif = motif;              // motif builders read state.motif
  let markup;
  try { markup = build(); } finally { state.motif = savedMotif; }
  const cols = clamp(Math.round(cfg.gridCols) || 1, GRID_MIN, GRID_MAX);
  const rows = clamp(Math.round(cfg.gridRows) || 1, GRID_MIN, GRID_MAX);
  const size = clamp(Number(cfg.size) || 85, MOTIF_SIZE_MIN, MOTIF_SIZE_MAX);
  const tilt = clamp(Number(cfg.tilt) || 0, -180, 180);
  const alignX = clamp(Number(cfg.alignX) || 0, -50, 50);
  const alignY = clamp(Number(cfg.alignY) || 0, -50, 50);
  const centerY = coordinateHeight / 2;
  if (cfg.single) {
    const singleScale = (size / 100) * Math.min(1, coordinateHeight / 100);
    const transform = `translate(${50 + alignX} ${centerY + alignY}) rotate(${tilt}) scale(${singleScale.toFixed(3)}) translate(-50 -50)`;
    return `<g class="pattern-motif" transform="${transform}">${markup}</g>`;
  }
  const transform = `translate(${50 + alignX} ${50 + alignY}) rotate(${tilt}) scale(${(size / 100).toFixed(3)}) translate(-50 -50)`;
  const cellW = (100 / cols).toFixed(4);
  const cellH = (coordinateHeight / rows).toFixed(4);
  return `<defs><pattern id="nocturne-${layer}-motif" width="${cellW}" height="${cellH}" patternUnits="userSpaceOnUse" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><g class="pattern-motif" transform="${transform}">${markup}</g></pattern></defs><rect width="100" height="${coordinateHeight}" fill="url(#nocturne-${layer}-motif)"/>`;
}

function CandelabraPattern({ id, layer }) {
  const fireflies = Array.from({ length: 42 }, (_, index) => {
    const left = 2 + (index * 37 + 11) % 96;
    const top = 2 + (index * 61 + 23) % 96;
    const size = 2 + (index * 5) % 3;
    const duration = 5 + (index * 13 % 60) / 10;
    const delay = -((index * 7) % 50) / 10;
    const driftX = (index * 17) % 49 - 24;
    const driftY = (index * 29) % 49 - 24;
    return `<span class="nocturne-firefly-particle" style="--firefly-left:${left}%;--firefly-top:${top}%;--firefly-size:${size}px;--firefly-duration:${duration}s;--firefly-delay:${delay}s;--firefly-drift-x:${driftX}px;--firefly-drift-y:${driftY}px;--firefly-return-x:${driftX * -0.5}px;--firefly-return-y:${driftY * -0.5}px"></span>`;
  }).join('');
  return h(React.Fragment, null,
    h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      width: '100%', height: '100%', viewBox: '0 0 100 100',
      preserveAspectRatio: 'xMidYMid meet', 'data-coordinate-height': '100',
      'aria-hidden': true, focusable: false, 'data-layer': layer || 'main',
      dangerouslySetInnerHTML: { __html: buildLayerSvgContent(layer || 'main') }
    }),
    h('div', {
      className: 'nocturne-fireflies-particles',
      'aria-hidden': true,
      dangerouslySetInnerHTML: { __html: fireflies }
    })
  );
}

// Raw motif markup — rebuilt on demand since motif selection changes.
function CANDELABRA_MOTIF_MARKUP() { return motifMarkup(); }

function togglePatternInverted() {
  // Whole-page inversion: flips the background pattern layer (sidebar + main),
  // never the UI text, so content stays readable on every theme.
  const root = document.documentElement;
  const inverted = !root.classList.contains('pattern-inverted');
  root.classList.toggle('pattern-inverted', inverted);
  try { window.localStorage.setItem('nocturne-pattern-inverted', String(inverted)); } catch (_) { /* private browsing */ }
  window.dispatchEvent(new CustomEvent('nocturne-pattern-updated'));
}
window.togglePatternInverted = togglePatternInverted;

(function restorePatternInverted() {
  let inverted = true;
  try { inverted = window.localStorage.getItem('nocturne-pattern-inverted') !== 'false'; } catch (_) { /* private browsing */ }
  document.documentElement.classList.toggle('pattern-inverted', inverted);
})();

// GIF picker button. `disabled` mirrors a live flag that updateChatUI()
// maintains (isDM || session open), so imperative UI updates survive.
window.__chatCanInteract = false;

function ChatGifButton() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const sync = () => force();
    window.addEventListener('nocturne-chat-state', sync);
    return () => window.removeEventListener('nocturne-chat-state', sync);
  }, []);
  const disabled = !window.__chatCanInteract;
  return h('button', {
    type: 'button', id: 'chatGifBtn', className: 'chat-gif-btn',
    title: 'Send an approved GIF', 'aria-label': 'Open GIF picker',
    'aria-expanded': 'false', disabled,
    onClick: () => window.toggleGifPanel()
  },
    h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
      h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 2, stroke: 'currentColor', 'stroke-width': 1.6 }),
      h('circle', { cx: 8.5, cy: 9.5, r: 1.7, stroke: 'currentColor', 'stroke-width': 1.4 }),
      h('path', { d: 'M4 17.5 L9.5 12.5 L13.5 16 L16.5 13.5 L20 16.5', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linejoin': 'round' })
    )
  );
}

function Sidebar() {
  return h('nav', { className: `site-sidebar sidebar${savedSidebarCollapsed ? ' collapsed' : ''}`, id: 'appSidebar', style: { display: 'none' } },
    h('div', { className: 'sidebar-pattern', id: 'sidebarPattern', 'aria-hidden': true }, h(CandelabraPattern, { id: 'nocturneSidebarCandelabraPattern', layer: 'sidebar' })),
    h('button', { type: 'button', className: 'mobile-nav-close', 'aria-label': 'Close navigation menu', onClick: () => window.setMobileNavOpen(false) }, '×'),
    h('div', { className: 'brand' }, h('div', { className: 'brand-title-row' }, h(Sigil), h('div', { className: 'brand-title-copy' }, h('h1', null, 'Nocturne'), h('p', null, 'Campaign Hub')), h('button', { type: 'button', className: 'sidebar-collapse-toggle', id: 'sidebarCollapseToggle', 'aria-expanded': String(!savedSidebarCollapsed), 'aria-label': savedSidebarCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu', onClick: () => setSidebarCollapsed(!document.getElementById('appSidebar')?.classList.contains('collapsed')) }, savedSidebarCollapsed ? '›' : '‹')), h('div', { className: 'brand-meta-row' }, h('div', { className: 'brand-meta-actions' }, h('span', { className: 'role-pill', id: 'rolePill' }, 'player'),
            h('select', { className: 'theme-select-inline', id: 'themeSelectInline', 'aria-label': 'Choose site theme', defaultValue: 'nocturne', onChange: event => window.setNocturneTheme(event.target.value) },
              [
                ['nocturne', 'Nocturne'], ['dracula', 'Dracula'], ['alucard', 'Alucard'], ['sylvan', 'Sylvan'],
                ['steampunk', 'Steampunk'], ['frost', 'Frost'], ['starlight', 'Starlight'], ['lush', 'Lush'],
                ['mystic', 'Mystic'], ['potion', 'Potion'], ['underdark', 'Underdark']
              ].map(([value, label]) => h('option', { key: value, value }, label))
            ),
            h('button', { type: 'button', className: 'theme-studio-link inbox-button', id: 'themeStudioBtn', title: 'Open Theme Studio', 'aria-label': 'Open Theme Studio', onClick: () => {
              // Toggles: pressing the palette again hides the studio and
              // returns you to the page you came from.
              if (currentPage === 'theme-studio') {
                renderPage(window.localStorage.getItem('nocturne-active-page') === 'theme-studio' ? 'home' : (window.localStorage.getItem('nocturne-pre-studio-page') || 'home'));
              } else {
                window.localStorage.setItem('nocturne-pre-studio-page', currentPage || 'home');
                navigateTo('theme-studio', true);
              }
            } },
              h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true, fill: 'none' },
                h('path', { d: 'M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-.6-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h1.6A4.4 4.4 0 0 0 21 9.9C20.6 6 16.7 3 12 3Z', stroke: 'currentColor', 'stroke-width': 1.5 }),
                h('circle', { cx: 8, cy: 10, r: 1.3, fill: 'currentColor' }),
                h('circle', { cx: 12, cy: 7.5, r: 1.3, fill: 'currentColor' }),
                h('circle', { cx: 16, cy: 10, r: 1.3, fill: 'currentColor' })
              )
            )),
          h('button', { className: 'inbox-button', id: 'inboxButton', title: 'DM requests', onClick: () => window.togglePasswordInbox() }, h('span', { className: 'email-icon', 'aria-hidden': true }, '✉'), h('span', { className: 'notification-bubble', id: 'inboxCount', style: { display: 'none' } }, '0'))), h('div', { className: 'password-inbox', id: 'passwordInbox', style: { display: 'none' } })),
    h('div', { className: 'sidebar-resize-handle', role: 'separator', 'aria-label': 'Resize navigation menu', 'aria-orientation': 'vertical', onPointerDown: startSidebarResize }),
    h('ul', { className: 'navlist', id: 'navlist' },
      h('li', { style: { padding: '0 4px' } }, h('button', { className: 'nav-chat-btn', 'data-target': 'session-chats', onClick: () => { window.setMobileNavOpen(false); window.openChatModal(); } },
        h('span', { className: 'nav-chat-label' }, h('span', { className: 'nav-icon', 'aria-hidden': true }, '◈'), h('span', null, 'Session Chats')),
        h('span', { id: 'navLiveBadge', className: 'nav-live-badge', style: { display: 'none' } }, 'LIVE')
      )),
      navigation.map(([target, label, icon]) => h('li', { key: target }, h('button', { 'data-target': target, className: target === 'home' ? 'active' : '', onClick: () => navigateTo(target) }, h('span', { className: 'nav-icon', 'aria-hidden': true }, icon), h('span', { className: 'nav-label' }, label)))),
      h('li', null, h('button', { 'data-target': 'restricted', className: 'dm-nav-btn', id: 'dmNavBtn', style: { display: 'none' }, onClick: () => navigateTo('restricted') }, h('span', { className: 'nav-icon', 'aria-hidden': true }, '🔒'), h('span', { className: 'nav-label' }, 'Restricted Archives')))
    ),
    h('div', { className: 'suggestion-box' },
      h('div', { className: 'suggestion-box-heading' }, h('span', { className: 'suggestion-box-title' }, 'Suggest a change'), h('span', { className: 'suggestion-box-icon', 'aria-hidden': true }, '✦')),
      h('p', null, 'Have an idea or spotted a fix? Send it straight to the DM.'),
      h('form', { id: 'suggestionForm', onSubmit: event => window.submitSuggestion(event) },
        h('textarea', { id: 'suggestionInput', rows: 3, maxLength: 1000, placeholder: 'Feature idea or bug fix…', required: true, 'aria-label': 'Suggestion' }),
        h('button', { className: 'btn btn-sm', type: 'submit' }, 'Send suggestion')
      ),
      h('div', { id: 'suggestionStatus', className: 'suggestion-status', role: 'status', 'aria-live': 'polite' })
    ),
    h('button', { className: 'logout-btn', id: 'logoutBtn', title: 'Sign out', onClick: () => window.handleLogout() }, h('span', { className: 'logout-label' }, 'Sign out'))
  );
}

function ContentSections() {
  return h('main', { id: 'appMain', className: 'site-main', style: { display: 'none' } },
    h(HomePage), h(WorldbookPage), h(NpcsPage), h(CharactersPage),
    h(CommonRoomsPage), h(GamesHub), h(SummariesPage), h(QuestBoardPage), h(LootPage), h(PrimerPage), h(RestrictedPage),
    h(SessionChatsPage), h(ThemeStudio)
  );
}

function SessionChatsPage() {
  return h('section', { id: 'session-chats', className: 'session-chats-page' },
    h('button', {
      type: 'button',
      className: 'btn btn-secondary page-back-button',
      hidden: true,
      'aria-label': 'Go back to the previous page',
      onClick: () => window.navigateBack()
    }, '← Back'),
    h('div', { className: 'chat-page-shell' },
    h('div', { className: 'chat-header' }, h('div', { className: 'chat-header-left' }, h('button', { className: 'btn btn-sm btn-secondary chat-drawer-toggle', onClick: () => window.toggleChatDrawer(), title: 'Toggle Session List', 'aria-expanded': 'false' }, '☰'), h('h4', { id: 'modalChatTitle' }, 'Session Chat')), h('div', { className: 'chat-header-actions' }, h('span', { id: 'chatStatusBadge', className: 'status-badge' }, 'Locked'), h('button', { className: 'btn btn-sm btn-secondary', 'aria-label': 'Back to previous page', onClick: () => window.closeChatModal() }, '← Back'))),
    h('div', { id: 'chatDrawerScrim', className: 'chat-drawer-scrim', onClick: () => window.closeChatDrawer() }),
    h('div', { id: 'chatMenuDrawer', className: 'chat-menu-drawer' },
      h('button', { id: 'newSessionChatBtn', className: 'btn btn-sm new-session-btn', type: 'button', onClick: () => window.showNewSessionChatForm(), style: { display: 'none' } }, '＋ New Session'),
      h('form', { id: 'newSessionChatPanel', className: 'new-session-panel', style: { display: 'none' }, onSubmit: e => window.createNewSessionChat(e) },
        h('label', { className: 'new-session-label', htmlFor: 'newSessionChatName' }, 'Session name'),
        h('input', { id: 'newSessionChatName', className: 'input-control', type: 'text', maxLength: 60, placeholder: 'e.g. Session 4 — The Vaults', autoComplete: 'off' }),
        h('p', { id: 'newSessionChatError', className: 'inline-status error', style: { display: 'none' } }),
        h('div', { className: 'new-session-actions' },
          h('button', { className: 'btn btn-sm', type: 'submit' }, 'Create'),
          h('button', { className: 'btn btn-sm btn-secondary', type: 'button', onClick: () => window.cancelNewSessionChat() }, 'Cancel')
        )
      ),
      h('div', { className: 'chat-drawer-header' }, h('strong', null, 'Past Sessions')),
      h('div', { id: 'previousChatsList' })
    ),
    h('div', { className: 'chat-body' },
      h('div', { id: 'dmChatControls', className: 'chat-dm-controls', style: { display: 'none' } },
        h('div', { className: 'chat-control-row' },
          h('div', { className: 'chat-unlock-control' }, h('label', { className: 'switch' }, h('input', { type: 'checkbox', id: 'sessionOpenToggle', onChange: e => window.toggleSessionChat(e.target.checked) }), h('span', { className: 'slider' })), h('span', null, 'Unlock chat for players')),
          h('button', { className: 'btn btn-sm btn-secondary chat-clear-button', onClick: () => window.clearAllSessionMessages() }, 'Clear all messages')
        )
      ),
      h('div', { id: 'chatHelpPanel', className: 'chat-help-panel', style: { display: 'none' } },
        h('div', { className: 'chat-help-panel-header' }, h('strong', null, 'Chat commands'), h('button', { type: 'button', className: 'btn btn-sm btn-secondary', onClick: () => window.toggleChatHelp(false) }, 'Close')),
        h('div', { className: 'chat-command-list' },
          h('p', null, h('code', null, '/help'), ' Open or close this command panel.'),
          h('p', null, h('code', null, '/whisper PlayerName message'), ' Send a private message to a player.'),
          h('p', null, h('code', null, '/roll 1d20+5'), ' Roll dice and post the result to chat.'),
          h('p', null, 'The D20 button rolls a visual d20. Only the person who rolls it sees the animation; everyone sees the result in chat.')
        )
      ),
      h('div', { id: 'chatMessages', className: 'chat-messages' }),
      h('form', { id: 'chatForm', className: 'chat-form', onSubmit: event => window.handleChatSubmit(event) }, h(ChatGifButton), h('div', { id: 'chatGifPanel', className: 'chat-gif-panel', style: { display: 'none' }, 'aria-label': 'Approved GIFs' }), h('input', { id: 'chatInput', className: 'input-control', placeholder: 'Type /help for chat commands...', disabled: true }), h('button', { id: 'chatSendBtn', className: 'btn', type: 'submit', disabled: true }, 'Send'), h('span', { className: 'dice-menu-anchor' }, h('button', { id: 'diceRollBtn', className: 'btn dice-roll-button', type: 'button', title: 'Open dice roller', disabled: true }, 'Roll dice'), h('span', { id: 'diceRollMenu', className: 'dice-roll-menu', style: { display: 'none' } }, h('span', { className: 'dice-menu-title' }, 'Roll dice'), h('label', null, 'Number of dice', h('input', { id: 'diceCountInput', className: 'input-field', type: 'number', min: 1, max: 100, defaultValue: 1 })), h('label', null, 'Dice type', h('select', { id: 'diceTypeInput', className: 'input-field', defaultValue: '20' }, h('option', { value: '4' }, 'd4'), h('option', { value: '6' }, 'd6'), h('option', { value: '8' }, 'd8'), h('option', { value: '10' }, 'd10'), h('option', { value: '12' }, 'd12'), h('option', { value: '20' }, 'd20'), h('option', { value: '100' }, 'd100'))), h('label', null, 'Modifier', h('input', { id: 'diceModifierInput', className: 'input-field', type: 'number', defaultValue: 0 })), h('button', { id: 'rollConfiguredDiceBtn', className: 'btn', type: 'button' }, 'Roll')))),
      h('p', { className: 'chat-help' }, 'Type ', h('code', null, '/help'), ' for commands. Whispers show the sender and intended recipient.')
    )
    )
  );
}

function RuneDuelRequestPopup() {
  const [request, setRequest] = React.useState(null);

  React.useEffect(() => {
    function handleRequest(event) {
      setRequest(event.detail);
    }
    window.addEventListener('nocturne-rune-duel-request', handleRequest);
    return () => window.removeEventListener('nocturne-rune-duel-request', handleRequest);
  }, []);

  if (!request) return null;

  return h('div', { className: 'game-request-overlay' },
    h('div', { className: 'game-request-popup', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'gameRequestTitle' },
      h('button', {
        className: 'game-request-close',
        type: 'button',
        'aria-label': 'Dismiss request notification',
        onClick: () => setRequest(null)
      }, '×'),
      h('span', { className: 'games-kicker' }, 'Tournament request'),
      h('h2', { id: 'gameRequestTitle' }, 'A Rune Duel awaits'),
      h('p', null, `${request.creatorName} from House ${request.house} created a Rune Duel.`),
      h('div', { className: 'game-request-actions' },
        h('button', {
          className: 'btn',
          type: 'button',
          onClick: () => {
            setRequest(null);
            window.navigateTo('games');
          }
        }, 'Open House Games'),
        h('button', { className: 'btn btn-secondary', type: 'button', onClick: () => setRequest(null) }, 'Dismiss')
      )
    )
  );
}

function App() {
  return h(React.Fragment, null,
    h(AuthScreen),
    h('div', { className: 'mobile-nav-bar' },
      h('button', { type: 'button', className: 'mobile-nav-toggle', id: 'mobileNavToggle', 'aria-label': 'Open navigation menu', 'aria-controls': 'appSidebar', 'aria-expanded': 'false', onClick: () => window.setMobileNavOpen(true) },
        h('span', { 'aria-hidden': true }, '☰')
      ),
      h('span', { className: 'mobile-nav-title' }, 'Nocturne')
    ),
    h('button', { type: 'button', className: 'mobile-nav-backdrop', id: 'mobileNavBackdrop', 'aria-label': 'Close navigation menu', onClick: () => window.setMobileNavOpen(false) }),
    h('div', { className: 'full-page-pattern', 'aria-hidden': true },
      // Tiled pattern layer…
      h('div', { id: 'nocturnePatternLayer' }, h(CandelabraPattern, { id: 'nocturneCandelabraPattern', layer: 'main' })),
    ),
    h(Sidebar),
    h(ContentSections),
    h(RuneDuelRequestPopup)
  );
}

ReactDOM.createRoot(document.getElementById('react-root')).render(h(App));
updateBackgroundLayerBounds();
applyPatternGeometry();
if (typeof ResizeObserver === 'function') {
  const sidebarForBackgrounds = document.getElementById('appSidebar');
  if (sidebarForBackgrounds) new ResizeObserver(updateBackgroundLayerBounds).observe(sidebarForBackgrounds);
}
