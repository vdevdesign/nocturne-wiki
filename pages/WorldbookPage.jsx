window.WorldbookPage = function WorldbookPage() {
  return h(PageSection, { id: 'worldbook', eyebrow: 'Setting', title: 'Worldbook', subtitle: 'Dark fantasy with a cheerful surface.' },
    h('figure', { className: 'worldbook-map' },
      h('img', { src: 'assets/nocturne-map.png', alt: 'Map of Nocturne showing Ember Isles, Evron, Kirael, Vardok, the capital city, and Elthizar Academy' }),
      h('figcaption', null, 'The known lands of Nocturne')
    ),
    h('div', { id: 'worldbook-container' }, h('p', { className: 'empty-note' }, 'Loading...'))
  );
};
