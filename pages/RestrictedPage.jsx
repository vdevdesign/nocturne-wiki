window.RestrictedPage = function RestrictedPage() {
  return h(PageSection, { id: 'restricted', eyebrow: 'DM Eyes Only', title: 'Restricted Archives', subtitle: 'Confidential DM notes, campaign outlines, lore, and encounters.' },
    h('div', { id: 'restricted-container' }, h('p', { className: 'empty-note' }, 'Loading Hub...'))
  );
};
