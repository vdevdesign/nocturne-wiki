window.CharactersPage = function CharactersPage() {
  return h(PageSection, { id: 'characters', eyebrow: 'Roster & Lore', title: 'Character Directory', subtitle: 'Party roster and player character backstories.' },
    h('div', { id: 'character-cards-container' }, h('p', { className: 'empty-note' }, 'Loading...'))
  );
};
