window.PageSection = function PageSection({ id, eyebrow, title, subtitle, children }) {
  return h('section', { id, className: id === 'home' ? 'active' : undefined },
    h('button', {
      type: 'button',
      className: 'btn btn-secondary page-back-button',
      hidden: true,
      'aria-label': 'Go back to the previous page',
      onClick: () => window.navigateBack()
    }, '← Back'),
    h('div', { className: 'eyebrow' }, eyebrow),
    h('h2', { className: 'title' }, title),
    subtitle && h('p', { className: 'subtitle' }, subtitle),
    children
  );
};
