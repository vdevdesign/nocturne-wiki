window.PrimerPage = function PrimerPage() {
  return h(PageSection, { id: 'primer', eyebrow: 'Before You Play', title: 'Player Primer', subtitle: 'What you need to know before making a character.' },
    h('h3', null, 'The Basics'), h('p', null, 'D&D 5th Edition, 2024 rules. Sheets on D&D Beyond. Dark fantasy with a cheerful surface, mystery and magic with something unsettling underneath.'),
    h('h3', null, 'The World'), h('p', null, h('strong', null, 'Elthizar Adventurer Academy'), ' — founded by Euduneus, deep roots in magic and monster fighting.'),
    h('h3', null, 'Rumours & Mysteries'), h('ul', { className: 'mystery-list' }, h('li', null, 'Something lurks in the forest near the academy.'), h('li', null, 'The paintings below the Herbology classroom cry.'), h('li', null, 'The river near the academy is making people sick.'))
  );
};
