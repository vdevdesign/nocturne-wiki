export default async function run(page, ui) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5188/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(4000);
  const layout = await page.evaluate(() => {
    document.getElementById('authScreen')?.classList.add('hidden');
    document.getElementById('appSidebar').style.display = 'flex';
    document.getElementById('appMain').style.display = 'block';
    document.querySelector('.navlist button[data-target="worldbook"]')?.click();
    const wb = document.querySelector('#appMain > section#worldbook.active');
    const map = wb?.querySelector('.worldbook-map');
    const section = wb?.querySelector('.places-section');
    if (!map || !section) return { map: !!map, section: !!section };
    const mr = map.getBoundingClientRect(), sr = section.getBoundingClientRect();
    return { sectionDisplay: getComputedStyle(section).display, belowMap: sr.top >= mr.bottom - 2, gapPx: Math.round(sr.top - mr.bottom) };
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'qa-wb-carousel.png' });
  return layout;
}
