#!/usr/bin/env node
/**
 * Turn the last health scan into the report page.
 *
 *   node tools/health-scan.mjs --lighthouse   # measure
 *   node tools/health-scan-report.mjs         # render
 *
 * The scan reports facts. This adds the one thing a scan cannot: why a number
 * is what it is, and what to do about it. Those notes live in NOTES below,
 * keyed by "site :: substring of the issue text", and are written by hand —
 * so if a note is stale, it is stale because nobody revisited it, not because
 * the tool guessed.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const scan = JSON.parse(readFileSync(join(HERE, 'health-scan.json'), 'utf8'));

/** Hand-written diagnosis, attached to any issue whose text contains the key. */
const NOTES = [
  {
    at: 'Basingstoke K9 Companions',
    match: 'Performance',
    html: 'K9 is the only site in the estate whose score will not sit still. Three scans on the '
      + 'same evening, against an unchanged site, medianed 88, then 100, then 99 — and the '
      + 'five-run scan ranged 12 points end to end. '
      + '<b>Nothing has regressed.</b> But a number that moves that far is not one to quote to '
      + 'anyone. There is a structural reason it can swing: on the slow run, first paint and '
      + 'largest paint landed at the same moment with no blocking script and no layout shift, '
      + 'meaning nothing on the page was slow — the page simply started late. Fraunces and Inter '
      + 'are still fetched from Google, so the browser must reach two further origins before it '
      + 'can draw anything, and how long that takes varies from run to run. Self-hosting them is '
      + 'exactly what took Jackson\'s from 61 into the high nineties, and K9 never had it applied. '
      + 'Treat that as a recommendation, not a diagnosis: it removes the variable, and the honest '
      + 'test is whether the spread closes afterwards. '
      + 'Nothing has been changed — no site is touched without you saying so.',
  },
];

/** At most one hand-written note per site, so a long diagnosis is not repeated. */
const used = new Set();
const annotate = (issue) => {
  const n = NOTES.find((x) => x.at === issue.at && issue.what.includes(x.match) && !used.has(x));
  if (!n) return issue;
  used.add(n);
  return { ...issue, detail: n.html };
};

/**
 * The on-page crawl rides along in this report rather than having one of its
 * own: it answers the same weekly question, just about the pages instead of
 * the plumbing. It is collected separately (tools/seo-crawl.mjs) so a slow
 * crawl can never delay or break the health scan.
 */
const CRAWL = join(HERE, 'seo-crawl.json');
const crawl = existsSync(CRAWL) ? JSON.parse(readFileSync(CRAWL, 'utf8')) : null;

/**
 * Only the severe on-page findings reach the verdict at the top. A truncated
 * title is worth listing; it is not worth colouring the whole week amber. The
 * severe ones — two pages fighting over a title, a canonical pointing
 * somewhere else, a page nothing links to — are rare and always mean something.
 */
function crawlIssues(c) {
  if (!c) return [];
  const out = [];
  for (const site of c.sites) {
    for (const f of site.findings.filter((x) => x.level === 'high')) {
      out.push({ level: 'attention', at: site.name, what: f.what });
    }
  }
  return out;
}

const staleDays = crawl
  ? Math.round((new Date(scan.ranAt) - new Date(crawl.ranAt)) / 86400000)
  : null;

const data = {
  ...scan,
  issues: [...scan.issues, ...crawlIssues(crawl)].map(annotate),
  crawl: crawl && {
    ranAt: crawl.ranAt,
    stale: staleDays !== null && staleDays >= 2,
    staleDays,
    sites: crawl.sites.map((s) => ({
      name: s.name, pagesRead: s.pagesRead, pagesInSitemap: s.pagesInSitemap,
      findings: s.findings,
    })),
  },
};

const template = readFileSync(join(HERE, 'health-scan-report.template.html'), 'utf8');
const out = join(HERE, 'health-scan-report.html');
writeFileSync(out, template.replace('__DATA__', JSON.stringify(data, null, 2)));

const counts = data.issues.reduce((m, i) => ({ ...m, [i.level]: (m[i.level] || 0) + 1 }), {});
console.log(`wrote ${out}`);
console.log(`scan of ${data.ranAt} — ${JSON.stringify(counts)}`);
