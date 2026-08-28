window.SessionZeroPage = function SessionZeroPage() {
  return h(PageSection, { id: 'session-zero', eyebrow: 'Table Expectations', title: 'Session Zero & House Rules' },
    h('h3', null, 'Tone and Content'),
    h('ul', null, h('li', null, 'Loss and grief as backstory'), h('li', null, 'Political corruption and class injustice'), h('li', null, 'Psychological horror over gore (mind control, memory loss, identity)')),
    h('p', null, "If any of this doesn't sound fun, session zero is the time to say so."),
    h('h3', null, 'Safety Tools'), h('p', null, 'Our safe word is ', h('strong', null, 'COCONUT'), '. Say it and we pause, change, or skip whatever is happening, no explanation needed in the moment.'),
    h('h3', null, 'System & Tools'), h('p', null, 'D&D 5th Edition, 2024 rules. Character sheets on D&D Beyond.')
  );
};
