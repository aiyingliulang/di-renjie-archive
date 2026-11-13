'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const box = { window: {} };
vm.createContext(box);
for (const file of ['episodes.js', 'v2/archive-data.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), box);
}
const d = box.window.ARCHIVE;
const people = new Map(d.people.map(p => [p.id, p]));
const cases = new Map(d.cases.map(c => [c.id, c]));
const ledger = JSON.parse(fs.readFileSync(path.join(root, 'content/cast-review.json')));
const person = id => people.get(d.personAliases[id] || id);
assert.equal(people.size, 188);
assert.equal(people.size, d.people.length);
assert.equal(cases.size, 10);
assert.equal(d.volumes.length, 4);
assert.equal(ledger.originalEntries.length, 62);
for (const entry of ledger.originalEntries) assert(person(entry.id), entry.id);
for (const p of people.values()) {
  assert((p.text.match(/\p{Script=Han}/gu) || []).length >= 100, `${p.id}: 简介不足100汉字`);
  assert(p.role && p.spoiler && p.faction && p.cases.length, p.id);
  assert.equal(new Set(p.cases).size, p.cases.length, p.id);
  assert(p.reviewSources.some(url => /baike.baidu.com/.test(url)), p.id);
  assert(p.reviewSources.some(url => /zh.wikipedia.org/.test(url)), p.id);
  for (const url of p.reviewSources) assert.equal(new URL(url).protocol, 'https:');
  for (const cid of p.cases) assert(cases.get(cid)?.people.includes(p.id), `${p.id} → ${cid}`);
  if (p.photo) {
    assert(fs.existsSync(path.join(root, 'v2', p.photo)), p.photo);
    if (p.photoSourceStatus === 'pending') {
      assert(!p.photoSource, `${p.id}: 待核实图不应伪称出处已确认`);
      assert(p.photoSourceNote, p.id);
    } else assert(p.photoSource, `${p.id}: 缺图片出处`);
  }
}
for (const c of cases.values()) {
  assert.equal(new Set(c.people).size, c.people.length, c.id);
  for (const pid of c.people) assert(people.get(pid)?.cases.includes(c.id), `${c.id} → ${pid}`);
  for (const image of [c.cover, ...c.gallery]) assert(fs.existsSync(path.join(root, 'v2', image.path)), image.path);
}
assert.equal(person('gaorujin').id, 'jianxiaolang');
assert.equal(person('liuer').id, 'jili');
assert.equal(person('liujin').id, 'fangqian');
assert(!people.has('gaorujin'));
assert.equal(person('wulezhi').role, '贺鲁麾下驭风者首领');
assert.equal(person('chachi').role, '月氏国王');
assert(person('wulezhi').cases.includes('gold'));
assert(person('wangqiang').text.includes('弟弟'));
assert(person('liaowenqing').text.includes('副将'));
assert.equal(person('linyongzhong').role, '江州长史');
assert.equal(person('heyun').actor, '夏志平');
assert(person('heyun').text.includes('男性'));
assert(person('wuyoude').spoiler.includes('南山'));
assert.equal(d.people.filter(p => p.photoSourceStatus === 'pending').length, 0);
const imageReview = JSON.parse(fs.readFileSync(path.join(root, 'content/image-review-002.json')));
const crypto = require('node:crypto');
assert.equal(imageReview.images.filter(x => x.action === 'replace').length, 27);
assert.equal(imageReview.images.filter(x => x.action === 'add').length, 102);
assert.equal(imageReview.unresolved.length, 29);
assert.deepEqual(imageReview.unresolved.map(x => x.id).sort(), [...people.values()].filter(p => !p.photo).map(p => p.id).sort());
for (const entry of imageReview.images) {
  const p = people.get(entry.id);
  assert.equal(p.photo, entry.local);
  assert.equal(p.photoSource, entry.source);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'v2', entry.local))).digest('hex'), entry.sha256);
  assert(!/image.baidu.com|search|placeholder/.test(entry.imageUrl));
}
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, imageReview.sponsor.local))).digest('hex'), imageReview.sponsor.sha256);
assert(!fs.readFileSync(path.join(root, 'v2/edition.js'), 'utf8').includes('图片出处待确认'));
assert.equal(d.contentReview.originalSearchImageSources, 32);
assert(!JSON.stringify(d).includes('image.baidu.com/search'));
for (const entry of ['index.html', 'v2/index.html']) {
  const html = fs.readFileSync(path.join(root, entry), 'utf8');
  for (const [, src] of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css|svg))"/g)) {
    assert(fs.existsSync(path.resolve(root, path.dirname(entry), src)), `${entry}: ${src}`);
  }
  assert(!html.includes('portrait-supplement.js'));
  assert(!html.includes('portrait-corrections-20261112.js'));
}
console.log('PASS: 188 people; 127 added; 62 original IDs preserved; every biography ≥100 Han characters; 10 cases and reciprocal links; 27 portraits replaced; 102 added; 29 documented gaps; image hashes, sponsor and both entries valid.');
