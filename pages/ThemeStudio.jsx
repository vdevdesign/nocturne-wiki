window.ThemeStudio = function ThemeStudio() {
  // PageSection already provides the back button; navigateTo('theme-studio',
  // true) makes it visible.
  return h(PageSection, { id: 'theme-studio', eyebrow: 'Appearance', title: 'Theme Studio', subtitle: 'Preview the home page while you tune colors, pattern geometry, and glow.' },
    h(ThemeStudioHeaderBar),
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
/* A live, self-contained miniature of the Home page: dashboard grid with
   next-session card, party leads, house points and latest recap, fed from
   the same Supabase tables as the real Home page. */

function PreviewCard({ title, tag, children }) {
  return h('div', { className: 'block-card campaign-dashboard-card' },
    h('div', { className: 'campaign-dashboard-house-header' },
      h('div', { className: 'eyebrow' }, title),
      tag ? h('span', { className: 'role-tag' }, tag) : null
    ),
    children
  );
}

function ThemePreviewHome() {
  const [dash, setDash] = React.useState(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const sb = window.sb;
        if (!sb) { setDash({}); return; }
        const [summaryRes, questRes, dashRes, pointsRes] = await Promise.all([
          sb.from('session_summaries').select('*').order('session_date', { ascending: false, nullsFirst: false }).limit(1),
          sb.from('quest_board').select('entry_type, status'),
          sb.from('campaign_dashboard').select('*').eq('id', 1).maybeSingle(),
          sb.from('house_points').select('house, points').order('house')
        ]);
        if (cancelled) return;
        const firstErr = [summaryRes.error, questRes.error, dashRes.error, pointsRes.error].find(Boolean);
        if (firstErr) { setError(firstErr.message); return; }
        setDash({
          summary: summaryRes.data?.[0] || null,
          quests: questRes.data || [],
          dashboard: dashRes.data || {},
          points: Object.fromEntries((pointsRes.data || []).map(r => [r.house, Number(r.points) || 0]))
        });
      } catch (err) { if (!cancelled) setError(err?.message || String(err)); }
    }
    load();
    const onChange = () => load();
    window.addEventListener('nocturne-theme-updated', onChange);
    return () => { cancelled = true; window.removeEventListener('nocturne-theme-updated', onChange); };
  }, []);

  if (error) return h('p', { className: 'empty-note' }, 'Preview unavailable: ', error);
  const dashboard = dash || {};
  const summary = dashboard.summary;
  const quests = dashboard.quests || [];
  const activeQuests = quests.filter(e => e.entry_type === 'quest' && ['open', 'in_progress'].includes(e.status)).length;
  const rumors = quests.filter(e => e.entry_type === 'rumor' && e.status === 'unverified').length;
  const sessionDate = dashboard.dashboard?.next_session_date
    ? new Date(dashboard.dashboard.next_session_date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not scheduled yet';
  const houseGoals = {
    phoenix: Number(dashboard.dashboard?.phoenix_goal) || 0,
    fox: Number(dashboard.dashboard?.fox_goal) || 0,
    selkie: Number(dashboard.dashboard?.selkie_goal) || 0
  };
  const labels = { phoenix: 'Phoenix', fox: 'Fox', selkie: 'Selkie' };
  const points = dashboard.points || {};

  return h('div', { className: 'theme-preview-frame' },
    h('div', { className: 'theme-preview-chrome' }, 'Home · live preview'),
    h('div', { className: 'theme-preview-page' },
      h('div', { className: 'eyebrow' }, 'Welcome'),
      h('div', { className: 'theme-preview-title' }, 'The World of Nocturne'),
      h('div', { className: 'campaign-dashboard-grid' },
        h(PreviewCard, { title: 'Next Session' },
          h('div', { className: 'campaign-dashboard-session-content' },
            h('strong', null, sessionDate),
            dashboard.dashboard?.next_session_notes
              ? h('div', { dangerouslySetInnerHTML: { __html: window.renderMarkdown ? window.renderMarkdown(dashboard.dashboard.next_session_notes) : '' } })
              : h('p', { className: 'empty-note' }, 'No session note yet.')
          )
        ),
        h(PreviewCard, { title: 'Party Leads' },
          h('p', { style: { margin: 0 } },
            h('strong', null, String(activeQuests)), ' active quests · ',
            h('strong', null, String(rumors)), ' unverified rumors')
        ),
        h(PreviewCard, { title: 'House Points', tag: 'Campaign goal' },
          h('div', { className: 'campaign-dashboard-house-list' },
            ['phoenix', 'fox', 'selkie'].map(house => {
              const goal = houseGoals[house];
              const pts = points[house] || 0;
              const pct = goal > 0 ? Math.min(100, Math.round(pts / goal * 100)) : 0;
              return h('div', { className: `campaign-dashboard-house-row house-${house}`, key: house },
                h('div', { className: 'campaign-dashboard-house-label' },
                  h('img', { src: `assets/house-${house}.png`, alt: '' }),
                  h('span', null, `House ${labels[house]}`)
                ),
                h('span', { className: 'campaign-dashboard-house-score' }, `${pts}${goal ? ` / ${goal}` : ''} pts`),
                goal ? h('div', { className: 'campaign-dashboard-house-track' },
                  h('div', { className: 'campaign-dashboard-house-fill', style: { width: pct + '%' } })
                ) : null
              );
            })
          )
        ),
        h(PreviewCard, { title: 'Latest Recap' },
          summary
            ? h('div', null,
              h('strong', null, (summary.session_number ? `Session ${summary.session_number}: ` : '') + (summary.title || 'Untitled Session')),
              summary.body ? h('p', { style: { marginTop: 6 } }, summary.body.slice(0, 200) + (summary.body.length > 200 ? '…' : '')) : null
            )
            : h('p', { className: 'empty-note' }, 'No session recaps yet.')
        )
      )
    )
  );
}

/* ============================ Sidebar editor ============================ */

const PATTERN_MIN = 90, PATTERN_MAX = 240;
const SVG_MIN = 40, SVG_MAX = 120;      // % of tile the motif occupies
const GRID_MIN = 1, GRID_MAX = 4;       // motif repeats per tile axis
const OPACITY_MIN = 4, OPACITY_MAX = 70;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ThemeStudioControls() {
  const [flames, setFlames] = React.useState(window.nocturnePatternState.flames);
  const [tilt, setTilt] = React.useState(window.nocturnePatternState.tilt);
  const [tile, setTile] = React.useState(window.nocturnePatternState.tile);
  const [svgSize, setSvgSize] = React.useState(window.nocturnePatternState.svgSize);
  const [gridCols, setGridCols] = React.useState(window.nocturnePatternState.gridCols);
  const [gridRows, setGridRows] = React.useState(window.nocturnePatternState.gridRows);
  const [opacity, setOpacity] = React.useState(window.nocturnePatternState.opacity);
  const [layout, setLayout] = React.useState(window.nocturnePatternState.layout);
  const [soloMain, setSoloMain] = React.useState(window.nocturnePatternState.soloMain);
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
  const [motif, setMotif] = React.useState(window.nocturnePatternState.motif);
  const [animateMotif, setAnimateMotif] = React.useState(window.nocturnePatternState.animateMotif);

  React.useEffect(() => {
    const sync = () => {
      setFlames(window.nocturnePatternState.flames);
      setTilt(window.nocturnePatternState.tilt);
      setTile(window.nocturnePatternState.tile);
      setSvgSize(window.nocturnePatternState.svgSize);
      setGridCols(window.nocturnePatternState.gridCols);
      setGridRows(window.nocturnePatternState.gridRows);
      setOpacity(window.nocturnePatternState.opacity);
      setLayout(window.nocturnePatternState.layout);
      setSoloMain(!!window.nocturnePatternState.soloMain);
      setSidebarPattern(!!window.nocturnePatternState.sidebarPattern);
      setNoBackground(!!window.nocturnePatternState.noBackground);
      setInverted(document.documentElement.classList.contains('pattern-inverted'));
      setBrightness(window.nocturneDisplayMode());
      setSidebarMatchMain(!!window.nocturnePatternState.sidebarMatchMain);
      setMotif(window.nocturnePatternState.motif);
      setAnimateMotif(window.nocturnePatternState.animateMotif);
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

  function resetAppearance() {
    window.resetNocturneAppearance();
    // Reset also restores the current premade theme's stock colors — drop any
    // local color/CSS overrides left over in storage.
    try { window.localStorage.removeItem('nocturne-color-overrides'); } catch (_) {}
  }

  return h('div', { className: 'theme-studio-panel' },
    h('button', {
      type: 'button',
      className: 'btn btn-secondary btn-sm',
      style: { marginBottom: 4, justifySelf: 'start' },
      onClick: resetAppearance
    }, '↺ Reset appearance to theme defaults'),
    h('h3', null, 'Pattern Geometry'),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Motif'),
      h('div', { className: 'theme-studio-toggle-row' },
        [
          ['candelabra', 'Candelabra'],
          ['fleur', 'Fleur-de-lis'],
          ['fish', 'Fish'],
          ['fireflies', 'Fireflies']
        ].map(([value, label]) => h('button', {
          type: 'button',
          key: value,
          'aria-pressed': String(motif === value),
          className: 'btn btn-sm ' + (motif === value ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneMotif(value)
        }, label))
      )
    ),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Motif animation'),
      h('div', { className: 'theme-studio-toggle-row' },
        h('button', {
          type: 'button',
          'aria-pressed': String(animateMotif),
          className: 'btn btn-sm ' + (animateMotif ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneAnimateMotif(!window.nocturnePatternState.animateMotif)
        }, animateMotif ? 'Animated' : 'Static'),
        h('span', { className: 'theme-studio-hint' }, 'Fish sway; fireflies drift and pulse. Applies to fish/fireflies motifs.')
      )
    ),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Flame glow'),
      h('button', {
        type: 'button',
        className: 'btn btn-sm ' + (flames ? 'btn-flame-on' : 'btn-secondary'),
        'aria-pressed': String(flames),
        onClick: () => window.setNocturnePatternFlames(!window.nocturnePatternState.flames)
      }, flames ? 'Glowing' : 'Extinguished')
    ),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Tilt angle ', h('code', null, tilt + '°')),
      h('input', {
        type: 'range', min: -180, max: 180, step: 1, value: tilt,
        onInput: e => window.setNocturnePatternTilt(parseInt(e.target.value, 10))
      })
    ),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Tile size ', h('code', null, tile + 'px')),
      h('input', {
        type: 'range', min: PATTERN_MIN, max: PATTERN_MAX, step: 2, value: tile,
        onInput: e => window.setNocturnePatternTile(parseInt(e.target.value, 10))
      })
    ),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'SVG size ', h('code', null, svgSize + '%'), h('span', { className: 'theme-studio-hint' }, ' offsets tile size')),
      h('input', {
        type: 'range', min: SVG_MIN, max: SVG_MAX, step: 1, value: svgSize,
        onInput: e => window.setNocturneSvgSize(parseInt(e.target.value, 10))
      })
    ),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Grid columns ', h('code', null, gridCols)),
      h('input', {
        type: 'range', min: GRID_MIN, max: GRID_MAX, step: 1, value: gridCols,
        onInput: e => window.setNocturneGridColumns(parseInt(e.target.value, 10))
      })
    ),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Grid rows ', h('code', null, gridRows)),
      h('input', {
        type: 'range', min: GRID_MIN, max: GRID_MAX, step: 1, value: gridRows,
        onInput: e => window.setNocturneGridRows(parseInt(e.target.value, 10))
      })
    ),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Pattern opacity ', h('code', null, opacity + '%')),
      h('input', {
        type: 'range', min: OPACITY_MIN, max: OPACITY_MAX, step: 1, value: opacity,
        onInput: e => window.setNocturnePatternOpacity(parseInt(e.target.value, 10))
      })
    ),

    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Arrangement'),
      h('div', { className: 'theme-studio-toggle-row' },
        h('button', {
          type: 'button',
          'aria-pressed': String(layout === 'stagger'),
          className: 'btn btn-sm ' + (layout === 'stagger' ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturnePatternLayout('stagger')
        }, 'Offset grid'),
        h('button', {
          type: 'button',
          'aria-pressed': String(layout === 'grid'),
          className: 'btn btn-sm ' + (layout === 'grid' ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturnePatternLayout('grid')
        }, 'Regular grid')
      )
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
        h('span', { className: 'theme-studio-hint' }, noBackground ? 'No candelabra background anywhere.' : 'Background pattern visible on the page.')
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
        h('span', { className: 'theme-studio-hint' }, sidebarPattern ? 'Candelabra shows behind the navbar.' : 'Navbar has a plain background.')
      )
    ) : null,
    h('label', { className: 'theme-studio-slider-label' },
      h('span', null, 'Main window motif'),
      h('div', { className: 'theme-studio-toggle-row' },
        h('button', {
          type: 'button',
          'aria-pressed': String(soloMain),
          className: 'btn btn-sm ' + (soloMain ? 'btn-active-choice' : 'btn-secondary'),
          onClick: () => window.setNocturneSoloMain(!window.nocturnePatternState.soloMain)
        }, soloMain ? 'One large motif' : 'Repeating pattern'),
        h('span', { className: 'theme-studio-hint' }, soloMain ? 'A single oversized candelabra centered behind the main window; sidebar unaffected.' : 'Standard tiled pattern everywhere.')
      )
    ),

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

    h('h3', null, 'Community themes'),
    h('p', { className: 'theme-studio-hint' }, 'Published themes appear here once the DM approves them.'),
    sharedThemes.length === 0
      ? h('p', { className: 'theme-studio-hint' }, 'No shared themes yet — publish the first one!')
      : h('ul', { className: 'shared-theme-list' },
        sharedThemes.map(theme => h('li', { key: theme.id, className: 'shared-theme-row' + (theme.approved ? '' : ' pending-approval') },
          h('div', { className: 'shared-theme-info' },
            h('strong', null, theme.name),
            h('span', { className: 'shared-theme-creator' }, 'by ' + theme.creator,
              theme.approved ? null : h('span', { className: 'approval-badge' }, ' · awaiting DM approval')
            )
          ),
          h('div', { className: 'shared-theme-actions' },
            theme.isDM && !theme.approved ? h('button', {
              type: 'button', className: 'btn btn-sm',
              onClick: () => review(theme.id, true), title: 'Approve this theme'
            }, 'Approve') : null,
            theme.isDM && !theme.approved ? h('button', {
              type: 'button', className: 'btn btn-sm btn-spoiler',
              onClick: () => review(theme.id, false), title: 'Reject and remove this theme'
            }, 'Reject') : null,
            (theme.approved || theme.isDM) ? h('button', {
              type: 'button', className: 'btn btn-sm btn-secondary',
              onClick: () => applyShared(theme.id)
            }, 'Use') : null
          )
        ))
      ),

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

  const sliderRow = (label, value, min, max, onInput) => h('label', { className: 'theme-studio-slider-label' },
    h('span', null, label, h('code', null, String(value))),
    h('input', { type: 'range', min, max, step: 1, value, onInput: e => onInput(+e.target.value) })
  );

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

  const sliderRow = (label, value, min, max, onInput) => h('label', { className: 'theme-studio-slider-label' },
    h('span', null, label, h('code', null, String(value))),
    h('input', { type: 'range', min, max, step: 1, value, onInput: e => onInput(+e.target.value) })
  );

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

  return h('div', { className: 'css-variable-editor' },
    h('h3', null, 'Custom CSS'),
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
  return h(React.Fragment, null,
    h('div', { className: 'theme-studio-layout' },
      h('aside', { className: 'theme-studio-editor' },
        h(ThemeStudioControls)
      ),
      h('div', { className: 'theme-studio-preview-col' },
        h(ThemePreviewHome)
      )
    ),
    // Own full-width row beneath the preview + editor grid.
    h('div', { className: 'theme-studio-css-row' },
      h(CssVariableEditor)
    )
  );
}
