window.HomePage = function HomePage() {
  return h(PageSection, { id: 'home', eyebrow: 'Welcome', title: 'The World of Nocturne', subtitle: 'A homebrew D&D 5e campaign, centered on Elthizar Adventurer Academy.' },
    h('p', null, 'This hub holds tone, lore, the active character roster, and party records, all in one place.'),
    h('div', { className: 'card', style: { marginBottom: 24 } },
      h('h3', { style: { marginTop: 0 } }, 'Campaign at a Glance'),
      h('div', { id: 'campaign-dashboard-content' }, h('p', { className: 'empty-note' }, 'Loading campaign dashboard...'))
    ),
    h('div', { className: 'card' }, h('h4', null, 'Where to start'), h('p', { style: { margin: 0 } }, 'New to the table? Start with the ', h('strong', null, 'Player Primer'), '. Running the game? Everything DM-only lives in ', h('strong', null, 'Restricted Archives'), '.'))
  );
};
