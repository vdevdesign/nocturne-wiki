window.LootPage = function LootPage() {
  return h(PageSection, { id: 'loot', eyebrow: 'Treasure & Inventory', title: 'Loot & Homebrew Inventory', subtitle: 'Party rewards, items, and personal character inventories.' },
    h('div', { className: 'block-card', style: { borderColor: 'var(--gold-dim)', background: 'var(--surface-2)', marginBottom: 24 } },
      h('h3', { style: { marginTop: 0 } }, '🎒 Personal Private Inventory'),
      h('p', null, 'Items assigned specifically to player accounts.'),
      h('label', null, 'View Inventory For:'),
      h('select', { id: 'playerInventorySelector', className: 'input-field', onChange: () => window.loadPlayerPrivateInventory() }),
      h('div', { id: 'player-private-inventory-list' }, h('p', { className: 'empty-note' }, 'Loading private inventory...'))
    ),
    h('h3', null, 'Campaign Loot Pool'),
    h('div', { id: 'loot-container' }, h('p', { className: 'empty-note' }, 'Loading...'))
  );
};
