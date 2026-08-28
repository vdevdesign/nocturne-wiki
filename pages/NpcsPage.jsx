window.NpcsPage = function NpcsPage() {
  return h(PageSection, { id: 'npcs', eyebrow: 'Dramatis Personae', title: 'NPCs & Friendship Points', subtitle: 'Faculty, allies, and notable figures across the realm.' },
    h('div', { className: 'section-toolbar', id: 'spoilerToolbar', style: { display: 'none' } }, h('button', { className: 'btn btn-spoiler btn-sm', id: 'spoilerToggleBtn', onClick: () => window.toggleSpoilers() }, 'Black Out Spoilers')),
    h('div', { id: 'npc-cards-container' }, h('p', { className: 'empty-note' }, 'Loading...'))
  );
};
