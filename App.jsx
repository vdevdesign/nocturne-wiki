const { createElement: h } = React;

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
        h('input', { type: 'password', id: 'authPass', autoComplete: 'current-password', placeholder: '•••••••••' }),
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
  ['home', 'Home', '⌂'], ['worldbook', 'Worldbook', '◇'], ['npcs', 'NPCs & Friendship Points', '♧'],
  ['characters', 'Character Directory', '♙'], ['session-zero', 'Session Zero & Rules', '◷'],
  ['summaries', 'Session Summaries', '≡'], ['loot', 'Loot & Rewards', '◈'], ['primer', 'Player Primer', '✦']
];

function navigateTo(target) {
  window.localStorage.setItem('nocturne-active-page', target);
  document.querySelectorAll('#react-root .navlist button[data-target]').forEach(button => {
    button.classList.toggle('active', button.dataset.target === target);
  });
  document.querySelectorAll('#react-root main section').forEach(section => {
    section.classList.toggle('active', section.id === target);
  });
}

function Sidebar() {
  return h('nav', { className: 'sidebar', id: 'appSidebar', style: { display: 'none' } },
    h('div', { className: 'brand' }, h('div', { className: 'brand-title-row' }, h(Sigil), h('div', null, h('h1', null, 'Nocturne'), h('p', null, 'Campaign Hub'))), h('div', { className: 'brand-meta-row' }, h('span', { className: 'role-pill', id: 'rolePill' }, 'player'), h('button', { className: 'inbox-button', id: 'inboxButton', title: 'Password requests', onClick: () => window.togglePasswordInbox() }, h('span', { className: 'email-icon', 'aria-hidden': true }, '✉'), h('span', { className: 'notification-bubble', id: 'inboxCount', style: { display: 'none' } }, '0'))), h('div', { className: 'password-inbox', id: 'passwordInbox', style: { display: 'none' } })),
    h('ul', { className: 'navlist', id: 'navlist' },
      h('li', { style: { padding: '0 4px' } }, h('button', { className: 'nav-chat-btn', onClick: () => window.openChatModal() },
        h('span', { className: 'nav-chat-label' }, h('span', { className: 'nav-icon', 'aria-hidden': true }, '◈'), h('span', null, 'Session Chats')),
        h('span', { id: 'navLiveBadge', className: 'nav-live-badge', style: { display: 'none' } }, 'LIVE')
      )),
      navigation.map(([target, label, icon]) => h('li', { key: target }, h('button', { 'data-target': target, className: target === 'home' ? 'active' : '', onClick: () => navigateTo(target) }, h('span', { className: 'nav-icon', 'aria-hidden': true }, icon), h('span', { className: 'nav-label' }, label)))),
      h('li', null, h('button', { 'data-target': 'restricted', className: 'dm-nav-btn', id: 'dmNavBtn', style: { display: 'none' }, onClick: () => navigateTo('restricted') }, h('span', { className: 'nav-icon', 'aria-hidden': true }, '🔒'), h('span', { className: 'nav-label' }, 'Restricted Archives')))
    ),
    h('button', { className: 'logout-btn', id: 'logoutBtn', onClick: () => window.handleLogout() }, 'Sign out')
  );
}

function ContentSections() {
  return h('main', { id: 'appMain', style: { display: 'none' } },
    h(HomePage), h(WorldbookPage), h(NpcsPage), h(CharactersPage), h(SessionZeroPage),
    h(SummariesPage), h(LootPage), h(PrimerPage), h(RestrictedPage)
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

function App() {
  return h(React.Fragment, null, h(AuthScreen), h(Sidebar), h(ContentSections), h(ChatModal));
}

ReactDOM.createRoot(document.getElementById('react-root')).render(h(App));
