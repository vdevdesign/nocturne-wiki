export default async function run(page) {
  await page.waitForSelector('#devSignInBtn', { state: 'attached', timeout: 20000 });
  await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = "DEV_MODE = true; enterDevMode();";
    document.head.appendChild(s);
    setTimeout(res, 80);
  }));
  await page.waitForTimeout(4000);
  await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = "document.getElementById('appSidebar').style.display='flex'; document.getElementById('appMain').style.display='block'; document.getElementById('authScreen').classList.add('hidden'); navigateTo('home'); resetNocturneAppearance();";
    document.head.appendChild(s);
    setTimeout(res, 150);
  }));
  await page.waitForTimeout(1500);

  // 1. Premade picker in header bar, right of title
  const header = await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = `document.title = JSON.stringify({
      picker: !!document.getElementById('premadeThemeSelect'),
      options: document.querySelectorAll('#premadeThemeSelect option').length,
      value: document.getElementById('premadeThemeSelect')?.value
    })`;
    document.head.appendChild(s);
    setTimeout(() => res(document.title), 80);
  }));

  // 2. Navigate to studio, then switch to potion via picker
  await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = "navigateTo('theme-studio');";
    document.head.appendChild(s);
    setTimeout(res, 100);
  }));
  await page.waitForTimeout(1500);
  await page.selectOption('#premadeThemeSelect', 'potion');
  await page.waitForTimeout(800);
  const afterSwitch = await page.evaluate(() => document.documentElement.dataset.theme);

  // 3. Chat GIF flow (page-world injected script, 'GIF:' title channel)
  await page.evaluate(() => new Promise(res => {
    const s = document.createElement('script');
    s.textContent = `
      (function(){
        const done = out => { document.title = 'GIF:' + JSON.stringify(out); };
        window.openChatModal();
        setTimeout(() => {
          const btn = document.getElementById('chatGifBtn');
          if (!btn || btn.disabled) { done({err: 'btn', dis: btn ? btn.disabled : 'none'}); return; }
          btn.click();
          setTimeout(() => {
            const img = document.querySelector('.chat-gif-item img');
            done({
              clicked: true,
              items: document.querySelectorAll('.chat-gif-item').length,
              animated: img ? (img.src.endsWith('.gif')) : false,
              loaded: img && img.complete ? img.naturalWidth > 0 : false
            });
          }, 2500);
        }, 1500);
      })();
    `;
    document.head.appendChild(s);
  }));
  try {
    await page.waitForFunction(() => document.title.startsWith('GIF:'), null, { timeout: 12000 });
  } catch (_) { /* title channel miss */ }
  const gifTitle = await page.title();
  await page.screenshot({ path: 'c:/Users/pixel/Documents/VSCode/nocturne-wiki/qa-gif.png' });

  return {
    header: JSON.parse(header),
    afterSwitch,
    gif: (() => { try { return JSON.parse(gifTitle.slice(4)); } catch { return gifTitle; } })()
  };
}
