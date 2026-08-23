import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHtml, qs, qsa, attr, cleanText, rawText } from '../src/util/html.js';
import { slugify, titleCase, humanizeHeading, truncate, decodeEntities, squash } from '../src/util/text.js';
import { canonicalize, sameOrigin, absolutize, basename } from '../src/util/url.js';
import { parseColor, toHex, contrast, ensureContrast, ramp, vibrancy } from '../src/util/color.js';

test('html parser handles malformed real-world markup', () => {
  const doc = parseHtml(`<html><head><title>A &amp; B</title></head><body>
    <ul><li>one<li>two</ul><p>para one<p>para two
    <img src=x.png alt='no quotes ok'>
    <script>var a = '<div>fake</div>';</script></body></html>`);
  assert.equal(cleanText(qs(doc, 'title')), 'A & B');
  assert.equal(qsa(doc, 'li').length, 2, 'implicitly closed <li>');
  assert.equal(qsa(doc, 'p').length, 2, 'implicitly closed <p>');
  assert.equal(attr(qs(doc, 'img'), 'alt'), 'no quotes ok');
  assert.ok(!cleanText(qs(doc, 'body')).includes('fake'), 'script content excluded from text');
});

test('selector engine supports the forms the extractors use', () => {
  const doc = parseHtml(`<div id="a" class="x y"><span class="phone">1</span>
    <a href="mailto:z@z.com">m</a><a href="/svc">s</a></div><div class="x"><b>2</b></div>`);
  assert.equal(qsa(doc, '.x').length, 2);
  assert.equal(qsa(doc, '#a .phone').length, 1);
  assert.equal(qsa(doc, 'div > span.phone').length, 1);
  assert.equal(qsa(doc, 'a[href^=mailto]').length, 1);
  assert.equal(qsa(doc, 'a[href*=svc]').length, 1);
  assert.equal(qsa(doc, '.x, b').length, 3);
});

test('rawText reads script bodies that textOf deliberately skips', () => {
  const doc = parseHtml('<script type="application/ld+json">{"a":1}</script>');
  assert.equal(JSON.parse(rawText(qs(doc, 'script'))).a, 1);
});

test('text helpers preserve acronyms but not English words', () => {
  assert.equal(humanizeHeading('AC REPAIR'), 'AC Repair');
  assert.equal(titleCase('joe’s hvac llc'), 'Joe’s HVAC LLC');
  assert.equal(titleCase('contact us today'), 'Contact Us Today', '"us" must not become "US"');
  assert.equal(titleCase('how it works'), 'How It Works', '"it" must not become "IT"');
  assert.equal(titleCase('o’brien roofing'), 'O’Brien Roofing');
  assert.equal(titleCase('mcdonald plumbing'), 'McDonald Plumbing');
});

test('slugify and truncate', () => {
  assert.equal(slugify('AC Repair & Install!'), 'ac-repair-and-install');
  assert.equal(slugify('Café Málaga'), 'cafe-malaga');
  assert.equal(slugify(''), 'item');
  assert.ok(truncate('a '.repeat(200), 40).length <= 41);
});

test('entity decoding', () => {
  assert.equal(decodeEntities('Joe&rsquo;s &amp; Sons&nbsp;&#8212; HVAC'), 'Joe’s & Sons — HVAC');
});

test('url helpers', () => {
  assert.equal(canonicalize('https://e.com/a/?utm_source=x&b=1#f'), 'https://e.com/a?b=1');
  assert.equal(canonicalize('https://e.com/svc/'), 'https://e.com/svc');
  assert.ok(sameOrigin('https://www.e.com/a', 'https://e.com/b'));
  assert.equal(absolutize('javascript:void(0)', 'https://e.com'), null);
  assert.equal(absolutize('/x', 'https://e.com/a/b'), 'https://e.com/x');
  assert.equal(basename('https://e.com/i/logo%20big.png'), 'logo big.png');
});

test('colour parsing and contrast', () => {
  assert.deepEqual(parseColor('rgb(37, 99, 235)'), { r: 37, g: 99, b: 235, a: 1 });
  assert.equal(toHex(parseColor('#25f')), '#2255ff');
  assert.ok(contrast('#ffffff', '#000000') > 20);
  assert.ok(vibrancy('#2563eb') > 0.5);
  assert.equal(vibrancy('#888888'), 0);
});

test('ensureContrast keeps hue but reaches the target ratio', () => {
  for (const [fg, bg] of [['#ffe600', '#ffffff'], ['#1f3a93', '#101317'], ['#cccccc', '#ffffff']]) {
    const fixed = ensureContrast(fg, bg, 4.5);
    assert.ok(contrast(fixed, bg) >= 4.49, `${fg} on ${bg} -> ${fixed} = ${contrast(fixed, bg).toFixed(2)}`);
  }
});

test('ramp produces a full tonal scale', () => {
  const r = ramp('#2563eb');
  assert.equal(Object.keys(r).length, 10);
  assert.ok(contrast(r[50], '#ffffff') < contrast(r[900], '#ffffff'));
});
