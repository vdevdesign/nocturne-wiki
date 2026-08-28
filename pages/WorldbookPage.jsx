window.WorldbookPage = function WorldbookPage() {
  return h(PageSection, { id: 'worldbook', eyebrow: 'Setting', title: 'Worldbook', subtitle: 'Dark fantasy with a cheerful surface.' },
    h('div', { id: 'worldbook-container' }, h('p', { className: 'empty-note' }, 'Loading...'))
  );
};
