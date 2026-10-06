window.PrimerPage = function PrimerPage() {
  return h(PageSection, { id: 'primer', eyebrow: 'Before You Play', title: 'Player Primer', subtitle: 'What you need to know before making a character.' },
    h('h3', null, 'The Basics'),
    h('p', null, h('strong', null, 'System: '), 'D&D 5th Edition, 2024 rules. ', h('strong', null, 'Character sheets: '), 'D&D Beyond. ', h('strong', null, 'Tone: '), 'Dark fantasy with a cheerful surface. Expect mystery, magic, and something a little unsettling underneath the charm.'),
    h('div', { className: 'card' },
      h('h4', null, 'How to Play D&D'),
      h('p', null, 'The DM describes the world and what happens around you; you describe what your character tries to do.'),
      h('p', null, 'When an outcome is uncertain, the DM may ask you to roll a die and add a skill or ability bonus. In combat, take turns choosing actions, movement, and spells.'),
      h('p', { style: { marginBottom: 0 } }, 'There is no single right way to solve a problem—ask questions, work together, and make choices that feel true to your character.')
    ),

    h('h3', null, 'The World'),
    h('p', null, 'Nocturne is a world of mysteries and magic, held together by a fragile peace. Your characters attend ', h('strong', null, 'Elthizar Adventurer Academy'), ', founded by ', h('strong', null, 'Euduneus Exius Elthizar'), '. The academy has deep roots in magic and monster fighting, in a setting inspired by Zhangjiajie’s towering stone spires and mist.'),
    h('div', { className: 'card' },
      h('h4', null, 'Life at the Academy'),
      h('ul', null,
        h('li', null, 'Curfew is enforced, and chimeras are banned.'),
        h('li', null, 'Large groups travel by dragon; solo or paired travelers ride pegasus.')
      )
    ),
    h('div', { className: 'card' },
      h('h4', null, 'Beyond the Academy'),
      h('ul', null,
        h('li', null, h('strong', null, 'Kirael: '), 'A nearby fae kingdom ruled by Queen Titania.'),
        h('li', null, h('strong', null, 'Vardok: '), 'A bustling dragonkin city, home to dragonborn, couatl, kobolds, and drakes.'),
        h('li', null, h('strong', null, 'Evron: '), 'A human settlement with a tense relationship with Vardok.')
      )
    ),
    h('p', null, 'There is room for a dragonborn from Vardok, a fae-blooded student from Kirael, a human from Evron, or an academy-raised character with no clear roots at all.'),

    h('h3', null, 'Content Notes & Safety'),
    h('p', null, 'So you know what you’re signing up for:'),
    h('ul', null,
      h('li', null, h('strong', null, 'Body horror: '), 'Low-key but present. Chimera transformation is real and recurring, and it is not always reversible.'),
      h('li', null, h('strong', null, 'Loss and grief: '), 'Several NPCs carry real grief or guilt as part of their backstories.'),
      h('li', null, h('strong', null, 'Political corruption and class injustice: '), 'Especially around Evron and Vardok.'),
      h('li', null, h('strong', null, 'Psychological horror over gore: '), 'Themes include mind control, memory loss, and identity.')
    ),
    h('p', null, 'If any of that does not sound fun, session zero is the time to say so.'),
    h('div', { className: 'card' },
      h('h4', null, 'Safety Tools'),
      h('p', null, 'Our safe word is ', h('strong', null, '“Coconut.”'), ' It means “pause, change, or skip this,” with no explanation needed. You can also message or talk to the DM privately after the session if something makes you uncomfortable. This is not a formality—nobody has to be the first to speak up.')
    ),

    h('h3', null, 'Friendship Points (FP)'),
    h('p', null, 'Build genuine relationships with NPCs through roleplay. Each NPC has three Friendship Levels; reaching a new level unlocks a deeper scene. It happens naturally through play—no quest log needed.')
  );
};
