export default async function run(page) {
  await page.waitForSelector('#devSignInBtn', { state: 'attached', timeout: 20000 });
  await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = "DEV_MODE = true; enterDevMode();";
    document.head.appendChild(s);
    setTimeout(res, 80);
  }));
  await page.waitForTimeout(5000);
  await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = "document.getElementById('appSidebar').style.display='flex'; document.getElementById('appMain').style.display='block'; document.getElementById('authScreen').classList.add('hidden'); navigateTo('home'); resetNocturneAppearance();";
    document.head.appendChild(s);
    setTimeout(res, 150);
  }));
  await page.waitForTimeout(2500);

  const defaults = await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = `document.title = JSON.stringify({
      gridCols: window.nocturnePatternState.gridCols,
      gridRows: window.nocturnePatternState.gridRows,
      motifs: document.querySelector('#nocturneSidebarCandelabraPattern')?.querySelectorAll('g').length,
      tilt: (() => { const l = [...document.querySelectorAll('label')].find(x => x.textContent.includes('Tilt angle')); return l ? { min: l.querySelector('input').min, max: l.querySelector('input').max } : null; })()
    })`;
    document.head.appendChild(s);
    setTimeout(() => res(document.title), 60);
  }));

  // Chat GIF: everything inside ONE page-world injected script.
  const gif = await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = `
      (async () => {
        const done = out => { document.title = 'GIF:' + JSON.stringify(out); };
        try {
          if (typeof window.openChatModal !== 'function') { done({err: 'openChatModal missing'}); return; }
          window.openChatModal();
          setTimeout(() => {
            const btn = document.getElementById('chatGifBtn');
            if (!btn) { done({err: 'no btn'}); return; }
            if (btn.disabled) { done({err: 'btn disabled'}); return; }
            btn.click();
            setTimeout(() => {
              const panel = document.getElementById('chatGifPanel');
              const img = document.querySelector('.chat-gif-item img');
              done({
                clicked: true,
                panelOpen: panel && panel.style.display !== 'none',
                items: document.querySelectorAll('.chat-gif-item').length,
                firstImg: img ? img.src.split('/').pop() : null,
                imgLoaded: img && img.complete ? img.naturalWidth > 0 : false
              });
            }, 3000);
          }, 2000);
        } catch (e) { done({err: e.message}); }
      })();
    `;
    document.head.appendChild(s);
  }));
  await page.waitForFunction(() => document.title.startsWith('GIF:'), null, { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'c:/Users/pixel/Documents/VSCode/nocturne-wiki/qa-gif.png' });
  const gifParsed = (() => { try { return JSON.parse(gif.replace(/^GIF:/, '')); } catch { return gif; } })();

  // Reset title channel, then navigate to studio
  await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = "document.title = 'Nocturne'; navigateTo('theme-studio');";
    document.head.appendChild(s);
    setTimeout(res, 100);
  }));
  await page.waitForTimeout(2000);
  const colorUi = await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = `document.title = JSON.stringify({
      targetBtns: document.querySelectorAll('.color-target-btn').length,
      slidersBeforePick: document.querySelectorAll('.color-slider-editor input').length
    })`;
    document.head.appendChild(s);
    setTimeout(() => res(document.title), 60);
  }));
  await page.locator('.color-target-btn').first().click();
  await page.waitForTimeout(800);
  const colorUi2 = await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = `document.title = JSON.stringify({
      sliders: document.querySelectorAll('.color-slider-editor input').length,
      modeBtns: [...document.querySelectorAll('.color-slider-editor button')].map(b => b.textContent.trim()).slice(0, 2),
      preview: !!document.querySelector('.color-slider-preview')
    })`;
    document.head.appendChild(s);
    setTimeout(() => res(document.title), 60);
  }));
  await page.locator('.color-slider-editor input[type=range]').first().fill('200');
  await page.locator('.color-slider-editor input[type=range]').first().dispatchEvent('input');
  await page.waitForTimeout(400);
  const committed = await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = `document.title = JSON.stringify({ accentOverride: window.nocturneColorOverrides['--gold'] || null })`;
    document.head.appendChild(s);
    setTimeout(() => res(document.title), 60);
  }));

  // Sidebar toggle + solo motif
  await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = "setNocturneSidebarPattern(false); setNocturneSoloMain(true); setNocturnePatternTilt(30);";
    document.head.appendChild(s);
    setTimeout(res, 250);
  }));
  await page.waitForTimeout(600);
  const layout = await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = `document.title = JSON.stringify({
      sidebarHidden: getComputedStyle(document.getElementById('sidebarPattern')).display === 'none',
      soloMotifs: document.querySelector('#nocturneCandelabraPattern')?.querySelectorAll('g').length,
      sidebarMotifs: document.querySelector('#nocturneSidebarCandelabraPattern')?.querySelectorAll('g').length
    })`;
    document.head.appendChild(s);
    setTimeout(() => res(document.title), 60);
  }));
  await page.screenshot({ path: 'c:/Users/pixel/Documents/VSCode/nocturne-wiki/qa-solo.png' });

  // Inversion at 2x2 grid
  await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = "resetNocturneAppearance(); setNocturneGridColumns(2); setNocturneGridRows(2); togglePatternInverted();";
    document.head.appendChild(s);
    setTimeout(res, 250);
  }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'c:/Users/pixel/Documents/VSCode/nocturne-wiki/qa-inverted.png', fullPage: false });

  return {
    defaults: JSON.parse(defaults),
    gif: gifParsed,
    colorUi: JSON.parse(colorUi), colorUi2: JSON.parse(colorUi2), committed: JSON.parse(committed),
    layout: JSON.parse(layout)
  };
}
