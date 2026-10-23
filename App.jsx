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
  document.documentElement.dataset.theme = nextTheme;
  try { window.localStorage.setItem('nocturne-theme', nextTheme); } catch (_) { /* private browsing */ }
  if (typeof window.persistNocturneTheme === 'function') window.persistNocturneTheme(nextTheme);
}

// Signed-out screens always use the standard theme. The account preference is
// loaded after authentication by onSignedIn().
setNocturneTheme('nocturne');
window.setNocturneTheme = setNocturneTheme;

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
});

function Sidebar() {
  return h('nav', { className: `sidebar${savedSidebarCollapsed ? ' collapsed' : ''}`, id: 'appSidebar', style: { display: 'none' } },
    h('button', { type: 'button', className: 'mobile-nav-close', 'aria-label': 'Close navigation menu', onClick: () => window.setMobileNavOpen(false) }, '×'),
    h('div', { className: 'brand' }, h('div', { className: 'brand-title-row' }, h(Sigil), h('div', { className: 'brand-title-copy' }, h('h1', null, 'Nocturne'), h('p', null, 'Campaign Hub')), h('button', { type: 'button', className: 'sidebar-collapse-toggle', id: 'sidebarCollapseToggle', 'aria-expanded': String(!savedSidebarCollapsed), 'aria-label': savedSidebarCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu', onClick: () => setSidebarCollapsed(!document.getElementById('appSidebar')?.classList.contains('collapsed')) }, savedSidebarCollapsed ? '›' : '‹')), h('div', { className: 'brand-meta-row' }, h('div', { className: 'brand-meta-actions' }, h('span', { className: 'role-pill', id: 'rolePill' }, 'player'), h('select', { className: 'theme-select', id: 'themeSelect', 'aria-label': 'Choose site theme', defaultValue: 'nocturne', onChange: event => window.setNocturneTheme(event.target.value) }, h('option', { value: 'nocturne' }, 'Nocturne (Dark)'), h('option', { value: 'dracula' }, 'Dracula (Dark)'), h('option', { value: 'alucard' }, 'Alucard (Light)'), h('option', { value: 'sylvan' }, 'Sylvan (Dark)'), h('option', { value: 'steampunk' }, 'Steampunk (Dark)'), h('option', { value: 'frost' }, 'Frost (Light)'), h('option', { value: 'starlight' }, 'Starlight (Medium)'), h('option', { value: 'lush' }, 'Lush (Dark)'), h('option', { value: 'mystic' }, 'Mystic (Dark)'), h('option', { value: 'potion' }, 'Potion (Dark)'), h('option', { value: 'underdark' }, 'Underdark (Dark)'))), h('button', { className: 'inbox-button', id: 'inboxButton', title: 'DM requests', onClick: () => window.togglePasswordInbox() }, h('span', { className: 'email-icon', 'aria-hidden': true }, '✉'), h('span', { className: 'notification-bubble', id: 'inboxCount', style: { display: 'none' } }, '0'))), h('div', { className: 'password-inbox', id: 'passwordInbox', style: { display: 'none' } })),
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
    h(CommonRoomsPage), h(GamesHub), h(SummariesPage), h(QuestBoardPage), h(LootPage), h(PrimerPage), h(RestrictedPage)
  );
}

function ChatModal() {
  return h('div', { id: 'chatModalOverlay', className: 'chat-modal-overlay' }, h('div', { className: 'chat-modal' },
    h('div', { className: 'chat-header' }, h('div', { className: 'chat-header-left' }, h('button', { className: 'btn btn-sm btn-secondary', onClick: () => window.toggleChatDrawer() }, '☰'), h('h4', { id: 'modalChatTitle' }, 'Session Chat')), h('div', { className: 'chat-header-actions' }, h('span', { id: 'chatStatusBadge', className: 'status-badge' }, 'Locked'), h('button', { className: 'btn btn-sm btn-secondary', onClick: () => window.closeChatModal() }, '✕'))),
    h('div', { id: 'chatMenuDrawer', className: 'chat-menu-drawer' }, h('div', { className: 'chat-drawer-header' }, h('strong', null, 'Past Sessions'), h('span', { id: 'dmNewChatBtn' })), h('div', { id: 'previousChatsList' })),
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
      h('form', { id: 'chatForm', className: 'chat-form', onSubmit: event => window.handleChatSubmit(event) }, h('input', { id: 'chatInput', className: 'input-control', placeholder: 'Type /help for chat commands...', disabled: true }), h('button', { id: 'chatSendBtn', className: 'btn', type: 'submit', disabled: true }, 'Send'), h('span', { className: 'dice-menu-anchor' }, h('button', { id: 'diceRollBtn', className: 'btn dice-roll-button', type: 'button', title: 'Open dice roller', disabled: true }, 'Roll dice'), h('span', { id: 'diceRollMenu', className: 'dice-roll-menu', style: { display: 'none' } }, h('span', { className: 'dice-menu-title' }, 'Roll dice'), h('label', null, 'Number of dice', h('input', { id: 'diceCountInput', className: 'input-field', type: 'number', min: 1, max: 100, defaultValue: 1 })), h('label', null, 'Dice type', h('select', { id: 'diceTypeInput', className: 'input-field', defaultValue: '20' }, h('option', { value: '4' }, 'd4'), h('option', { value: '6' }, 'd6'), h('option', { value: '8' }, 'd8'), h('option', { value: '10' }, 'd10'), h('option', { value: '12' }, 'd12'), h('option', { value: '20' }, 'd20'), h('option', { value: '100' }, 'd100'))), h('label', null, 'Modifier', h('input', { id: 'diceModifierInput', className: 'input-field', type: 'number', defaultValue: 0 })), h('button', { id: 'rollConfiguredDiceBtn', className: 'btn', type: 'button' }, 'Roll')))),
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
    h(Sidebar),
    h(ContentSections),
    h(RuneDuelRequestPopup),
    h(ChatModal)
  );
}

ReactDOM.createRoot(document.getElementById('react-root')).render(h(App));
