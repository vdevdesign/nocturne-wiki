window.WorldbookPage = function WorldbookPage() {
  return h(PageSection, { id: 'worldbook', eyebrow: 'Setting', title: 'Worldbook', subtitle: 'Dark fantasy with a cheerful surface.' },
    h('figure', { className: 'worldbook-map' },
      h('img', { src: 'assets/nocturne-map.png', alt: 'Map of Nocturne showing Ember Isles, Evron, Kirael, Vardok, the capital city, and Elthizar Academy' }),
      h('figcaption', null, 'The known lands of Nocturne')
    ),
    // Places gallery: a 3-column, single-row carousel of photo cards that
    // scrolls horizontally, sitting just under the world map.
    h('section', { className: 'places-section', 'aria-label': 'Places of the realm' },
      h('div', { className: 'places-heading' },
        h('h3', { className: 'places-title' }, 'Places of the Realm'),
        h('div', { className: 'places-nav' },
          h('button', { type: 'button', className: 'btn btn-sm btn-secondary places-arrow', id: 'placesPrev', 'aria-label': 'Scroll places left', onClick: () => window.scrollPlacesCarousel(-1) }, '‹'),
          h('button', { type: 'button', className: 'btn btn-sm btn-secondary places-arrow', id: 'placesNext', 'aria-label': 'Scroll places right', onClick: () => window.scrollPlacesCarousel(1) }, '›')
        )
      ),
      h('div', { className: 'places-carousel-wrap' },
        h('div', { id: 'placesCarousel', className: 'places-carousel', role: 'list' },
          h('p', { className: 'empty-note' }, 'Loading…')
        )
      ),
      h('p', { id: 'placesHint', className: 'empty-note', style: { display: 'none' } },
        'The DM adds places with a photo and a short description.')
    ),
    h('div', { id: 'worldbook-container' }, h('p', { className: 'empty-note' }, 'Loading...'))
  );
};

// Carousel arrows scroll exactly one card (one column) per click.
window.scrollPlacesCarousel = function scrollPlacesCarousel(direction) {
  const track = document.getElementById('placesCarousel');
  if (!track) return;
  const card = track.querySelector('.place-card');
  const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 16;
  const step = card ? card.getBoundingClientRect().width + gap : 260;
  track.scrollBy({ left: direction * step, behavior: 'smooth' });
};
