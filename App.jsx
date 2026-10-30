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

  // Only warn when the user has a shared/saved theme worth protecting. A
  // freshly-restored page (snapshot taken at DOMContentLoaded) or an explicit
  // reset is "settled" — no warning. Restoring YOUR OWN saved look on
  // refresh must never prompt.
  if (typeof window.hasUnsavedAppearanceChanges === 'function' && window.hasUnsavedAppearanceChanges()) {
    const proceed = window.confirm('Switching to a premade theme will discard your unsaved appearance changes (colors, pattern tweaks, custom CSS). Continue?');
    if (!proceed) {
      // Restore the select control to the current theme.
      const picker = document.getElementById('premadeThemeSelect');
      if (picker) picker.value = document.documentElement.dataset.theme;
      return false;
    }
  }

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
  ['worldbook', 'Worldbook', '◇'], ['npcs', 'NPCs & Friendship Points', '♧'],
  ['common-rooms', 'Common Rooms', '✧'], ['games', 'House Games', '✦'], ['quest-board', 'Quest & Rumor Board', '⚑'], ['summaries', 'Session Summaries', '≡'],
  ['loot', 'Loot & Rewards', '◈'], ['primer', 'Player Primer', '✦']
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
const GRID_MIN = 1, GRID_MAX = 4;    // motif repeats per tile axis
const OPACITY_MIN = 4, OPACITY_MAX = 70;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

window.nocturnePatternState = { flames: true, tilt: -7.5, tile: 140, svgSize: 70, gridCols: 1, gridRows: 1, opacity: 35, layout: 'stagger', soloMain: false, sidebarPattern: true, noBackground: true, sidebarMatchMain: true, motif: 'candelabra', animateMotif: true };
window.nocturneColorOverrides = {};
window.nocturneSidebarColorOverrides = {};
window.nocturneCustomCss = '';

// Declared BEFORE initAppearanceState() runs below — it validates stored
// overrides against this list.
window.nocturneSwatches = [
  { varName: '--gold', label: 'Accent' },
  { varName: '--purple', label: 'Secondary' },
  { varName: '--rose', label: 'Flame' },
  { varName: '--bg', label: 'Page' },
  { varName: '--surface', label: 'Card' },
  { varName: '--text', label: 'Text' },
  { varName: '--text-dim', label: 'Text dim' },
  { varName: '--line', label: 'Border' }
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
  const stored = readAppearancePref('nocturne-pattern-state', null);
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
    if (['candelabra', 'fleur', 'fish', 'fireflies'].includes(stored.motif)) s.motif = stored.motif;
    if (typeof stored.animateMotif === 'boolean') s.animateMotif = stored.animateMotif;
    if (Number.isFinite(stored.opacity)) s.opacity = clamp(stored.opacity, OPACITY_MIN, OPACITY_MAX);
    if (stored.layout === 'grid' || stored.layout === 'stagger') s.layout = stored.layout;
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
    Object.entries(sidebarOverrides).forEach(([mainVar, color]) => {
      if (typeof color === 'string' && /^#[0-9a-f]{3,8}$/i.test(color)) window.nocturneSidebarColorOverrides[mainVar] = color;
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
    window.localStorage.setItem('nocturne-custom-css', window.nocturneCustomCss);
  } catch (_) { /* private browsing */ }
  if (typeof window.persistNocturneTheme === 'function') window.persistNocturneTheme(document.documentElement.dataset.theme);
}

/* ======== Dirty tracking: warn before losing unsaved appearance work ======== */
// A snapshot of the last "settled" state (defaults after reset, or the state
// when a premade/shared theme was applied). Changes since then = unsaved.
let __settledSnapshot = null;

function captureAppearanceSnapshot() {
  return JSON.stringify({
    pattern: window.nocturnePatternState,
    colors: window.nocturneColorOverrides,
    css: window.nocturneCustomCss,
    brightness: document.documentElement.dataset.brightness || 'dark'
  });
}

function markAppearanceSaved() {
  __settledSnapshot = captureAppearanceSnapshot();
  // Persist the settled baseline so a reload can compare against it even
  // though restore-order varies (DOMContentLoaded vs auth-changed).
  try { window.localStorage.setItem('nocturne-settled-snapshot', __settledSnapshot); } catch (_) {}
}

function hasUnsavedAppearanceChanges() {
  let stored = null;
  try { stored = window.localStorage.getItem('nocturne-settled-snapshot'); } catch (_) {}
  // First ever load (no baseline yet) = nothing unsaved.
  if (stored === null) return false;
  return captureAppearanceSnapshot() !== stored;
}
window.hasUnsavedAppearanceChanges = hasUnsavedAppearanceChanges;
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
    const css = typeof baseline.css === 'string' ? baseline.css : '';
    try { window.localStorage.setItem('nocturne-custom-css', css); } catch (_) {}
    if (baseline.brightness) {
      try { window.localStorage.setItem('nocturne-brightness', baseline.brightness); } catch (_) {}
    }
  } catch (_) { /* malformed baseline — ignore */ }
})();

function applyFlameAnimation() {
  const state = window.nocturnePatternState;
  // Flames only exist on the candelabra motif; the animate toggle governs ALL
  // motif animation (fish sway, firefly drift/pulse) via SMIL pause.
  const animAllowed = state.flames || state.motif !== 'candelabra';
  document.querySelectorAll('.pattern-motif, .candelabra-flames').forEach(group => {
    group.querySelectorAll('animate, animateTransform').forEach(anim => {
      if (animAllowed && state.animateMotif !== false) {
        anim.removeAttribute('data-flame-paused');
        try { anim.unpauseAnimation(); } catch (_) {}
      } else {
        try { anim.pauseAnimation(); } catch (_) {}
        anim.setAttribute('data-flame-paused', 'true');
      }
    });
    if (group.classList.contains('candelabra-flames')) {
      group.style.filter = state.flames ? '' : 'none';
    }
  });
  document.getElementById('nocturnePatternLayer')?.classList.toggle('flames-off', !state.flames && state.motif === 'candelabra');
  document.getElementById('sidebarPattern')?.classList.toggle('flames-off', !state.flames && state.motif === 'candelabra');
}

function applyPatternGeometry() {
  const state = window.nocturnePatternState;
  const root = document.documentElement;
  // Opacity drives ALL layers equally — main tiled, solo overlay, sidebar.
  const op = (state.opacity / 100).toFixed(3);
  root.style.setProperty('--candelabra-pattern-opacity', op);
  root.style.setProperty('--candelabra-pattern-opacity-sidebar', op);
  root.style.setProperty('--candelabra-solo-opacity', op);
  // Sidebar pattern on/off + solo main-window mode + no background at all.
  root.classList.toggle('sidebar-pattern-off', !state.sidebarPattern);
  root.classList.toggle('main-solo-motif', !!state.soloMain);
  root.classList.toggle('no-background', !!state.noBackground);
  // Tilt applies to every layer: rotate the solo motif group and bake the
  // tilt into the tiled motif transforms (buildPatternTile already does).
  const soloGroup = document.getElementById('nocturneSoloMotifGroup');
  if (soloGroup) soloGroup.setAttribute('transform', `rotate(${state.tilt}, 50, 50)`);
  ['nocturneCandelabraPattern', 'nocturneSidebarCandelabraPattern'].forEach(patternId => {
    const pattern = document.getElementById(patternId);
    if (!pattern) return;
    pattern.setAttribute('width', String(state.tile));
    pattern.setAttribute('height', String(state.tile));
    // Rebuild the tile contents: gridCols/gridRows/svgSize/tilt all change
    // what the tile must contain, which plain attribute tweaks can't express.
    pattern.innerHTML = buildPatternTile(state);
  });
}

// One tile's worth of motifs. svgSize (%) counteracts tile size so the motif
// keeps a sane visual weight whether the tile is 90px or 240px; gridCols /
// gridRows repeat the motif across the tile for denser weaves.
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
}

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
  applyFlameAnimation();
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
  Object.values(SIDEBAR_COLOR_MAP).forEach(v => {
    if (matchMain) root.style.removeProperty(v);
  });
  if (matchMain) return;
  // Independent mode: apply each saved override to its sidebar variable.
  Object.entries(SIDEBAR_COLOR_MAP).forEach(([mainVar, sidebarVar]) => {
    const color = window.nocturneSidebarColorOverrides[mainVar];
    if (color && /^#[0-9a-f]{3,8}$/i.test(color)) root.style.setProperty(sidebarVar, color);
    else root.style.removeProperty(sidebarVar);
  });
}

function setNocturneSidebarMatchMain(match) {
  window.nocturnePatternState.sidebarMatchMain = !!match;
  applySidebarColorOverrides();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneSidebarMatchMain = setNocturneSidebarMatchMain;

function setNocturneSidebarColorOverride(mainVar, color) {
  if (!SIDEBAR_COLOR_MAP[mainVar]) return;
  if (color && /^#[0-9a-f]{3,8}$/i.test(color)) window.nocturneSidebarColorOverrides[mainVar] = color;
  else delete window.nocturneSidebarColorOverrides[mainVar];
  window.nocturnePatternState.sidebarMatchMain = false;  // overriding = independent
  applySidebarColorOverrides();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneSidebarColorOverride = setNocturneSidebarColorOverride;

function setNocturneNoBackground(on) {
  window.nocturnePatternState.noBackground = !!on;
  applyPatternGeometry();
  persistAppearanceState();
  emitAppearanceChange();
}
window.setNocturneNoBackground = setNocturneNoBackground;

function setNocturneMotif(motif) {
  if (!['candelabra', 'fleur', 'fish', 'fireflies'].includes(motif)) return;
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
  window.nocturnePatternState = { flames: true, tilt: -7.5, tile: 140, svgSize: 70, gridCols: 1, gridRows: 1, opacity: 35, layout: 'stagger', soloMain: false, sidebarPattern: true, noBackground: true, sidebarMatchMain: true, motif: 'candelabra', animateMotif: true };
  window.nocturneColorOverrides = {};
  window.nocturneSidebarColorOverrides = {};
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
    if (typeof snapshot.pattern.soloMain === 'boolean') s.soloMain = snapshot.pattern.soloMain;
    if (typeof snapshot.pattern.sidebarPattern === 'boolean') s.sidebarPattern = snapshot.pattern.sidebarPattern;
    if (typeof snapshot.pattern.noBackground === 'boolean') s.noBackground = snapshot.pattern.noBackground;
    if (typeof snapshot.pattern.sidebarMatchMain === 'boolean') s.sidebarMatchMain = snapshot.pattern.sidebarMatchMain;
  }
  const sidebarColors = (snapshot.sidebarColors && typeof snapshot.sidebarColors === 'object') ? snapshot.sidebarColors : {};
  window.nocturneSidebarColorOverrides = {};
  Object.keys(SIDEBAR_COLOR_MAP).forEach(mainVar => {
    const value = sidebarColors[mainVar];
    if (typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value)) window.nocturneSidebarColorOverrides[mainVar] = value;
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
  // Three drifting, pulsing fireflies. Drift/pulse animate only when
  // animateMotif is on.
  const fly = (cx, cy, dur, delay, r) => {
    const drift = window.nocturnePatternState.animateMotif
      ? `<animateTransform attributeName="transform" type="translate" values="0 0; 6 ${-r * 2}; -4 ${r}; 0 0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>`
      : '';
    const pulse = window.nocturnePatternState.animateMotif
      ? `<animate attributeName="opacity" values="0.25;1;0.35;0.9;0.25" dur="${(dur * 0.7).toFixed(1)}s" begin="${delay}s" repeatCount="indefinite"/>`
      : '';
    return `\
<g>${drift}\
<circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="var(--candelabra-flame-glow)" opacity="0.3">${pulse}</circle>\
<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--candelabra-flame)" opacity="0.9">${pulse}</circle>\
<circle cx="${cx}" cy="${cy}" r="1" fill="var(--candelabra-fill)"/>\
</g>`;
  };
  return `\
<g class="pattern-motif">\
${fly(30, 34, 5.2, 0, 4)}\
${fly(64, 26, 6.4, 1.1, 3)}\
${fly(52, 68, 7.1, 2.0, 3.5)}\
<path d="M20 78 Q 50 70 80 78" fill="none" stroke="var(--candelabra-stroke)" stroke-width="1.2" opacity="0.35"/>\
<path d="M24 84 Q 50 78 76 84" fill="none" stroke="var(--candelabra-stroke)" stroke-width="1" opacity="0.25"/>\
</g>`;
}

const MOTIF_BUILDERS = {
  candelabra: candelabraMotif,
  fleur: fleurDeLisMotif,
  fish: fishMotif,
  fireflies: firefliesMotif
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

function CandelabraPattern({ id }) {
  const tile = candelabraTilePx();
  return h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: '100%', height: '100%', preserveAspectRatio: 'none',
    'aria-hidden': true, focusable: false
  },
    h('defs', null,
      h('pattern', {
        id, width: tile, height: tile, patternUnits: 'userSpaceOnUse',
        dangerouslySetInnerHTML: { __html: buildPatternTile(window.nocturnePatternState) }
      })
    ),
    h('rect', { width: '100%', height: '100%', fill: `url(#${id})` })
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
  return h('nav', { className: `sidebar${savedSidebarCollapsed ? ' collapsed' : ''}`, id: 'appSidebar', style: { display: 'none' } },
    h('div', { className: 'sidebar-pattern', id: 'sidebarPattern', 'aria-hidden': true }, h(CandelabraPattern, { id: 'nocturneSidebarCandelabraPattern' })),
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
      h('li', { style: { padding: '0 4px' } }, h('button', { className: 'nav-chat-btn', onClick: () => { window.setMobileNavOpen(false); window.openChatModal(); } },
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
  return h('main', { id: 'appMain', style: { display: 'none' } },
    h(HomePage), h(WorldbookPage), h(NpcsPage), h(CharactersPage),
    h(CommonRoomsPage), h(GamesHub), h(SummariesPage), h(QuestBoardPage), h(LootPage), h(PrimerPage), h(RestrictedPage),
    h(ThemeStudio)
  );
}

function ChatModal() {
  return h('div', { id: 'chatModalOverlay', className: 'chat-modal-overlay' }, h('div', { className: 'chat-modal' },
    h('div', { className: 'chat-header' }, h('div', { className: 'chat-header-left' }, h('button', { className: 'btn btn-sm btn-secondary chat-drawer-toggle', onClick: () => window.toggleChatDrawer(), title: 'Toggle Session List', 'aria-expanded': 'false' }, '☰'), h('h4', { id: 'modalChatTitle' }, 'Session Chat')), h('div', { className: 'chat-header-actions' }, h('span', { id: 'chatStatusBadge', className: 'status-badge' }, 'Locked'), h('button', { className: 'btn btn-sm btn-secondary', onClick: () => window.closeChatModal() }, '✕'))),
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
  ));
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
    h('div', { className: 'sidebar-pattern full-page-pattern', 'aria-hidden': true },
      // Tiled pattern layer (hidden in solo mode)…
      h('div', { id: 'nocturnePatternLayer' }, h(CandelabraPattern, { id: 'nocturneCandelabraPattern' })),
      // …and the solo overlay: ONE giant candelabra centered in the viewport.
      // Rendered as a plain SVG sized by CSS (not an SVG pattern), so it can
      // never tile, clip, or shift.
      h('svg', {
        id: 'nocturneSoloMotif', className: 'nocturne-solo-motif',
        viewBox: '-20 -20 140 140', preserveAspectRatio: 'xMidYMid meet',
        'aria-hidden': true, focusable: false,
        dangerouslySetInnerHTML: { __html: `<g id="nocturneSoloMotifGroup">${CANDELABRA_MOTIF_MARKUP()}</g>` }
      })
    ),
    h(Sidebar),
    h(ContentSections),
    h(RuneDuelRequestPopup),
    h(ChatModal)
  );
}

ReactDOM.createRoot(document.getElementById('react-root')).render(h(App));
