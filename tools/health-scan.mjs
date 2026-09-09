#!/usr/bin/env node
/**
 * Weekly health scan across the client estate.
 *
 * Read-only by design: it fetches, measures and compares against the previous
 * run. It never deploys, never edits a client repo, and never touches DNS.
 * Anything it finds is reported for a human to decide on.
 *
 *   node tools/health-scan.mjs              # scan, compare, write results
 *   node tools/health-scan.mjs --lighthouse # also run Lighthouse (slow)
 *
 * Results are written to tools/health-scan.json, which is also the baseline
 * for the next run — that is how "changed since last week" is detected.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import tls from 'node:tls';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS = join(HERE, 'health-scan.json');

/** The estate. Domains only — no site ids, so this is safe in a public repo. */
const SITES = [
  { name: "Jackson's Stonemasonry", domain: 'jacksonstonemasonry.com', sitemap: '/sitemap.xml' },
  { name: 'Basingstoke K9 Companions', domain: 'basingstokek9companions.co.uk', sitemap: '/sitemap-0.xml' },
  { name: 'AvoSolution', domain: 'avosolution.co.uk', sitemap: '/sitemap.xml' },
];

/** Old sites we expect to still redirect, and want to know about if they stop. */
const REDIRECTS = [
  { from: 'basingstokek9companions.weebly.com', to: 'basingstokek9companions.co.uk', note: 'Weebly signpost' },
  { from: 'www.jacksonstonemasonry.com', to: 'jacksonstonemasonry.com', note: 'www' },
  { from: 'bk9c.co.uk', to: 'basingstokek9companions.co.uk', note: 'short domain' },
];

const CERT_WARN_DAYS = 21;      // Let's Encrypt renews at 30; below this is odd
const LH_FLOOR = 90;            // flag a category that drops under this
const LH_DROP = 8;              // or that falls this far since last week
const LH_SPREAD = 8;            // a run-to-run range this wide makes the median soft

const timeout = (ms) => AbortSignal.timeout(ms);

async function head(url) {
  const started = Date.now();
  try {
    const r = await fetch(url, { redirect: 'manual', signal: timeout(20000) });
    return { status: r.status, location: r.headers.get('location'), ms: Date.now() - started };
  } catch (e) {
    return { status: 0, error: String(e.message || e).slice(0, 80), ms: Date.now() - started };
  }
}

async function text(url) {
  try {
    const r = await fetch(url, { signal: timeout(25000) });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

/** Certificate expiry straight off the TLS handshake — no API token needed. */
function certDaysLeft(host) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: 15000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert || !cert.valid_to) return resolve(null);
      resolve({
        days: Math.round((new Date(cert.valid_to) - Date.now()) / 86400000),
        expires: new Date(cert.valid_to).toISOString().slice(0, 10),
        issuer: (cert.issuer && (cert.issuer.O || cert.issuer.CN)) || '',
      });
    });
    socket.on('error', () => resolve(null));
    socket.on('timeout', () => { socket.destroy(); resolve(null); });
  });
}

async function dnsA(host) {
  try {
    const r = await fetch(`https://dns.google/resolve?name=${host}&type=A`, { signal: timeout(15000) });
    const j = await r.json();
    return (j.Answer || []).filter((a) => a.type === 1).map((a) => a.data).sort();
  } catch { return []; }
}

const REPO = join(HERE, '..');
const LH_CLI = join(REPO, 'node_modules', 'lighthouse', 'cli', 'index.js');

/**
 * Install Lighthouse once, without touching package.json — the same
 * --no-save convention this repo already uses for sharp. Resolving it through
 * npx on every run was what made two runs in three fail.
 */
function ensureLighthouse() {
  if (existsSync(LH_CLI)) return true;
  try {
    execFileSync('npm', ['install', 'lighthouse', '--no-save', '--no-audit', '--no-fund'],
      { cwd: REPO, stdio: 'ignore', timeout: 300000, shell: true });
  } catch { /* fall through to the existsSync check */ }
  return existsSync(LH_CLI);
}

let lhRun = 0;
function lighthouseOnce(url) {
  const out = join(HERE, `.lh-tmp-${++lhRun}.json`);
  try {
    execFileSync(process.execPath, [LH_CLI, url,
      '--only-categories=performance,accessibility,best-practices,seo',
      '--form-factor=mobile', '--screenEmulation.mobile', '--quiet',
      '--output=json', `--output-path=${out}`,
      '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
    ], { stdio: 'ignore', timeout: 240000 });
  } catch { /* the exit code is not the verdict — see below */ }
  // On Windows chrome-launcher routinely fails to delete its own temp profile
  // and exits non-zero *after* a perfectly good audit. Treating that exit code
  // as failure is what made two runs in three disappear. The report is the
  // verdict: if it parsed, the audit happened.
  try {
    const j = JSON.parse(readFileSync(out, 'utf8'));
    const s = (k) => Math.round(j.categories[k].score * 100);
    return {
      performance: s('performance'), accessibility: s('accessibility'),
      bestPractices: s('best-practices'), seo: s('seo'),
      lcp: Math.round(j.audits['largest-contentful-paint'].numericValue) / 1000,
    };
  } catch { return null; }
  finally { try { rmSync(out, { force: true }); } catch {} }
}

/**
 * A single Lighthouse run is not evidence. The same page has measured 80 and
 * 99 minutes apart on this machine, depending on cache and network. K9 then
 * spread 11 points across three runs in one evening, which medianed to 88 once
 * and 100 the next time — so three is not enough either. Five runs, a median,
 * and the spread published alongside it, so a wobbly number cannot pass itself
 * off as a firm one.
 */
function lighthouse(url, runs = 5) {
  const got = [];
  for (let i = 0; i < runs; i++) {
    const r = lighthouseOnce(url);
    if (r) got.push(r);
  }
  if (!got.length) return null;
  const median = (nums) => nums.slice().sort((a, b) => a - b)[Math.floor(nums.length / 2)];
  const pick = (k) => median(got.map((r) => r[k]));
  return {
    performance: pick('performance'), accessibility: pick('accessibility'),
    bestPractices: pick('bestPractices'), seo: pick('seo'),
    lcp: Math.round(median(got.map((r) => r.lcp)) * 100) / 100,
    samples: got.length, runs,
    spread: Math.max(...got.map((r) => r.performance)) - Math.min(...got.map((r) => r.performance)),
  };
}

async function scanSite(site, withLighthouse) {
  const base = `https://${site.domain}`;
  const [home, cert, a, sitemapXml] = await Promise.all([
    head(base + '/'), certDaysLeft(site.domain), dnsA(site.domain), text(base + site.sitemap),
  ]);
  const pages = sitemapXml ? (sitemapXml.match(/<loc>/g) || []).length : null;
  return {
    name: site.name, domain: site.domain,
    status: home.status, responseMs: home.ms,
    cert, dns: a, pages,
    lighthouse: withLighthouse ? lighthouse(base + '/') : null,
  };
}

/** Compare this run with the last one and decide what a human should look at. */
function findIssues(now, before) {
  const issues = [];
  const prev = (domain) => (before?.sites || []).find((s) => s.domain === domain);

  for (const s of now.sites) {
    const p = prev(s.domain);
    const at = s.name;

    if (s.status !== 200) {
      issues.push({ level: 'urgent', at, what: `Home page returned ${s.status || 'no response'}` });
    }
    if (!s.cert) {
      issues.push({ level: 'urgent', at, what: 'Could not read the TLS certificate' });
    } else if (s.cert.days < CERT_WARN_DAYS) {
      issues.push({ level: 'urgent', at, what: `Certificate expires in ${s.cert.days} days (${s.cert.expires}) and has not renewed` });
    }
    if (!s.dns.length) {
      issues.push({ level: 'urgent', at, what: 'No A record resolves for the domain' });
    } else if (p && p.dns.length && p.dns.join() !== s.dns.join()) {
      issues.push({ level: 'attention', at, what: `DNS changed: ${p.dns.join(', ')} → ${s.dns.join(', ')}` });
    }
    if (s.pages === null) {
      issues.push({ level: 'attention', at, what: 'Sitemap could not be read' });
    } else if (p && p.pages && s.pages < p.pages) {
      issues.push({ level: 'attention', at, what: `Pages dropped from ${p.pages} to ${s.pages}` });
    } else if (p && p.pages && s.pages > p.pages) {
      issues.push({ level: 'note', at, what: `Pages went up from ${p.pages} to ${s.pages}` });
    }
    if (now.lighthouse && !s.lighthouse) {
      // A scan that quietly stops measuring is worse than one that reports a problem.
      issues.push({ level: 'attention', at, what: 'Lighthouse did not complete — this site was not measured' });
    } else if (s.lighthouse && s.lighthouse.samples < 3) {
      // One sample is not a median, and today proved a single run can be 19
      // points out. Say so rather than presenting it as a measurement.
      issues.push({ level: 'note', at, what: `Only ${s.lighthouse.samples} of ${s.lighthouse.runs || 5} Lighthouse runs completed — treat the scores as indicative` });
    } else if (s.lighthouse) {
      // A wide spread means the median is a coin toss, and acting on it — or
      // quoting it to a client — would be acting on noise.
      if (s.lighthouse.spread >= LH_SPREAD) {
        issues.push({ level: 'note', at, what: `Performance ranged ${s.lighthouse.spread} points across ${s.lighthouse.samples} runs — the median below is soft` });
      }
      for (const [k, label] of [['performance', 'Performance'], ['accessibility', 'Accessibility'],
                                ['bestPractices', 'Best practices'], ['seo', 'SEO']]) {
        const v = s.lighthouse[k], was = p?.lighthouse?.[k];
        if (v < LH_FLOOR) issues.push({ level: 'attention', at, what: `${label} is ${v} (median of ${s.lighthouse.samples})` });
        else if (was && was - v >= LH_DROP) issues.push({ level: 'attention', at, what: `${label} fell ${was} → ${v}` });
        // Standing instruction: 100 is the bar, and anything short of it gets
        // said out loud. A note, not an alarm — 97 is not a problem, but it is
        // not 100 either, and quietly rounding that up is how a standard slips.
        else if (v < 100) issues.push({ level: 'note', at, what: `${label} is ${v}, not 100 (median of ${s.lighthouse.samples})` });
      }
    }
  }

  for (const r of now.redirects) {
    if (!r.ok) issues.push({ level: 'attention', at: r.from, what: `${r.note} no longer redirects to ${r.to} (status ${r.status || 'none'})` });
  }
  return issues;
}

const withLighthouse = process.argv.includes('--lighthouse') && ensureLighthouse();
if (process.argv.includes('--lighthouse') && !withLighthouse) {
  console.error('Lighthouse could not be installed; running the rest of the scan without it.');
}
const before = existsSync(RESULTS) ? JSON.parse(readFileSync(RESULTS, 'utf8')) : null;

const sites = [];
for (const s of SITES) sites.push(await scanSite(s, withLighthouse));

const redirects = [];
for (const r of REDIRECTS) {
  const h = await head(`https://${r.from}/`);
  const target = (h.location || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const server = h.status >= 300 && h.status < 400 && target.startsWith(r.to);
  // A signpost page redirects from inside the HTML, so it answers 200 rather
  // than 3xx. That is still a working redirect and must not read as a failure.
  let clientSide = false;
  if (!server && h.status === 200) {
    const body = await text(`https://${r.from}/`);
    clientSide = !!body && /http-equiv=["']refresh["']/i.test(body) && body.includes(r.to);
  }
  redirects.push({ ...r, status: h.status, to_actual: target,
    kind: server ? 'server' : clientSide ? 'in-page' : 'none',
    ok: server || clientSide });
}

const now = { ranAt: new Date().toISOString(), lighthouse: withLighthouse, sites, redirects };
now.issues = findIssues(now, before);
now.previousRun = before?.ranAt ?? null;

if (!existsSync(HERE)) mkdirSync(HERE, { recursive: true });
writeFileSync(RESULTS, JSON.stringify(now, null, 2));

const counts = now.issues.reduce((m, i) => ({ ...m, [i.level]: (m[i.level] || 0) + 1 }), {});
console.log(JSON.stringify({ ranAt: now.ranAt, counts, issues: now.issues }, null, 2));
