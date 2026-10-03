window.QuestBoardPage = function QuestBoardPage() {
  return h(PageSection, { id: 'quest-board', eyebrow: 'Leads & Adventure', title: 'Quest & Rumor Board', subtitle: 'Open leads, whispered rumors, and the party’s unfinished business.' },
    h('div', { id: 'quest-board-toolbar', className: 'section-toolbar' }),
    h('div', { id: 'quest-board-container' }, h('p', { className: 'empty-note' }, 'Loading...'))
  );
};
