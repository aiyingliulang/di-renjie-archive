'use strict';
// Start python3 -m http.server 8765 --bind 127.0.0.1 in the repository root.
// Requires an installed Playwright and Chromium, without adding project dependencies:
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright node checks/browser.cjs
// Optional BASE_URL=http://127.0.0.1:8765/ (must point at the repository root).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const base = process.env.BASE_URL || 'http://127.0.0.1:8765/';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [], failed = [], bad = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', r => failed.push(r.url()));
    page.on('response', r => { if (r.status() >= 400) bad.push([r.status(), r.url()]); });
    assert.equal((await page.goto(base)).status(), 200);
    const d = await page.evaluate(() => window.ARCHIVE);
    const routes = ['', '#cases', '#people/all', '#sources',
      ...d.volumes.map(v => '#cases/' + v.id),
      ...d.cases.flatMap(c => ['#case/' + c.id, '#people/' + c.id]),
      ...d.people.map(p => '#person/' + p.id),
      ...Object.keys(d.personAliases).map(id => '#person/' + id)];
    const links = new Set();
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      await page.goto(base + route);
      const pid = route.startsWith('#person/') && route.slice(8);
      const cid = route.startsWith('#case/') && route.slice(6);
      const person = pid && d.people.find(p => p.id === (d.personAliases[pid] || pid));
      if (person) {
        assert.equal(await page.locator('main h1').textContent(), person.name);
        assert.equal(await page.locator('.person-spoiler').getAttribute('open'), null);
        assert.equal(await page.locator('.person-spoiler p').first().isVisible(), false);
        if (person.photoSourceStatus === 'pending') assert(await page.locator('.source-pending').isVisible());
      } else if (cid) {
        assert.equal(await page.locator('main h1').textContent(), d.cases.find(c => c.id === cid).title);
      }
      const broken = await page.evaluate(async () => {
        await Promise.all([...document.images].map(async img => {
          img.loading = 'eager';
          try { await img.decode(); } catch {}
        }));
        return [...document.images].filter(img => !img.naturalWidth).map(img => img.src);
      });
      assert.deepEqual(broken, [], route);
      for (const href of await page.locator('a').evaluateAll(as => as.map(a => a.getAttribute('href')))) links.add(href);
      if (i && i % 50 === 0) console.log(`Checked ${i}/${routes.length} routes`);
    }
    for (const href of links) {
      if (!href.startsWith('#')) continue;
      const plain = href.split('?')[0];
      assert(['#home', '#main', '#people', ...routes].includes(plain), `Broken route ${href}`);
    }
    for (const entry of ['', 'v2/']) {
      for (const route of ['', '#case/blue', '#person/wulezhi', '#person/chachi', '#person/gaorujin']) {
        await page.goto(base + entry + route);
        const before = await page.locator('main h1').textContent();
        const hash = await page.evaluate(() => location.hash);
        await page.locator('.skip').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('main h1').textContent(), before);
        assert.equal(await page.evaluate(() => location.hash), hash);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
      }
    }
    await page.goto(base + '#person/chachi');
    await page.locator('.person-spoiler summary').click();
    assert(await page.locator('.person-spoiler p').first().isVisible());
    await page.locator('#search').click();
    for (const [query, id] of [['高如进', 'jianxiaolang'], ['李二', 'jili'], ['颖王', 'zongzhu'], ['赵传臣', 'zhaochuanchen']]) {
      await page.locator('#query').fill(query);
      assert(await page.locator(`#results a[href="#person/${id}"]`).isVisible(), query);
    }
    await page.keyboard.press('Escape');
    await page.goto(base + '#case/blue');
    await page.locator('[data-save]').click();
    await page.reload();
    assert.equal(await page.locator('[data-save]').textContent(), '已收入阅卷簿');
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ['', '#people/all', '#case/canal', '#person/wulezhi', '#person/fangqian', '#person/maola']) {
        await page.goto(base + route);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} ${route}`);
      }
    }
    const images = ['assets/seal.svg', ...['portraits', 'stills'].flatMap(dir =>
      fs.readdirSync(path.join(root, 'v2', dir)).map(f => 'v2/' + dir + '/' + f))];
    const brokenFiles = await page.evaluate(async files => (await Promise.all(files.map(async file => {
      const img = new Image(); img.src = new URL(file, location.origin + '/').href;
      try { await img.decode(); return null; } catch { return file; }
    }))).filter(Boolean), images);
    assert.deepEqual(brokenFiles, []);
    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
    assert.deepEqual(bad, []);
    console.log(`PASS: ${routes.length} routes; both entries; aliases, spoiler folding, keyboard skip, search, bookmarks; ${images.length} images; 320/390/768px; no page errors or failed resources.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
