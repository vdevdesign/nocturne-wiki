window.SummariesPage = function SummariesPage() {
  return h(PageSection, { id: 'summaries', eyebrow: 'Recaps', title: 'Session Summaries', subtitle: "Public logs of the party's ongoing exploits." },
    h('div', { id: 'summaries-toolbar', style: { marginBottom: 20 } }),
    h('div', { id: 'summaries-container' }, h('p', { className: 'empty-note' }, 'Loading...'))
  );
};
