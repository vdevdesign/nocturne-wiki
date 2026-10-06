window.CharactersPage = function CharactersPage() {
  return h(PageSection, { id: 'characters', eyebrow: 'Roster & Lore', title: 'Players', subtitle: 'Public character introductions and private player notes.' },
    h('div', { id: 'character-cards-container' }, h('p', { className: 'empty-note' }, 'Loading...'))
  );
};
