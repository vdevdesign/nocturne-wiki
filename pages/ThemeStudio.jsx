window.ThemeStudio = function ThemeStudio() {
  return h('section', { id: 'theme-studio', className: 'theme-studio-page' },
    h('header', { className: 'theme-studio-page-header' },
      h('button', {
        type: 'button',
        className: 'btn btn-secondary theme-studio-exit',
        onClick: () => {
          const historyState = window.history.state || {};
          if (historyState.nocturnePage === 'theme-studio' && historyState.nocturneIndex > 0) {
            window.navigateBack();
          } else {
            window.navigateTo(window.localStorage.getItem('nocturne-pre-studio-page') || 'home');
          }
        }
      }, '← Exit'),
      h('div', { className: 'theme-studio-page-title' },
        h('p', { className: 'eyebrow' }, 'Appearance'),
        h('h2', null, 'Theme Studio'),
        h('p', null, 'Edit your theme and preview the real Home page.')
      ),
      h(ThemeStudioHeaderBar)
    ),
    h(ThemeStudioBody)
  );
};

/* ======== Top bar: theme name + Publish at the top right ======== */

// Built-in premade themes — same list as the account system.
const PREMADE_THEMES = [
  ['nocturne', 'Nocturne (Dark)'], ['dracula', 'Dracula (Dark)'], ['alucard', 'Alucard (Light)'],
  ['sylvan', 'Sylvan (Dark)'], ['steampunk', 'Steampunk (Dark)'], ['frost', 'Frost (Light)'],
  ['starlight', 'Starlight (Medium)'], ['lush', 'Lush (Dark)'], ['mystic', 'Mystic (Dark)'],
  ['potion', 'Potion (Dark)'], ['underdark', 'Underdark (Dark)']
];

function PremadeThemePicker() {
  const [current, setCurrent] = React.useState(document.documentElement.dataset.theme || 'nocturne');
  React.useEffect(() => {
    const sync = () => setCurrent(document.documentElement.dataset.theme);
    window.addEventListener('nocturne-theme-updated', sync);
    return () => window.removeEventListener('nocturne-theme-updated', sync);
  }, []);
  return h('div', { className: 'premade-theme-picker' },
    h('label', { htmlFor: 'premadeThemeSelect', className: 'premade-theme-label' }, 'Premade themes'),
    h('select', {
      id: 'premadeThemeSelect',
      className: 'input-control premade-theme-select',
      value: current,
      onChange: e => {
        const ok = window.setNocturneTheme(e.target.value);
        if (ok === false) setCurrent(document.documentElement.dataset.theme);  // user cancelled
        else setCurrent(e.target.value);
      }
    }, PREMADE_THEMES.map(([value, label]) => h('option', { key: value, value }, label)))
  );
}

function ThemeStudioHeaderBar() {
  const [name, setName] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');

  async function publish() {
    const result = await window.saveNocturneSharedTheme(name);
    if (result.ok) {
      setStatus(result.localOnly ? 'Saved locally (offline preview).' : `Theme "${name.trim()}" submitted for DM approval.`);
      setError('');
      setName('');
      window.dispatchEvent(new CustomEvent('nocturne-shared-themes-changed'));
    } else {
      setError(result.error);
      setStatus('');
    }
  }

  return h('div', { className: 'theme-studio-header-bar' },
    h('span', { className: 'theme-studio-header-hint' }, 'Publish your current look as a shared theme — the DM reviews it before it goes live.'),
    h('div', { className: 'theme-studio-header-actions' },
      h(PremadeThemePicker),
      h('div', { className: 'shared-theme-save-row' },
        h('input', {
          type: 'text', className: 'input-control', maxLength: 60,
          placeholder: 'Theme name, e.g. Blood Moon',
          value: name,
          'aria-label': 'Shared theme name',
          onInput: e => setName(e.target.value),
          onKeyDown: e => { if (e.key === 'Enter') { e.preventDefault(); publish(); } }
        }),
        h('button', { type: 'button', className: 'btn btn-sm', onClick: publish, disabled: !name.trim() }, 'Publish')
      )
    ),
    status ? h('p', { className: 'css-editor-status theme-studio-header-status' }, status) : null,
    error ? h('p', { className: 'error-msg theme-studio-header-status' }, error) : null
  );
}

/* ============================ Home Preview ============================ */

function namespacePreviewSvg(svg) {
  const ids = new Map();
  svg.querySelectorAll('[id]').forEach((element, index) => {
    const oldId = element.id;
    const newId = `theme-preview-${index}-${oldId}`;
    ids.set(oldId, newId);
    element.id = newId;
  });
  svg.querySelectorAll('*').forEach(element => {
    [...element.attributes].forEach(attribute => {
      let value = attribute.value.replace(/url\(#([^)]+)\)/g, (match, id) =>
        ids.has(id) ? `url(#${ids.get(id)})` : match
      );
      if ((attribute.name === 'href' || attribute.name === 'xlink:href') && value.startsWith('#')) {
        const id = value.slice(1);
        if (ids.has(id)) value = `#${ids.get(id)}`;
      }
      if (value !== attribute.value) element.setAttribute(attribute.name, value);
    });
  });
}

function clonePreviewNode(source, kind, preserveIds = false) {
  if (!source) return null;
  const clone = source.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.add(kind);
  clone.querySelectorAll('[id]').forEach(element => {
    if (element.id === 'campaign-dashboard-content') element.classList.add('theme-preview-dashboard-content');
    if (!preserveIds) element.removeAttribute('id');
  });
  clone.querySelectorAll('*').forEach(element => {
    [...element.attributes].forEach(attribute => {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
    });
    if (element.tagName === 'A') element.removeAttribute('href');
  });
  return clone;
}

function ThemePreviewSite({ device }) {
  const [desktopScale, setDesktopScale] = React.useState(1);
  const frameRef = React.useRef(null);
  const sidebarRef = React.useRef(null);
  const mobileBarRef = React.useRef(null);
  const mainRef = React.useRef(null);
  const patternRef = React.useRef(null);
  const lastMainPattern = React.useRef('');
  const lastSidebarPattern = React.useRef('');

  React.useEffect(() => {
    if (device !== 'desktop' || !frameRef.current) return undefined;
    const canvas = frameRef.current.parentElement;
    const resize = () => setDesktopScale(Math.min(1, Math.max(0.25, (canvas.clientWidth - 20) / 1160)));
    resize();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [device]);

  React.useEffect(() => {
    const syncSidebar = () => {
      const source = document.getElementById('appSidebar');
      const clone = clonePreviewNode(source, 'theme-preview-sidebar', true);
      if (!clone) return;
      clone.style.removeProperty('display');
      clone.id = source.id;
      clone.querySelectorAll('.navlist button[data-target]').forEach(button => {
        button.classList.toggle('active', button.dataset.target === 'home');
      });
      sidebarRef.current.replaceChildren(clone);
      lastSidebarPattern.current = '';
      syncSidebarPattern();
      syncThemeSelection();
    };
    const syncSidebarPattern = () => {
      const sourceLayer = document.getElementById('sidebarPattern');
      const sourceSvg = sourceLayer?.querySelector('svg');
      const sourceParticles = sourceLayer?.querySelector('.nocturne-fireflies-particles');
      const previewLayer = sidebarRef.current?.querySelector('.sidebar-pattern');
      if (!sourceSvg || !previewLayer) return;
      previewLayer.style.position = 'absolute';
      ['top', 'left', 'right', 'bottom', 'width', 'height'].forEach(property => previewLayer.style.removeProperty(property));
      let replacedPattern = false;
      const patternMarkup = `${sourceSvg.outerHTML}${sourceParticles?.outerHTML || ''}`;
      if (patternMarkup !== lastSidebarPattern.current) {
        const svg = sourceSvg.cloneNode(true);
        previewLayer.replaceChildren(svg, ...(sourceParticles ? [sourceParticles.cloneNode(true)] : []));
        lastSidebarPattern.current = patternMarkup;
        replacedPattern = true;
      }
      const svg = previewLayer.querySelector('svg[data-layer="sidebar"]');
      if (svg) {
        if (replacedPattern) namespacePreviewSvg(svg);
        if (window.refreshNocturnePatternSvg('sidebar', svg, previewLayer)) namespacePreviewSvg(svg);
      }
      previewLayer.classList.add('theme-preview-sidebar-pattern');
      previewLayer.classList.toggle('flames-off', sourceLayer.classList.contains('flames-off'));
      previewLayer.classList.toggle('pattern-inverted', document.documentElement.classList.contains('pattern-inverted'));
      previewLayer.classList.toggle('fireflies-active', sourceLayer.classList.contains('fireflies-active'));
      previewLayer.classList.toggle('motif-animation-off', sourceLayer.classList.contains('motif-animation-off'));
      previewLayer.style.opacity = getComputedStyle(sourceLayer).opacity;
      previewLayer.style.setProperty('--firefly-offset-x', sourceLayer.style.getPropertyValue('--firefly-offset-x'));
      previewLayer.style.setProperty('--firefly-offset-y', sourceLayer.style.getPropertyValue('--firefly-offset-y'));
      previewLayer.hidden = document.documentElement.classList.contains('no-background')
        || document.documentElement.classList.contains('sidebar-pattern-off');
    };
    const syncThemeSelection = () => {
      const value = document.getElementById('themeSelectInline')?.value;
      const previewSelect = sidebarRef.current?.querySelector('#themeSelectInline');
      if (value && previewSelect) previewSelect.value = value;
    };
    const syncMobileBar = () => {
      const source = document.querySelector('.mobile-nav-bar');
      const clone = clonePreviewNode(source, 'theme-preview-mobile-bar');
      if (!clone) return;
      clone.classList.remove('mobile-nav-bar');
      mobileBarRef.current.replaceChildren(clone);
    };
    const syncHome = () => {
      const source = document.querySelector('#appMain > #home');
      const clone = clonePreviewNode(source, 'theme-preview-home', true);
      if (!clone) return;
      clone.id = source.id;
      clone.classList.add('active');
      clone.querySelector('.page-back-button')?.setAttribute('hidden', '');
      mainRef.current.replaceChildren(clone);
    };
    const syncPattern = () => {
      const sourceLayer = document.getElementById('nocturnePatternLayer');
      const source = sourceLayer?.querySelector('svg');
      const sourceParticles = sourceLayer?.querySelector('.nocturne-fireflies-particles');
      if (!source || !sourceLayer) return;
      let replacedPattern = false;
      const patternMarkup = `${source.outerHTML}${sourceParticles?.outerHTML || ''}`;
      if (patternMarkup !== lastMainPattern.current) {
        const clone = source.cloneNode(true);
        clone.classList.add('theme-preview-main-pattern-svg');
        patternRef.current.replaceChildren(clone, ...(sourceParticles ? [sourceParticles.cloneNode(true)] : []));
        lastMainPattern.current = patternMarkup;
        replacedPattern = true;
      }
      const previewSvg = patternRef.current.querySelector('svg');
      if (previewSvg) {
        if (replacedPattern) namespacePreviewSvg(previewSvg);
        if (window.refreshNocturnePatternSvg('main', previewSvg, patternRef.current)) namespacePreviewSvg(previewSvg);
      }
      patternRef.current.style.opacity = getComputedStyle(sourceLayer).opacity;
      patternRef.current.classList.toggle('flames-off', sourceLayer.classList.contains('flames-off'));
      patternRef.current.classList.toggle('pattern-inverted', document.documentElement.classList.contains('pattern-inverted'));
      patternRef.current.classList.toggle('fireflies-active', sourceLayer.classList.contains('fireflies-active'));
      patternRef.current.classList.toggle('motif-animation-off', sourceLayer.classList.contains('motif-animation-off'));
      patternRef.current.style.setProperty('--firefly-offset-x', sourceLayer.style.getPropertyValue('--firefly-offset-x'));
      patternRef.current.style.setProperty('--firefly-offset-y', sourceLayer.style.getPropertyValue('--firefly-offset-y'));
      patternRef.current.hidden = document.documentElement.classList.contains('no-background');
      syncSidebarPattern();
      window.applyNocturnePatternAnimation?.();
    };

    syncSidebar();
    syncMobileBar();
    syncHome();
    syncPattern();
    const observers = [];
    if (typeof ResizeObserver === 'function') {
      const resizeObserver = new ResizeObserver(() => {
        const sidebarPattern = sidebarRef.current?.querySelector('.sidebar-pattern');
        const sidebarSvg = sidebarPattern?.querySelector('svg[data-layer="sidebar"]');
        if (sidebarSvg && window.refreshNocturnePatternSvg('sidebar', sidebarSvg, sidebarPattern)) namespacePreviewSvg(sidebarSvg);
        const mainSvg = patternRef.current?.querySelector('svg');
        if (mainSvg && window.refreshNocturnePatternSvg('main', mainSvg, patternRef.current)) namespacePreviewSvg(mainSvg);
      });
      if (sidebarRef.current) resizeObserver.observe(sidebarRef.current);
      if (patternRef.current) resizeObserver.observe(patternRef.current);
      observers.push(resizeObserver);
    }
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) {
      const observer = new MutationObserver(syncSidebar);
      observer.observe(sidebar, { attributes: true });
      observers.push(observer);
    }
    const home = document.querySelector('#appMain > #home');
    if (home) {
      const observer = new MutationObserver(syncHome);
      observer.observe(home, { attributes: true, childList: true, subtree: true, characterData: true });
      observers.push(observer);
    }
    const mainPattern = document.getElementById('nocturnePatternLayer');
    if (mainPattern) {
      const observer = new MutationObserver(syncPattern);
      observer.observe(mainPattern, { attributes: true, childList: true, subtree: true });
      observers.push(observer);
    }
    const onPatternChange = () => syncPattern();
    const onThemeChange = () => syncThemeSelection();
    window.addEventListener('nocturne-pattern-updated', onPatternChange);
    window.addEventListener('nocturne-theme-updated', onThemeChange);
    return () => {
      observers.forEach(observer => observer.disconnect());
      window.removeEventListener('nocturne-pattern-updated', onPatternChange);
      window.removeEventListener('nocturne-theme-updated', onThemeChange);
    };
  }, []);

  return h('div', {
    className: `theme-preview-fit-frame ${device === 'mobile' ? 'is-mobile' : 'is-desktop'}`,
    ref: frameRef,
    style: device === 'mobile'
      ? { width: '390px', height: '720px' }
      : { width: `${1160 * desktopScale}px`, height: `${760 * desktopScale}px` }
  },
    h('div', {
      className: `theme-preview-site ${device === 'mobile' ? 'is-mobile' : 'is-desktop'}`,
      style: device === 'mobile'
        ? { width: '390px', height: '720px' }
        : { width: '1160px', height: '760px', transform: `scale(${desktopScale})`, transformOrigin: 'top left' }
    },
      h('div', { className: 'theme-preview-mobile-bar', ref: mobileBarRef }),
      h('div', { className: 'theme-preview-sidebar-slot', ref: sidebarRef }),
      h('main', { id: 'appMain', className: 'site-main theme-preview-main' },
        h('div', { id: 'nocturnePatternLayer', className: 'theme-preview-main-pattern', ref: patternRef, 'aria-hidden': true }),
        h('div', { className: 'theme-preview-home-slot', ref: mainRef })
      )
    )
  );
}

/* ============================ Sidebar editor ============================ */

const GRID_MIN = 1, GRID_MAX = 12;      // motif repeats per tile axis
const MOTIF_SIZE_MIN = 10, MOTIF_SIZE_MAX = 200;
const OPACITY_MIN = 4, OPACITY_MAX = 70;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/* ======== Dual background editor (Sidebar BG / Main BG tabs) ========
   Each layer independently picks: motif, literal grid cols/rows (exact
   repeat count across the layer), opacity, tiled-vs-single mode, and
   fixed-vs-scroll attachment. Every numeric control is a paired
   range slider + text input so exact values can be typed. */

const LAYER_MOTIFS = [
  ['dragon', 'Breathing Dragon'],
  ['candelabra', 'Candelabra'],
  ['fleur', 'Fleur-de-lis'],
  ['fish', 'Fish'],
  ['fireflies', 'Fireflies']
];

// Paired control: slider + synced number text input. The slider drives
// live updates; the text field commits exact typed values on Enter/blur.
function DualInput({ label, min, max, step, value, draft, onDraft, onCommit, suffix }) {
  return h('label', { className: 'theme-studio-slider-label dual-input' },
    h('span', null, label,
      h('input', {
        type: 'number', className: 'dual-input-number', min, max, step,
        value: draft == null ? String(value) : draft, 'aria-label': label + ' exact value',
        onChange: e => onDraft(e.target.value),
        onBlur: () => onCommit(),
        onKeyDown: e => { if (e.key === 'Enter') { e.preventDefault(); onCommit(); } }
      }),
      suffix ? h('code', null, suffix) : null
    ),
    h('input', {
      type: 'range', min, max, step, value,
      'aria-label': label + ' slider',
      onInput: e => { onDraft(e.target.value); onCommit(+e.target.value); }
    })
  );
}

function NumericRangeControl({ label, min, max, value, onChange }) {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => setDraft(String(value)), [value]);
  function commit(raw) {
    if (raw === '') { setDraft(String(value)); return; }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) { setDraft(String(value)); return; }
    const next = clamp(Math.round(parsed), min, max);
    setDraft(String(next));
    onChange(next);
  }
  return h(DualInput, {
    label, min, max, step: 1, value, draft,
    onDraft: setDraft,
    onCommit: next => commit(typeof next === 'number' ? String(next) : draft)
  });
}

function BackgroundEditor({ bgTab, setBgTab, layerCfg, layerDrafts, setLayerDrafts, dragonStatus }) {
  const layer = bgTab;
  const cfg = layerCfg[layer] || {};
  const drafts = layerDrafts[layer] || {};

  function setDraft(field, value) {
    setLayerDrafts(previous => ({
      ...previous,
      [layer]: { ...previous[layer], [field]: String(value) }
    }));
  }

  function commitDraft(field, raw) {
    if (raw === '') { setDraft(field, String(cfg[field])); return; }
    const num = Number(raw);
    if (!Number.isFinite(num)) { setDraft(field, String(cfg[field])); return; }
    const bounds = {
      gridCols: [GRID_MIN, GRID_MAX],
      gridRows: [GRID_MIN, GRID_MAX],
      opacity: [OPACITY_MIN, OPACITY_MAX],
      size: [MOTIF_SIZE_MIN, MOTIF_SIZE_MAX],
      tilt: [-180, 180]
    }[field];
    const value = clamp(Math.round(num), bounds[0], bounds[1]);
    if (field === 'size') window.setNocturneLayerSize(layer, value);
    else if (field === 'tilt') window.setNocturneLayerTilt(layer, value);
    else window.setNocturneLayerGridOrOpacity(layer, field, value);
    setDraft(field, String(value));
  }

  return h('div', { className: 'background-editor' },
    h('div', { className: 'background-editor-tabs' },
      [['sidebar', 'Sidebar BG'], ['main', 'Main BG']].map(([key, label]) => h('button', {
        type: 'button', key,
        className: 'btn btn-sm ' + (bgTab === key ? 'btn-active-choice' : 'btn-secondary'),
        'aria-pressed': String(bgTab === key),
        onClick: () => setBgTab(key)
      }, label))
    ),

    h(LayerAlignmentEditor, { scope: layer, key: `alignment-${layer}` }),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Motif pattern'),
      h('div', { className: 'theme-studio-toggle-row' },
        LAYER_MOTIFS.map(([value, label]) => h('button', {
          type: 'button', key: value,
          disabled: value === 'dragon' && dragonStatus !== 'ready',
          title: value === 'dragon' && dragonStatus === 'loading'
            ? 'Loading the supplied dragon artwork…'
            : value === 'dragon' && dragonStatus === 'error'
              ? 'The supplied dragon artwork could not be loaded.'
              : undefined,
          'aria-pressed': String(cfg.motif === value),
          className: 'btn btn-sm ' + (cfg.motif === value ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneLayerMotif(layer, value)
        }, label))
      )
    ),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Background mode'),
      h('div', { className: 'theme-studio-toggle-row' },
        h('button', {
          type: 'button',
          'aria-pressed': String(!cfg.single),
          className: 'btn btn-sm ' + (!cfg.single ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneLayerSingle(layer, false)
        }, 'Repeating tiles'),
        h('button', {
          type: 'button',
          'aria-pressed': String(!!cfg.single),
          className: 'btn btn-sm ' + (cfg.single ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneLayerSingle(layer, true)
        }, 'Single large motif')
      ),
      h('span', { className: 'theme-studio-hint' },
        cfg.single
            ? 'One large, aspect-ratio-preserving motif fills the layer without cropping.'
            : `Exact ${cfg.gridCols || 1}×${cfg.gridRows || 1} grid; each cell is sized to the layer, including 1×1.`)
    ),

    !cfg.single ? h(React.Fragment, null,
      h(DualInput, {
        label: 'Grid columns', min: GRID_MIN, max: GRID_MAX, step: 1,
        value: cfg.gridCols, draft: drafts.gridCols,
        onDraft: v => setDraft('gridCols', v),
        onCommit: v => (typeof v === 'number' ? window.setNocturneLayerGrid(layer, 'gridCols', v) : commitDraft('gridCols', drafts.gridCols))
      }),
      h(DualInput, {
        label: 'Grid rows', min: GRID_MIN, max: GRID_MAX, step: 1,
        value: cfg.gridRows, draft: drafts.gridRows,
        onDraft: v => setDraft('gridRows', v),
        onCommit: v => (typeof v === 'number' ? window.setNocturneLayerGrid(layer, 'gridRows', v) : commitDraft('gridRows', drafts.gridRows))
      })
    ) : null,

    h(DualInput, {
      label: 'Motif size', min: MOTIF_SIZE_MIN, max: MOTIF_SIZE_MAX, step: 1,
      value: cfg.size, draft: drafts.size,
      onDraft: v => setDraft('size', v),
      onCommit: v => (typeof v === 'number' ? window.setNocturneLayerSize(layer, v) : commitDraft('size', drafts.size)),
      suffix: '%'
    }),

    h(DualInput, {
      label: 'Tilt angle', min: -180, max: 180, step: 1,
      value: cfg.tilt, draft: drafts.tilt,
      onDraft: v => setDraft('tilt', v),
      onCommit: v => (typeof v === 'number' ? window.setNocturneLayerTilt(layer, v) : commitDraft('tilt', drafts.tilt)),
      suffix: '°'
    }),

    h(DualInput, {
      label: 'Opacity', min: OPACITY_MIN, max: OPACITY_MAX, step: 1,
      value: cfg.opacity, draft: drafts.opacity,
      onDraft: v => setDraft('opacity', v),
      onCommit: v => (typeof v === 'number' ? window.setNocturneLayerOpacity(layer, v) : commitDraft('opacity', drafts.opacity)),
      suffix: '%'
    }),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Scroll behavior'),
      h('div', { className: 'theme-studio-toggle-row' },
        h('button', {
          type: 'button',
          'aria-pressed': String(cfg.sticky !== false),
          className: 'btn btn-sm ' + (cfg.sticky !== false ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneLayerSticky(layer, true)
        }, 'Sticky (fixed)'),
        h('button', {
          type: 'button',
          'aria-pressed': String(cfg.sticky === false),
          className: 'btn btn-sm ' + (cfg.sticky === false ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneLayerSticky(layer, false)
        }, 'Scrolls with page')
      )
    ),

    h('p', { className: 'theme-studio-hint' },
      'Colors follow the active Nocturne theme variables. Fire animates and glows with the theme flame colors.')
  );
}

function BackgroundStudioControls() {
  const [dragonStatus, setDragonStatus] = React.useState(window.nocturneDragonHeadStatus || 'loading');
  const [bgTab, setBgTab] = React.useState('main');
  const [layerCfg, setLayerCfg] = React.useState(() => ({
    sidebar: { ...(window.nocturnePatternState.sidebar || {}) },
    main: { ...(window.nocturnePatternState.main || {}) }
  }));
  const [layerDrafts, setLayerDrafts] = React.useState(() => {
    const state = window.nocturnePatternState;
    return Object.fromEntries(['sidebar', 'main'].map(layer => {
      const config = state[layer] || {};
      return [layer, {
        gridCols: String(config.gridCols || 1),
        gridRows: String(config.gridRows || 1),
        opacity: String(config.opacity || 35),
        size: String(config.size || 85),
        tilt: String(config.tilt || 0)
      }];
    }));
  });
  const [options, setOptions] = React.useState(() => ({
    flames: !!window.nocturnePatternState.flames,
    animateMotif: !!window.nocturnePatternState.animateMotif,
    sidebarPattern: !!window.nocturnePatternState.sidebarPattern,
    noBackground: !!window.nocturnePatternState.noBackground,
    inverted: document.documentElement.classList.contains('pattern-inverted')
  }));

  React.useEffect(() => {
    const sync = () => {
      const state = window.nocturnePatternState;
      const nextLayerCfg = {
        sidebar: { ...(state.sidebar || {}) },
        main: { ...(state.main || {}) }
      };
      setLayerCfg(nextLayerCfg);
      setLayerDrafts(Object.fromEntries(['sidebar', 'main'].map(layer => [layer, {
        gridCols: String(nextLayerCfg[layer].gridCols || 1),
        gridRows: String(nextLayerCfg[layer].gridRows || 1),
        opacity: String(nextLayerCfg[layer].opacity || 35),
        size: String(nextLayerCfg[layer].size || 85),
        tilt: String(nextLayerCfg[layer].tilt || 0)
      }])));
      setOptions({
        flames: !!state.flames,
        animateMotif: !!state.animateMotif,
        sidebarPattern: !!state.sidebarPattern,
        noBackground: !!state.noBackground,
        inverted: document.documentElement.classList.contains('pattern-inverted')
      });
    };
    window.addEventListener('nocturne-pattern-updated', sync);
    return () => window.removeEventListener('nocturne-pattern-updated', sync);
  }, []);
  React.useEffect(() => {
    const ready = () => setDragonStatus('ready');
    const error = () => setDragonStatus('error');
    window.addEventListener('nocturne-dragon-head-ready', ready);
    window.addEventListener('nocturne-dragon-head-error', error);
    return () => {
      window.removeEventListener('nocturne-dragon-head-ready', ready);
      window.removeEventListener('nocturne-dragon-head-error', error);
    };
  }, []);

  return h('div', { className: 'theme-studio-background-controls', 'aria-label': 'Background settings' },
    h('div', null,
      h('h3', null, 'Background motifs'),
      h('p', { className: 'theme-studio-hint' }, 'Choose independent motifs, exact grids, and layout behavior for the sidebar and main content.')
    ),
    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Background layer'),
      h('div', { className: 'theme-studio-toggle-row' },
        h('button', {
          type: 'button', className: `btn btn-sm ${!options.noBackground ? 'btn-active-choice' : 'btn-secondary'}`,
          'aria-pressed': String(!options.noBackground),
          onClick: () => window.setNocturneNoBackground(false)
        }, 'On'),
        h('button', {
          type: 'button', className: `btn btn-sm ${options.noBackground ? 'btn-active-choice' : 'btn-secondary'}`,
          'aria-pressed': String(options.noBackground),
          onClick: () => window.setNocturneNoBackground(true)
        }, 'Off')
      )
    ),
    h('label', { className: 'theme-studio-slider-label' },
        h('span', null, 'Sidebar background'),
        h('div', { className: 'theme-studio-toggle-row' },
          h('button', {
            type: 'button', className: `btn btn-sm ${options.sidebarPattern ? 'btn-active-choice' : 'btn-secondary'}`,
            'aria-pressed': String(options.sidebarPattern),
            onClick: () => window.setNocturneSidebarPattern(!options.sidebarPattern)
          }, options.sidebarPattern ? 'Pattern on' : 'Pattern off')
        )
      ),
    h('label', { className: 'theme-studio-slider-label' },
        h('span', null, 'Flame glow'),
        h('button', {
          type: 'button',
          className: `btn btn-sm ${options.flames ? 'btn-flame-on' : 'btn-secondary'}`,
          'aria-pressed': String(options.flames),
          onClick: () => window.setNocturnePatternFlames(!options.flames)
        }, options.flames ? 'Fire glow on' : 'Fire glow off')
      ),
    h('label', { className: 'theme-studio-slider-label' },
        h('span', null, 'Motif animation'),
        h('button', {
          type: 'button', className: `btn btn-sm ${options.animateMotif ? 'btn-active-choice' : 'btn-secondary'}`,
          'aria-pressed': String(options.animateMotif),
          onClick: () => window.setNocturneAnimateMotif(!options.animateMotif)
        }, options.animateMotif ? 'Animated' : 'Static')
      ),
    h('label', { className: 'theme-studio-slider-label' },
        h('span', null, 'Background contrast'),
        h('button', {
          type: 'button', className: `btn btn-sm ${options.inverted ? 'btn-active-choice' : 'btn-secondary'}`,
          'aria-pressed': String(options.inverted),
          onClick: () => window.togglePatternInverted()
        }, options.inverted ? 'Inverted' : 'Regular')
      ),
    h(BackgroundEditor, { bgTab, setBgTab, layerCfg, layerDrafts, setLayerDrafts, dragonStatus }),
    options.noBackground
      ? h('p', { className: 'theme-studio-hint' }, 'The background layer is hidden. Motif choices remain saved and ready to display when you turn it on.')
      : null,
    dragonStatus === 'loading'
      ? h('p', { className: 'theme-studio-hint', role: 'status' }, 'Loading supplied dragon SVG…')
      : dragonStatus === 'error'
        ? h('p', { className: 'theme-studio-hint error-msg', role: 'alert' }, 'The supplied dragon SVG could not be loaded. Check the browser console for details.')
        : null
  );
}

function ThemeStudioControls() {
  const [flames, setFlames] = React.useState(window.nocturnePatternState.flames);
  const [sidebarPattern, setSidebarPattern] = React.useState(window.nocturnePatternState.sidebarPattern);
  const [noBackground, setNoBackground] = React.useState(window.nocturnePatternState.noBackground);
  const [inverted, setInverted] = React.useState(document.documentElement.classList.contains('pattern-inverted'));
  const [brightness, setBrightness] = React.useState(window.nocturneDisplayMode());
  const [sharedThemes, setSharedThemes] = React.useState([]);
  const [sharedError, setSharedError] = React.useState('');
  const [colorMode, setColorMode] = React.useState('hsl');  // 'rgb' | 'hsl'
  const [colorTarget, setColorTarget] = React.useState('');  // varName or ''
  const [sidebarMatchMain, setSidebarMatchMain] = React.useState(window.nocturnePatternState.sidebarMatchMain);
  const [sidebarColorTarget, setSidebarColorTarget] = React.useState('');
  const [animateMotif, setAnimateMotif] = React.useState(window.nocturnePatternState.animateMotif);
  // Dual background editor: which layer's tab is open, and per-layer local
  // copies (synced from window.nocturnePatternState[layer]) for the inputs.
  const [bgTab, setBgTab] = React.useState('main');
  const [layerCfg, setLayerCfg] = React.useState(() => ({
    sidebar: { ...(window.nocturnePatternState.sidebar || {}) },
    main: { ...(window.nocturnePatternState.main || {}) }
  }));
  // Draft text values so users can type exact numbers; committed on blur/Enter.
  const [layerDrafts, setLayerDrafts] = React.useState(() => ({
    sidebar: { gridCols: '2', gridRows: '2', opacity: '35', size: '85', tilt: '0' },
    main: { gridCols: '2', gridRows: '2', opacity: '35', size: '85', tilt: '0' }
  }));

  React.useEffect(() => {
    const sync = () => {
      setFlames(window.nocturnePatternState.flames);
      setSidebarPattern(!!window.nocturnePatternState.sidebarPattern);
      setNoBackground(!!window.nocturnePatternState.noBackground);
      setInverted(document.documentElement.classList.contains('pattern-inverted'));
      setBrightness(window.nocturneDisplayMode());
      setSidebarMatchMain(!!window.nocturnePatternState.sidebarMatchMain);
      setAnimateMotif(window.nocturnePatternState.animateMotif);
      const nextLayerCfg = {
        sidebar: { ...(window.nocturnePatternState.sidebar || {}) },
        main: { ...(window.nocturnePatternState.main || {}) }
      };
      setLayerCfg(nextLayerCfg);
      setLayerDrafts(Object.fromEntries(['sidebar', 'main'].map(layer => [layer, {
        gridCols: String(nextLayerCfg[layer].gridCols || 1),
        gridRows: String(nextLayerCfg[layer].gridRows || 1),
        opacity: String(nextLayerCfg[layer].opacity || 35),
        size: String(nextLayerCfg[layer].size || 85),
        tilt: String(nextLayerCfg[layer].tilt || 0)
      }])));
    };
    window.addEventListener('nocturne-pattern-updated', sync);
    return () => window.removeEventListener('nocturne-pattern-updated', sync);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const load = () => window.listNocturneSharedThemes().then(list => { if (!cancelled) setSharedThemes(list); });
    load();
    window.addEventListener('nocturne-shared-themes-changed', load);
    return () => { cancelled = true; window.removeEventListener('nocturne-shared-themes-changed', load); };
  }, []);

  async function refreshShared() {
    const list = await window.listNocturneSharedThemes();
    setSharedThemes(list);
  }

  async function applyShared(id) {
    const theme = sharedThemes.find(t => String(t.id) === String(id));
    if (theme && theme.approved === false && !theme.isDM) {
      setSharedError('That theme is still awaiting DM approval.');
      return;
    }
    const result = await window.applyNocturneSharedTheme(id);
    if (!result.ok) setSharedError(result.error);
  }

  async function review(id, approve) {
    const result = await window.reviewNocturneSharedTheme(id, approve);
    if (!result.ok) setSharedError(result.error);
    else refreshShared();
  }

  function renderSharedThemeRows(themes) {
    if (themes.length === 0) return null;
    return h('ul', { className: 'shared-theme-list' },
      themes.map(theme => h(SharedThemeRow, {
        key: theme.id,
        theme,
        onReview: review,
        onApply: applyShared
      }))
    );
  }

  function resetAppearance() {
    window.resetNocturneAppearance();
    // Reset also restores the current premade theme's stock colors — drop any
    // local color/CSS overrides left over in storage.
    try { window.localStorage.removeItem('nocturne-color-overrides'); } catch (_) {}
  }

  return h('div', { className: 'theme-studio-panel' },
    h('button', {
      type: 'button',
      className: 'btn btn-sm color-studio-open',
      onClick: () => window.dispatchEvent(new CustomEvent('nocturne-open-color-studio'))
    }, 'Open CSS color studio'),
    h('button', {
      type: 'button',
      className: 'btn btn-secondary btn-sm',
      style: { marginBottom: 4, justifySelf: 'start' },
      onClick: resetAppearance
    }, '↺ Reset appearance to theme defaults'),
    h('h3', null, 'Backgrounds'),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Motif animation'),
      h('div', { className: 'theme-studio-toggle-row' },
        h('button', {
          type: 'button',
          'aria-pressed': String(animateMotif),
          className: 'btn btn-sm ' + (animateMotif ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneAnimateMotif(!window.nocturnePatternState.animateMotif)
        }, animateMotif ? 'Animated' : 'Static'),
        h('span', { className: 'theme-studio-hint' }, 'Dragon fire flickers; fireflies pulse; fish sway.')
      )
    ),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Flame glow'),
      h('button', {
        type: 'button',
        className: 'btn btn-sm ' + (flames ? 'btn-flame-on' : 'btn-secondary'),
        'aria-pressed': String(flames),
        onClick: () => window.setNocturnePatternFlames(!window.nocturnePatternState.flames)
      }, flames ? 'Fire glow on' : 'Fire glow off')
    ),

    h('h3', null, 'Colors'),
    h('p', { className: 'theme-studio-hint' }, 'Pick which color to change, then dial it in with the sliders.'),
    h('div', { className: 'theme-studio-color-targets' },
      window.nocturneSwatches.map(item => h('button', {
        key: item.varName,
        type: 'button',
        className: 'color-target-btn' + (colorTarget === item.varName ? ' selected' : ''),
        onClick: () => setColorTarget(item.varName)
      },
        h('span', { className: 'color-slot-swatch', style: { background: window.nocturneColorOverrides[item.varName] || `var(${item.varName})` } }),
        item.label
      ))
    ),
    colorTarget
      ? h(ColorSliders, {
          varName: colorTarget,
          mode: colorMode,
          onModeChange: setColorMode
        })
      : h('p', { className: 'theme-studio-hint' }, 'Select a color above to edit it.'),

    h('h3', null, 'Layout'),
    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Background'),
      h('div', { className: 'theme-studio-toggle-row' },
        h('button', {
          type: 'button',
          'aria-pressed': String(!noBackground),
          className: 'btn btn-sm ' + (!noBackground ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneNoBackground(false)
        }, 'On'),
        h('button', {
          type: 'button',
          'aria-pressed': String(noBackground),
          className: 'btn btn-sm ' + (noBackground ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneNoBackground(true)
        }, 'Off'),
        h('span', { className: 'theme-studio-hint' }, noBackground ? 'Background motifs are hidden.' : 'Background motif visible across the page.')
      )
    ),
    !noBackground ? h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Sidebar'),
      h('div', { className: 'theme-studio-toggle-row' },
        h('button', {
          type: 'button',
          'aria-pressed': String(sidebarPattern),
          className: 'btn btn-sm ' + (sidebarPattern ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneSidebarPattern(!window.nocturnePatternState.sidebarPattern)
        }, sidebarPattern ? 'Pattern on' : 'Pattern off'),
        h('span', { className: 'theme-studio-hint' }, sidebarPattern ? 'Background shows behind the navbar.' : 'Navbar has a plain background.')
      )
    ) : null,

    /* ===== Dual background editor: independent Sidebar / Main tabs ===== */
    !noBackground ? h(BackgroundEditor, {
      bgTab, setBgTab, layerCfg, layerDrafts, setLayerDrafts
    }) : null,

    h('h3', null, 'Sidebar theme'),
    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Sidebar colors'),
      h('div', { className: 'theme-studio-toggle-row' },
        h('button', {
          type: 'button',
          'aria-pressed': String(sidebarMatchMain),
          className: 'btn btn-sm ' + (sidebarMatchMain ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneSidebarMatchMain(true)
        }, 'Match main page'),
        h('button', {
          type: 'button',
          'aria-pressed': String(!sidebarMatchMain),
          className: 'btn btn-sm ' + (!sidebarMatchMain ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneSidebarMatchMain(false)
        }, 'Custom')
      )
    ),
    !sidebarMatchMain ? h('p', { className: 'theme-studio-hint' }, 'Pick a color target, then dial it in below (same RGB/HSL sliders as the main colors).') : null,
    !sidebarMatchMain ? h('div', { className: 'theme-studio-color-targets' },
      SIDEBAR_EDIT_TARGETS.map(item => h('button', {
        key: item.varName,
        type: 'button',
        className: 'color-target-btn' + (sidebarColorTarget === item.varName ? ' selected' : ''),
        onClick: () => setSidebarColorTarget(item.varName)
      },
        h('span', { className: 'color-slot-swatch', style: { background: window.nocturneSidebarColorOverrides[item.varName] || `var(${SIDEBAR_VAR_MAP[item.varName] || item.varName})` } }),
        item.label
      ))
    ) : null,
    !sidebarMatchMain && sidebarColorTarget
      ? h(SidebarColorSliders, { varName: sidebarColorTarget, mode: colorMode, onModeChange: setColorMode })
      : null,

    h('h3', null, 'Display'),
    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Site brightness'),
      h('div', { className: 'theme-studio-toggle-row' },
        h('button', {
          type: 'button',
          'aria-pressed': String(brightness === 'dark'),
          className: 'btn btn-sm ' + (brightness === 'dark' ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneDisplayMode('dark')
        }, 'Dark'),
        h('button', {
          type: 'button',
          'aria-pressed': String(brightness === 'light'),
          className: 'btn btn-sm ' + (brightness === 'light' ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneDisplayMode('light')
        }, 'Light')
      )
    ),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Background contrast'),
      h('div', { className: 'theme-studio-toggle-row' },
        h('button', {
          type: 'button',
          'aria-pressed': String(inverted),
          className: 'btn btn-sm ' + (inverted ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.togglePatternInverted()
        }, inverted ? 'Inverted' : 'Regular'),
        h('span', { className: 'theme-studio-hint' }, inverted
          ? 'Background pattern colors are flipped for extra contrast.'
          : 'Background pattern uses the theme colors as-is.')
      )
    ),

    h('h3', null, window.currentUserIsDM ? 'Theme review' : 'Community themes'),
    h('p', { className: 'theme-studio-hint' }, window.currentUserIsDM
      ? 'Preview player submissions before approving them.'
      : 'Published themes appear here once the DM approves them.'),
    sharedThemes.length === 0
      ? h('p', { className: 'theme-studio-hint' }, window.currentUserIsDM ? 'No themes have been submitted yet.' : 'No shared themes yet — publish the first one!')
      : window.currentUserIsDM
        ? h(React.Fragment, null,
          h('h4', { className: 'shared-theme-group-title' }, `Awaiting review · ${sharedThemes.filter(theme => !theme.approved).length}`),
          sharedThemes.filter(theme => !theme.approved).length
            ? renderSharedThemeRows(sharedThemes.filter(theme => !theme.approved))
            : h('p', { className: 'theme-studio-hint' }, 'The review queue is clear.'),
          h('h4', { className: 'shared-theme-group-title' }, 'Approved themes'),
          renderSharedThemeRows(sharedThemes.filter(theme => theme.approved)) || h('p', { className: 'theme-studio-hint' }, 'No themes approved yet.')
        )
        : renderSharedThemeRows(sharedThemes),

  );
}

function SharedThemeRow({ theme, onReview, onApply }) {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  return h('li', { className: 'shared-theme-row' + (theme.approved ? '' : ' pending-approval') },
    h('div', { className: 'shared-theme-info' },
      h('strong', null, theme.name),
      h('span', { className: 'shared-theme-creator' }, 'by ' + theme.creator,
        theme.approved ? null : h('span', { className: 'approval-badge' }, ' · awaiting DM approval')
      )
    ),
    h('div', { className: 'shared-theme-actions' },
      h('button', {
        type: 'button', className: 'btn btn-sm btn-secondary',
        'aria-expanded': String(previewOpen),
        onClick: () => setPreviewOpen(open => !open)
      }, previewOpen ? 'Hide preview' : 'Preview'),
      theme.isDM && !theme.approved ? h('button', {
        type: 'button', className: 'btn btn-sm',
        onClick: () => onReview(theme.id, true), title: 'Approve this theme'
      }, 'Approve') : null,
      theme.isDM && !theme.approved ? h('button', {
        type: 'button', className: 'btn btn-sm btn-spoiler',
        onClick: () => onReview(theme.id, false), title: 'Reject and remove this theme'
      }, 'Reject') : null,
      (theme.approved || theme.isDM) ? h('button', {
        type: 'button', className: 'btn btn-sm btn-secondary',
        onClick: () => onApply(theme.id)
      }, 'Use') : null
    ),
    previewOpen ? h(SharedThemePreview, { theme }) : null
  );
}

function SharedThemePreview({ theme }) {
  const snapshot = theme.snapshot && typeof theme.snapshot === 'object' ? theme.snapshot : {};
  const colors = snapshot.colors && typeof snapshot.colors === 'object' ? snapshot.colors : {};
  const sidebarColors = snapshot.sidebarColors && typeof snapshot.sidebarColors === 'object' ? snapshot.sidebarColors : {};
  const mainColors = snapshot.mainColors && typeof snapshot.mainColors === 'object' ? snapshot.mainColors : {};
  const rootStyle = window.getComputedStyle(document.documentElement);
  const color = (name, scoped) => {
    const candidates = [scoped && scoped[name], colors[name], rootStyle.getPropertyValue(name).trim()];
    return candidates.find(value => typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value)) || '#302a3b';
  };
  const pattern = snapshot.pattern && typeof snapshot.pattern === 'object' ? snapshot.pattern : {};
  const mainPattern = pattern.main && typeof pattern.main === 'object' ? pattern.main : {};
  const motif = ['candelabra', 'fleur', 'fish', 'fireflies', 'dragon'].includes(mainPattern.motif) ? mainPattern.motif : 'candelabra';
  const palette = {
    background: color('--bg'),
    alternate: color('--bg-alt'),
    surface: color('--surface'),
    raised: color('--surface-2'),
    border: color('--line'),
    text: color('--text'),
    muted: color('--text-dim'),
    accent: color('--gold'),
    secondary: color('--purple'),
    sidebar: color('--bg-alt', sidebarColors),
    main: color('--surface', mainColors)
  };
  const swatchStyle = value => ({ background: value, border: `1px solid ${palette.border}` });

  return h('div', { className: 'shared-theme-preview', 'aria-label': `Preview of ${theme.name}` },
    h('div', {
      className: 'shared-theme-preview-frame',
      style: { background: palette.background, borderColor: palette.border, color: palette.text }
    },
      h('aside', { className: 'shared-theme-preview-sidebar', style: { background: palette.sidebar, borderColor: palette.border } },
        h('strong', { style: { color: palette.accent } }, 'Nocturne'),
        h('span', null, 'Campaign Hub'),
        h('span', { className: 'shared-theme-preview-nav-active', style: { background: palette.surface, color: palette.text } }, '◈  Session Chats'),
        h('span', null, 'Characters')
      ),
      h('div', { className: 'shared-theme-preview-main', style: { background: palette.main } },
        h('span', { className: 'shared-theme-preview-eyebrow', style: { color: palette.accent } }, 'THEME PREVIEW'),
        h('strong', null, theme.name),
        h('p', { style: { color: palette.muted } }, 'A glimpse of the campaign hub in this theme.'),
        h('div', { className: 'shared-theme-preview-card', style: { background: palette.surface, borderColor: palette.border } },
          h('span', null, 'Next session'),
          h('span', { style: { color: palette.muted } }, 'The story continues…'),
          h('button', { type: 'button', style: { background: palette.secondary, color: color('--button-text') } }, 'View details')
        )
      )
    ),
    h('div', { className: 'shared-theme-preview-details' },
      h('span', null, `Main motif: ${motif}`),
      h('span', null, `Display: ${snapshot.brightness === 'light' ? 'Light' : 'Dark'}`),
      h('div', { className: 'shared-theme-preview-swatches', 'aria-label': 'Theme color palette' },
        [palette.background, palette.surface, palette.accent, palette.secondary].map((value, index) =>
          h('span', { key: index, style: swatchStyle(value), title: value })
        )
      )
    ),
    typeof snapshot.css === 'string' && snapshot.css.trim()
      ? h('p', { className: 'theme-studio-hint' }, 'This submission includes custom CSS, which is not executed in the preview.')
      : null
  );
}

/* ======== Sidebar color editor (independent from main) ======== */

// Sidebar targets are expressed via the MAIN variables they shadow; the
// sidebar-scoped variables (--sidebar-stroke etc.) are set from these.
const SIDEBAR_EDIT_TARGETS = [
  { varName: '--gold', label: 'Stroke' },
  { varName: '--surface-2', label: 'Fill' },
  { varName: '--rose', label: 'Flame' },
  { varName: '--gold-dim', label: 'Flame glow' }
];
const SIDEBAR_VAR_MAP = {
  '--gold': '--sidebar-stroke',
  '--surface-2': '--sidebar-fill',
  '--rose': '--sidebar-flame',
  '--gold-dim': '--sidebar-flame-glow'
};

function SidebarColorSliders({ varName, mode, onModeChange }) {
  // Current effective sidebar color: override, else the sidebar variable's
  // computed value, else falls back to the main variable's color.
  const currentOverride = window.nocturneSidebarColorOverrides[varName] || '';
  const sidebarVar = SIDEBAR_VAR_MAP[varName] || varName;
  const [draft, setDraft] = React.useState(() => {
    if (currentOverride && hexToRgb(currentOverride)) return currentOverride.toLowerCase();
    return resolveVarHex(sidebarVar);
  });
  React.useEffect(() => {
    const ov = window.nocturneSidebarColorOverrides[varName] || '';
    setDraft(ov && hexToRgb(ov) ? ov.toLowerCase() : resolveVarHex(sidebarVar));
  }, [varName]);

  const rgb = hexToRgb(draft) || { r: 136, g: 136, b: 136 };
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const item = SIDEBAR_EDIT_TARGETS.find(t => t.varName === varName);

  function commit(nextRgb) {
    const hex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    setDraft(hex);
    window.setNocturneSidebarColorOverride(varName, hex);
  }

  const sliderRow = (label, value, min, max, onInput) =>
    h(NumericRangeControl, { label, value, min, max, onChange: onInput });

  return h('div', { className: 'color-slider-editor' },
    h('div', { className: 'theme-studio-toggle-row', style: { marginBottom: 8 } },
      h('button', {
        type: 'button', 'aria-pressed': String(mode === 'hsl'),
        className: 'btn btn-sm ' + (mode === 'hsl' ? 'btn-active-choice' : 'btn-secondary'),
        onClick: () => onModeChange('hsl')
      }, 'HSL'),
      h('button', {
        type: 'button', 'aria-pressed': String(mode === 'rgb'),
        className: 'btn btn-sm ' + (mode === 'rgb' ? 'btn-active-choice' : 'btn-secondary'),
        onClick: () => onModeChange('rgb')
      }, 'RGB'),
      h('span', { className: 'color-slider-preview', style: { background: draft }, title: draft }),
      h('button', {
        type: 'button', className: 'btn btn-sm btn-secondary',
        onClick: () => { window.setNocturneSidebarColorOverride(varName, ''); setDraft(resolveVarHex(sidebarVar)); }
      }, 'Reset')
    ),
    mode === 'rgb'
      ? h(React.Fragment, null,
          sliderRow('Red', rgb.r, 0, 255, v => commit({ ...rgb, r: v })),
          sliderRow('Green', rgb.g, 0, 255, v => commit({ ...rgb, g: v })),
          sliderRow('Blue', rgb.b, 0, 255, v => commit({ ...rgb, b: v }))
        )
      : h(React.Fragment, null,
          sliderRow('Hue', hsl.h, 0, 360, v => commit(hslToRgb(v, hsl.s, hsl.l))),
          sliderRow('Saturation', hsl.s, 0, 100, v => commit(hslToRgb(hsl.h, v, hsl.l))),
          sliderRow('Lightness', hsl.l, 0, 100, v => commit(hslToRgb(hsl.h, hsl.s, v)))
        ),
    h('p', { className: 'theme-studio-hint' }, `Editing sidebar ${item ? item.label : varName}.`)
  );
}

/* ============ Target-first color editor with RGB/HSL sliders ============ */

function hexToRgb(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

// Resolves the current effective color of a theme variable (override or the
// computed built-in value) as hex, so the sliders always start in sync.
function resolveVarHex(varName) {
  const override = window.nocturneColorOverrides[varName];
  if (override && hexToRgb(override)) return override.toLowerCase();
  const probe = document.createElement('div');
  probe.style.color = `var(${varName})`;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(computed);
  return m ? rgbToHex(+m[1], +m[2], +m[3]) : '#888888';
}

function ColorSliders({ varName, mode, onModeChange }) {
  const initialHex = resolveVarHex(varName);
  const [draft, setDraft] = React.useState(initialHex);
  // Re-sync the sliders when a different target is picked.
  React.useEffect(() => { setDraft(resolveVarHex(varName)); }, [varName]);

  const rgb = hexToRgb(draft) || { r: 136, g: 136, b: 136 };
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const item = window.nocturneSwatches.find(s => s.varName === varName);
  const overridden = !!window.nocturneColorOverrides[varName];

  function commit(nextRgb) {
    const hex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    setDraft(hex);
    window.setNocturneColorOverride(varName, hex);
  }

  const sliderRow = (label, value, min, max, onInput) =>
    h(NumericRangeControl, { label, value, min, max, onChange: onInput });

  return h('div', { className: 'color-slider-editor' },
    h('div', { className: 'theme-studio-toggle-row', style: { marginBottom: 8 } },
      h('button', {
        type: 'button',
        'aria-pressed': String(mode === 'hsl'),
        className: 'btn btn-sm ' + (mode === 'hsl' ? 'btn-active-choice' : 'btn-secondary'),
        onClick: () => onModeChange('hsl')
      }, 'HSL'),
      h('button', {
        type: 'button',
        'aria-pressed': String(mode === 'rgb'),
        className: 'btn btn-sm ' + (mode === 'rgb' ? 'btn-active-choice' : 'btn-secondary'),
        onClick: () => onModeChange('rgb')
      }, 'RGB'),
      h('span', { className: 'color-slider-preview', style: { background: draft }, title: draft }),
      overridden ? h('button', {
        type: 'button', className: 'btn btn-sm btn-secondary',
        onClick: () => { window.setNocturneColorOverride(varName, ''); setDraft(resolveVarHex(varName)); }
      }, 'Reset') : null
    ),
    mode === 'rgb'
      ? h(React.Fragment, null,
          sliderRow('Red', rgb.r, 0, 255, v => commit({ ...rgb, r: v })),
          sliderRow('Green', rgb.g, 0, 255, v => commit({ ...rgb, g: v })),
          sliderRow('Blue', rgb.b, 0, 255, v => commit({ ...rgb, b: v }))
        )
      : h(React.Fragment, null,
          sliderRow('Hue', hsl.h, 0, 360, v => commit(hslToRgb(v, hsl.s, hsl.l))),
          sliderRow('Saturation', hsl.s, 0, 100, v => commit(hslToRgb(hsl.h, v, hsl.l))),
          sliderRow('Lightness', hsl.l, 0, 100, v => commit(hslToRgb(hsl.h, hsl.s, v)))
        ),
    h('p', { className: 'theme-studio-hint' }, `Editing ${item ? item.label : varName} (${varName}).`)
  );
}

const COLOR_STUDIO_GROUPS = [
  { title: 'Surfaces & borders', variables: ['--bg', '--bg-alt', '--surface', '--surface-2', '--line'] },
  { title: 'Text & symbols', variables: ['--text', '--text-dim', '--text-faint', '--text-main', '--symbol', '--button-text', '--session-note'] },
  { title: 'Accents', variables: ['--gold', '--gold-dim', '--purple', '--purple-dim', '--rose', '--rose-dim'] },
  { title: 'Atmosphere', variables: ['--glow-primary', '--glow-secondary'] }
];

function colorToHex(value) {
  const short = /^#([0-9a-f]{3,4})$/i.exec(value);
  if (short) {
    const expanded = short[1].split('').map(char => char + char).join('');
    return `#${expanded.slice(0, 6)}${expanded.length === 8 ? expanded.slice(6) : ''}`;
  }
  const full = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(value);
  if (full) return `#${full[1].toLowerCase()}${full[2] ? full[2].toLowerCase() : ''}`;
  const rgb = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i.exec(value);
  if (!rgb) return '';
  const channels = rgb.slice(1, 4).map(channel => clamp(Math.round(Number(channel)), 0, 255));
  const hex = rgbToHex(...channels);
  const alpha = rgb[4] === undefined ? 1 : Math.min(1, Math.max(0, Number(rgb[4])));
  return alpha < 1 ? `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}` : hex;
}

function colorHexToRgba(value) {
  const parsed = hexToRgb(value.slice(0, 7));
  if (!parsed) return { r: 136, g: 136, b: 136, a: 1 };
  const alphaHex = /^#[0-9a-f]{8}$/i.test(value) ? parseInt(value.slice(7, 9), 16) / 255 : 1;
  return { ...parsed, a: alphaHex };
}

function colorRgbaToHex(color, withAlpha) {
  const hex = rgbToHex(color.r, color.g, color.b);
  return withAlpha ? `${hex}${Math.round(color.a * 255).toString(16).padStart(2, '0')}` : hex;
}

function readScopedColor(varName, scope) {
  const overrides = scope === 'sidebar'
    ? window.nocturneSidebarColorOverrides
    : scope === 'main'
      ? window.nocturneMainColorOverrides
      : window.nocturneColorOverrides;
  const stored = overrides[varName];
  if (stored && colorHexToRgba(stored)) return stored.toLowerCase();
  const target = scope === 'sidebar'
    ? document.getElementById('appSidebar')
    : scope === 'main'
      ? document.getElementById('appMain')
      : document.documentElement;
  const computed = target ? getComputedStyle(target).getPropertyValue(varName).trim() : '';
  return colorToHex(computed) || resolveVarHex(varName);
}

function ColorVariableEditor({ item, scope, mode, revision }) {
  const includeAlpha = item.varName.startsWith('--glow-');
  const [hex, setHex] = React.useState(() => readScopedColor(item.varName, scope));
  React.useEffect(() => setHex(readScopedColor(item.varName, scope)), [item.varName, scope, revision]);

  const color = colorHexToRgba(hex);
  const hsl = rgbToHsl(color.r, color.g, color.b);
  const currentOverrides = scope === 'sidebar'
    ? window.nocturneSidebarColorOverrides
    : scope === 'main'
      ? window.nocturneMainColorOverrides
      : window.nocturneColorOverrides;

  function commit(next) {
    const nextHex = colorRgbaToHex(next, includeAlpha);
    setHex(nextHex);
    if (scope === 'sidebar') window.setNocturneSidebarColorOverride(item.varName, nextHex);
    else if (scope === 'main') window.setNocturneMainColorOverride(item.varName, nextHex);
    else window.setNocturneColorOverride(item.varName, nextHex);
  }

  const slider = (label, value, min, max, onChange) => h(NumericRangeControl, {
    label, value, min, max, onChange
  });

  return h('article', { className: 'css-color-variable' },
    h('header', { className: 'css-color-variable-heading' },
      h('div', null,
        h('div', { className: 'css-color-variable-name' },
          h('strong', null, item.label),
          h('button', {
            type: 'button',
            className: 'css-color-help',
            title: item.description,
            'aria-label': `What does ${item.varName} change?`,
            'aria-describedby': `color-help-${scope}-${item.varName.slice(2)}`
          }, '?')
        ),
        h('code', null, item.varName),
        h('span', { id: `color-help-${scope}-${item.varName.slice(2)}`, className: 'css-color-variable-help' }, item.description)
      ),
      h('div', { className: 'css-color-variable-actions' },
        h('span', {
          className: 'color-slider-preview',
          style: { backgroundColor: hex },
          role: 'img',
          'aria-label': `${item.label} color ${hex}`
        }),
        h('code', null, hex),
        currentOverrides[item.varName] ? h('button', {
          type: 'button',
          className: 'btn btn-sm btn-secondary',
          onClick: () => {
            if (scope === 'sidebar') window.setNocturneSidebarColorOverride(item.varName, '');
            else if (scope === 'main') window.setNocturneMainColorOverride(item.varName, '');
            else window.setNocturneColorOverride(item.varName, '');
          }
        }, 'Reset') : null
      )
    ),
    mode === 'rgb'
      ? h(React.Fragment, null,
          slider('Red', color.r, 0, 255, value => commit({ ...color, r: value })),
          slider('Green', color.g, 0, 255, value => commit({ ...color, g: value })),
          slider('Blue', color.b, 0, 255, value => commit({ ...color, b: value }))
        )
      : h(React.Fragment, null,
          slider('Hue', hsl.h, 0, 360, value => commit({ ...color, ...hslToRgb(value, hsl.s, hsl.l) })),
          slider('Saturation', hsl.s, 0, 100, value => commit({ ...color, ...hslToRgb(hsl.h, value, hsl.l) })),
          slider('Lightness', hsl.l, 0, 100, value => commit({ ...color, ...hslToRgb(hsl.h, hsl.s, value) }))
        ),
    includeAlpha ? slider('Opacity', Math.round(color.a * 100), 0, 100, value => commit({ ...color, a: value / 100 })) : null
  );
}

function LayerAlignmentEditor({ scope }) {
  const [alignment, setAlignment] = React.useState(() => {
    const config = window.nocturnePatternState[scope] || {};
    return { x: config.alignX || 0, y: config.alignY || 0 };
  });
  React.useEffect(() => {
    const sync = () => {
      const config = window.nocturnePatternState[scope] || {};
      setAlignment({ x: config.alignX || 0, y: config.alignY || 0 });
    };
    window.addEventListener('nocturne-pattern-updated', sync);
    return () => window.removeEventListener('nocturne-pattern-updated', sync);
  }, [scope]);

  function setAxis(axis, value) {
    const key = axis === 'x' ? 'alignX' : 'alignY';
    window.setNocturneLayerAlignment(scope, key, value);
  }

  const positions = [
    [-50, -50, '↖', 'top left'], [0, -50, '↑', 'top center'], [50, -50, '↗', 'top right'],
    [-50, 0, '←', 'center left'], [0, 0, '•', 'center'], [50, 0, '→', 'center right'],
    [-50, 50, '↙', 'bottom left'], [0, 50, '↓', 'bottom center'], [50, 50, '↘', 'bottom right']
  ];

  return h('div', { className: 'css-color-alignment' },
    h('div', { className: 'css-color-section-heading' },
      h('div', null,
        h('h3', null, `${scope === 'sidebar' ? 'Sidebar' : 'Main content'} motif offset`),
        h('p', null, 'Position each background motif within its section.')
      ),
      h('button', {
        type: 'button',
        className: 'css-color-help',
        title: 'Alignment moves the motif inside each tile or single hero. It does not stretch or change the SVG aspect ratio.',
        'aria-label': 'What does motif alignment change?'
      }, '?')
    ),
    h('div', { className: 'css-color-alignment-grid', role: 'group', 'aria-label': `${scope} motif alignment` },
      positions.map(([x, y, glyph, label]) => h('button', {
        key: `${x}:${y}`,
        type: 'button',
        className: 'btn btn-sm btn-secondary',
        'aria-pressed': String(alignment.x === x && alignment.y === y),
        'aria-label': `Align motif ${label}`,
        title: `Align motif ${label}`,
        onClick: () => { setAxis('x', x); setAxis('y', y); }
      }, glyph))
    ),
    h('div', { className: 'css-color-alignment-offsets' },
      h(NumericRangeControl, {
        label: 'Horizontal offset', min: -50, max: 50, value: alignment.x,
        onChange: value => setAxis('x', value)
      }),
      h(NumericRangeControl, {
        label: 'Vertical offset', min: -50, max: 50, value: alignment.y,
        onChange: value => setAxis('y', value)
      })
    )
  );
}

function CssColorStudio({ onExit }) {
  const [scope, setScope] = React.useState('global');
  const [mode, setMode] = React.useState('hsl');
  const [previewDevice, setPreviewDevice] = React.useState('desktop');
  const [revision, setRevision] = React.useState(0);

  React.useEffect(() => {
    const sync = () => setRevision(value => value + 1);
    window.addEventListener('nocturne-theme-updated', sync);
    window.addEventListener('nocturne-pattern-updated', sync);
    return () => {
      window.removeEventListener('nocturne-theme-updated', sync);
      window.removeEventListener('nocturne-pattern-updated', sync);
    };
  }, []);

  const scopes = [
    ['sidebar', 'Sidebar'],
    ['main', 'Main content'],
    ['global', 'Global']
  ];
  const scopeDescription = scope === 'sidebar'
    ? 'Editing only the navigation sidebar. These values override global colors inside the sidebar.'
    : scope === 'main'
      ? 'Editing only the main content area. These values override global colors inside the page content.'
      : 'Editing global theme variables. Changes apply across the site unless overridden by a sidebar or main-content color.';

  return h('div', { id: 'css-color-studio', className: 'css-color-studio', 'aria-label': 'Theme color and background editor' },
    h('header', { className: 'css-color-studio-header' },
      h('div', null,
        h('p', { className: 'eyebrow' }, 'Appearance tools'),
        h('h2', null, 'CSS Color Studio'),
        h('p', { className: 'theme-studio-hint' }, 'Edit the existing theme CSS variables with precise RGB or HSL controls.')
      ),
      h('button', {
        type: 'button',
        className: 'btn btn-secondary',
        onClick: onExit
      }, 'Exit color editor')
    ),
    h('div', { className: 'css-color-studio-layout' },
      h('div', { className: 'css-color-controls' },
        h('div', { className: 'css-color-scope-bar' },
          h('div', { className: 'css-color-scope-tabs', role: 'tablist', 'aria-label': 'Color edit scope' },
            scopes.map(([key, label]) => h('button', {
              key, type: 'button', role: 'tab', 'aria-selected': String(scope === key),
              onClick: () => setScope(key)
            }, label))
          ),
          h('div', { className: 'css-color-mode-tabs', role: 'group', 'aria-label': 'Color channel model' },
            h('button', {
              type: 'button', className: 'btn btn-sm',
              'aria-pressed': String(mode === 'rgb'),
              onClick: () => setMode('rgb')
            }, 'RGB'),
            h('button', {
              type: 'button', className: 'btn btn-sm',
              'aria-pressed': String(mode === 'hsl'),
              onClick: () => setMode('hsl')
            }, 'HSL')
          )
        ),
        h('div', { className: 'css-color-scope-description', 'aria-live': 'polite' },
          h('strong', null, `Editing: ${scope === 'sidebar' ? 'Sidebar' : scope === 'main' ? 'Main content' : 'Global'}`),
          h('span', null, scopeDescription)
        ),
        h(BackgroundStudioControls),
        COLOR_STUDIO_GROUPS.map(group => h('details', {
          key: `${scope}-${group.title}`,
          className: 'css-color-group'
        },
          h('summary', null, group.title),
          h('div', { className: 'css-color-variable-grid' },
            group.variables.map(varName => {
              const item = window.nocturneSwatches.find(swatch => swatch.varName === varName);
              return item ? h(ColorVariableEditor, { key: `${scope}-${varName}`, item, scope, mode, revision }) : null;
            })
          )
        ))
      ),
      h('aside', { className: 'css-color-preview' },
        h('div', { className: 'css-color-preview-toolbar' },
          h('div', { className: 'css-color-preview-heading' },
            h('h3', null, 'Live site preview'),
            h('p', null, 'Changes appear here immediately.')
          ),
          h('div', { className: 'css-color-device-tabs', role: 'group', 'aria-label': 'Preview device size' },
            h('button', {
              type: 'button', className: 'btn btn-sm',
              'aria-pressed': String(previewDevice === 'desktop'),
              onClick: () => setPreviewDevice('desktop')
            }, 'Desktop'),
            h('button', {
              type: 'button', className: 'btn btn-sm',
              'aria-pressed': String(previewDevice === 'mobile'),
              onClick: () => setPreviewDevice('mobile')
            }, 'Mobile')
          )
        ),
        h('div', { className: `css-color-preview-canvas ${previewDevice === 'mobile' ? 'is-mobile' : 'is-desktop'}` },
          h(ThemePreviewSite, { device: previewDevice })
        )
      )
    )
  );
}

/* ==================== Editable / saveable CSS variables ==================== */

function CssVariableEditor() {
  const [text, setText] = React.useState(window.nocturneCustomCss);
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const sync = () => setText(window.nocturneCustomCss);
    window.addEventListener('nocturne-custom-css-updated', sync);
    return () => window.removeEventListener('nocturne-custom-css-updated', sync);
  }, []);

  function apply() {
    const result = window.applyNocturneCustomCss(text);
    if (result.ok) {
      setStatus('Saved. Applies on every sign-in.');
      setError('');
    } else {
      setError(result.error);
      setStatus('');
    }
  }

  return h('div', { id: 'custom-css-editor', className: 'css-variable-editor theme-studio-css-row' },
    h('h3', null, 'Custom CSS editor'),
    h('p', { className: 'theme-studio-hint' }, 'Advanced theme overrides — scroll to the bottom of the studio to edit custom CSS.'),
    h('p', { className: 'theme-studio-hint' },
      'Know CSS? Override any theme variable here, e.g. ', h('code', null, ':root { --gold: #d4af37; }'),
      ' Changes are saved to your account and re-applied on sign-in.'),
    h('textarea', {
      className: 'css-editor-textarea input-control',
      spellCheck: false,
      value: text,
      placeholder: ':root {\n  --gold: #d4af37;\n  --purple: #8a68d6;\n}',
      onInput: e => setText(e.target.value)
    }),
    h('div', { className: 'theme-studio-toggle-row', style: { marginTop: 8 } },
      h('button', { type: 'button', className: 'btn btn-sm', onClick: apply }, 'Save & apply'),
      h('button', {
        type: 'button', className: 'btn btn-sm btn-secondary',
        onClick: () => { window.setNocturneCustomCss(''); setStatus('Cleared.'); setError(''); }
      }, 'Clear')
    ),
    status ? h('p', { className: 'css-editor-status' }, status) : null,
    error ? h('p', { className: 'error-msg' }, error) : null
  );
}

/* ============================ Page body ============================ */

function ThemeStudioBody() {
  React.useEffect(() => {
    const open = () => document.getElementById('css-color-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.addEventListener('nocturne-open-color-studio', open);
    return () => window.removeEventListener('nocturne-open-color-studio', open);
  }, []);

  return h(React.Fragment, null,
    h(CssColorStudio, { onExit: () => {} }),
    h(CssVariableEditor)
  );
}
