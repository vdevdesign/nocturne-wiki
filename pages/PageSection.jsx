window.PageSection = function PageSection({ id, eyebrow, title, subtitle, children }) {
  return h('section', { id, className: id === 'home' ? 'active' : undefined },
    h('div', { className: 'eyebrow' }, eyebrow),
    h('h2', { className: 'title' }, title),
    subtitle && h('p', { className: 'subtitle' }, subtitle),
    children
  );
};
