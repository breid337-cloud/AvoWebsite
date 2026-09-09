#!/usr/bin/env node
/**
 * Turn the SEO crawl into the search-visibility report page.
 *
 *   node tools/seo-crawl.mjs      # crawl (machine-collected)
 *   node tools/seo-report.mjs     # render
 *
 * Two kinds of evidence go into this page and they are not equally solid, so
 * the page says which is which:
 *
 *   - The crawl is machine-collected and repeatable. It comes from seo-crawl.json.
 *   - The rankings in RANKS below were read by hand off Google on the date in
 *     CHECKED. Google personalises and localises results, so these are one
 *     reading from one machine, not a rank-tracking service. They are recorded
 *     here rather than dressed up as something more precise.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const crawl = JSON.parse(readFileSync(join(HERE, 'seo-crawl.json'), 'utf8'));

const CHECKED = '2026-09-09';

/** Hand-read from google.co.uk, logged out, one reading each. */
const RANKS = [
  { site: 'jackson', q: 'stonemason winchcombe', organic: 1, pack: 2,
    note: 'Top blue link, and second in the map pack — but below an ad, a directory carousel and four map results.' },
  { site: 'jackson', q: 'stonemason cheltenham', organic: 7, pack: null,
    note: 'Page one, bottom half. Not in the map pack at all for the bigger town.' },
  { site: 'jackson', q: 'dry stone walling cheltenham', organic: null, pack: null,
    note: 'Not in the top ten, despite a dedicated page for it.' },
  { site: 'jackson', q: 'stone fireplace cheltenham', organic: null, pack: null,
    note: 'Not in the top ten. This is the work Charlie most wants to sell.' },
  { site: 'jackson', q: 'lime repointing gloucestershire', organic: null, pack: null,
    note: "Not in the top ten. Elliot's specialism, and a dedicated page exists." },
  { site: 'k9', q: 'dog walker basingstoke', organic: null, pack: null,
    note: 'Not in the top ten, and not mentioned anywhere on the results page.' },
  { site: 'k9', q: 'dog walking basingstoke', organic: null, pack: null,
    note: 'Same again. These two are the whole market for this business.' },
  { site: 'k9', q: 'basingstoke k9 companions', organic: 1, pack: null,
    note: 'Wins its own name comfortably. The old Weebly site is still in the index alongside it.' },
];

/** Pages Google admits to having, read from a site: query on the same date. */
const INDEX = {
  jackson: { indexed: 1, note: 'Only the home page, and Google is still showing the OLD site’s title and description for it.' },
  k9: { indexed: 8, note: 'Home, both service pages, booking, contact and privacy are all in.' },
  avo: { indexed: 10, note: 'Everything in the sitemap is indexed.' },
};

/** What to do about it, hand-written, most valuable first. */
const ACTIONS = [
  {
    rank: 1, effort: 'An hour', impact: 'Unlocks 38 pages',
    title: 'Get Jackson’s into Google Search Console and submit the sitemap',
    body: 'Google has one page of this site indexed and is still serving the old GoDaddy site’s title and '
      + 'description for it. Everything built since — the fireplace pages, the project write-ups, the areas '
      + 'page — is invisible, which is exactly why the site ranks first for its own village and nowhere for '
      + 'the services. Nothing is wrong with the pages; Google has not been told they exist. '
      + '<b>We can do this without Charlie.</b> Search Console verifies by a meta tag or a file, both of which '
      + 'we control in the build — no GoDaddy access needed. Submit the sitemap, request indexing on the '
      + 'priority pages, and the rest follows on its own.',
  },
  {
    rank: 2, effort: 'A morning', impact: 'The main local ranking factor',
    title: 'Sort the Google Business Profiles',
    body: 'Jackson’s has a profile and it works — second in the map pack for "stonemason winchcombe", '
      + '5.0 from 7 reviews. Two things are off: the profile says it opens at 6am while the site says 8am, and '
      + 'Google reads that kind of mismatch as a reliability signal. K9’s profile is listed as '
      + '"Basingstoke K9 Companions" with no reviews showing, while the site calls the business "The K9 '
      + 'Companions" — the same naming split already flagged, and here it is costing real visibility. '
      + 'For a local trade the map pack matters more than the blue links, and this is where K9 is losing.',
  },
  {
    rank: 3, effort: 'An afternoon', impact: 'Recovers cut-off titles',
    title: 'Shorten Jackson’s page titles',
    body: 'Thirty-eight of the thirty-nine pages carry a title between 66 and 90 characters, against roughly 60 that '
      + 'Google shows. The pattern is <i>Topic | Keywords | Jackson’s Stonemasonry</i>, and it is the brand '
      + 'at the end that gets cut — along with the keywords in the middle on the longer ones. Dropping the '
      + 'third segment on inner pages buys back the room. Worth doing at the same time as the indexing work, '
      + 'so Google reads the improved version the first time it crawls.',
  },
  {
    rank: 4, effort: 'Minutes', impact: 'Fixes every site we build',
    title: 'Fix the missing alt attribute in the generator',
    body: 'The crawl found the dark-mode logo carrying no alt attribute at all on every AvoSolution page. '
      + 'The intent in <code>brandLogo()</code> is right — it passes an empty alt deliberately, because the '
      + 'light logo beside it already carries the name — but <code>attrs()</code> filters out empty strings, '
      + 'so the attribute never gets written. Decorative and absent are not the same thing: a screen reader '
      + 'reads the filename instead of skipping it. This is in the generator, so it affects every site built '
      + 'from it, and it is a one-line fix.',
  },
  {
    rank: 5, effort: 'An hour', impact: 'Two thin pages',
    title: 'Give AvoSolution’s About and Contact pages some substance',
    body: 'About runs to 137 words and Contact to 67. Both are below the point where a page has enough to '
      + 'rank for anything, and three pages carry meta descriptions under 55 characters where Google will '
      + 'happily use 150. Our own site, so nobody to ask.',
  },
  {
    rank: 6, effort: 'Ten minutes', impact: 'Housekeeping',
    title: 'Name the town on the two pages that never do',
    body: 'Jackson’s quote page and K9’s prices page never mention any town the business serves. People '
      + 'search for a service plus a place, and a page that never says the place cannot answer that search. '
      + 'A sentence each.',
  },
];

const data = {
  ranAt: crawl.ranAt, checked: CHECKED, ranks: RANKS, index: INDEX, actions: ACTIONS,
  sites: crawl.sites.map((s) => ({
    name: s.name, slug: s.slug, origin: s.origin,
    pagesInSitemap: s.pagesInSitemap, pagesRead: s.pagesRead,
    failed: s.failed.length, counts: s.counts,
    findings: s.findings,
  })),
};

const template = readFileSync(join(HERE, 'seo-report.template.html'), 'utf8');
const out = join(HERE, 'seo-report.html');
writeFileSync(out, template.replace('__DATA__', JSON.stringify(data, null, 2)));
console.log(`wrote ${out}`);
for (const s of data.sites) console.log(`  ${s.name}: ${s.pagesRead}/${s.pagesInSitemap} pages, ${s.findings.length} findings`);
