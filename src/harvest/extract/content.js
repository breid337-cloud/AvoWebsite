import { qs, qsa, attr, cleanText, classList } from '../../util/html.js';
import { squash, humanizeHeading, uniqueBy, wordCount, slugify } from '../../util/text.js';

const NAV_NOISE = /^(home|about|about us|contact|contact us|services|our services|gallery|blog|news|menu|search|login|log in|sign up|register|cart|checkout|privacy|terms|sitemap|faq|faqs|testimonials|reviews|careers|skip to content|read more|learn more|click here|back to top|next|previous)$/i;

const BOILERPLATE = /^(©|copyright|all rights reserved|powered by|designed by|website by|site by|privacy policy|terms of (use|service)|cookie|we use cookies|accept|subscribe|sign up for our newsletter)/i;

/** Strip nav, header, footer and obvious chrome so we look only at real content. */
export function mainContent(doc) {
  const explicit = qs(doc, 'main') || qs(doc, '[role=main]') || qs(doc, '#main') || qs(doc, '#content') || qs(doc, '.main-content') || qs(doc, '.entry-content') || qs(doc, 'article');
  return explicit || qs(doc, 'body') || doc;
}

const CHROME_CLASS = /\b(nav|navbar|menu|header|footer|sidebar|breadcrumb|cookie|banner|modal|popup)\b/;

/**
 * Is this node inside site chrome rather than page content?
 *
 * The walk deliberately stops at <body>. WordPress themes routinely put layout
 * hints in the body class — GeneratePress emits `nav-float-right`,
 * `header-aligned-left`, `right-sidebar` — and treating those as chrome markers
 * classifies every element on the page as navigation, which silently harvests
 * nothing at all.
 */
const isChrome = (node) => {
  let cur = node;
  while (cur && cur.tag !== 'body' && cur.tag !== 'html' && cur.type !== 'root') {
    if (['nav', 'header', 'footer', 'aside'].includes(cur.tag)) return true;
    const cls = classList(cur).join(' ').toLowerCase() + ' ' + (attr(cur, 'id') || '').toLowerCase();
    if (CHROME_CLASS.test(cls)) return true;
    cur = cur.parent;
  }
  return false;
};

export function extractHeadings(doc) {
  return qsa(mainContent(doc), 'h1, h2, h3, h4')
    .filter((h) => !isChrome(h))
    .map((h) => ({ level: Number(h.tag[1]), text: humanizeHeading(cleanText(h)) }))
    .filter((h) => h.text && !NAV_NOISE.test(h.text) && h.text.length < 140);
}

/** Substantial paragraphs of prose, in document order. */
export function extractParagraphs(doc, { minWords = 8 } = {}) {
  const out = [];
  for (const p of qsa(mainContent(doc), 'p, li')) {
    if (isChrome(p)) continue;
    const text = cleanText(p);
    if (!text || BOILERPLATE.test(text)) continue;
    if (wordCount(text) < minWords) continue;
    if (text.length > 1200) continue;
    out.push(text);
  }
  return uniqueBy(out, (t) => t.slice(0, 80).toLowerCase());
}

/**
 * Find groups of sibling elements that share a structural signature — the
 * generic shape of every "cards" grid (services, features, team, testimonials).
 */
export function findRepeatedBlocks(root, { min = 3 } = {}) {
  const groups = [];
  const containers = qsa(root, 'div, ul, ol, section, tbody, tr');
  for (const container of containers) {
    const children = (container.children ?? []).filter((c) => c.type === 'element' && !['script', 'style', 'br', 'hr'].includes(c.tag));
    if (children.length < min) continue;
    const signature = (el) => `${el.tag}.${classList(el).slice(0, 2).sort().join('.')}`;
    const counts = new Map();
    for (const child of children) counts.set(signature(child), (counts.get(signature(child)) ?? 0) + 1);
    const [topSig, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (!topSig || topCount < min) continue;
    const items = children.filter((c) => signature(c) === topSig);
    // Every item must carry some text, otherwise it is a layout or icon strip.
    const texts = items.map((i) => cleanText(i));
    if (texts.filter((t) => t.length > 12).length < min) continue;
    groups.push({ container, items, signature: topSig, count: items.length });
  }
  // Prefer the deepest (most specific) grouping when containers nest.
  return groups
    .filter((g) => !groups.some((other) => other !== g && other.items.length >= g.items.length && contains(g.container, other.container)))
    .sort((a, b) => b.count - a.count);
}

function contains(ancestor, node) {
  let cur = node?.parent;
  while (cur) {
    if (cur === ancestor) return true;
    cur = cur.parent;
  }
  return false;
}

const headingIn = (el) => {
  const h = qs(el, 'h1, h2, h3, h4, h5, h6, strong, b, .title, .heading');
  return h ? humanizeHeading(cleanText(h)) : '';
};

/** Nearest preceding heading, used to label what a repeated block is about. */
function labelFor(group) {
  let cur = group.container;
  for (let hops = 0; cur && hops < 4; hops++) {
    const siblings = cur.parent?.children ?? [];
    const idx = siblings.indexOf(cur);
    for (let i = idx - 1; i >= 0; i--) {
      const sib = siblings[i];
      if (sib.type !== 'element') continue;
      if (/^h[1-6]$/.test(sib.tag)) return cleanText(sib).toLowerCase();
      const nested = qs(sib, 'h1, h2, h3');
      if (nested) return cleanText(nested).toLowerCase();
    }
    cur = cur.parent;
    hops++;
  }
  return '';
}

export function extractServices(doc, baseUrl) {
  const services = [];
  const root = mainContent(doc);

  for (const group of findRepeatedBlocks(root)) {
    const label = labelFor(group);
    const containerClass = (classList(group.container).join(' ') + ' ' + (attr(group.container, 'id') || '')).toLowerCase();
    const looksLikeServices = /service|offering|what we do|solution|treatment|specialt|product|package|program/.test(label + ' ' + containerClass);
    if (!looksLikeServices) continue;

    for (const item of group.items) {
      const name = headingIn(item);
      if (!name || NAV_NOISE.test(name) || name.length > 90) continue;
      const paragraph = qsa(item, 'p').map((p) => cleanText(p)).find((t) => t && t !== name);
      const link = qs(item, 'a');
      const img = qs(item, 'img');
      services.push({
        name,
        summary: paragraph ? squash(paragraph) : '',
        image: attr(img, 'src') || '',
        sourceUrl: attr(link, 'href') || '',
      });
    }
    if (services.length >= 3) break;
  }

  // Fall back to navigation links that live under a /services/ path.
  if (services.length < 2) {
    for (const a of qsa(doc, 'a')) {
      const href = attr(a, 'href') || '';
      // mailto:service@… and tel: links are not services.
      if (/^(mailto|tel|sms|javascript):/i.test(href.trim())) continue;
      if (!/service|treatment|what-we-do/i.test(href)) continue;
      const name = humanizeHeading(cleanText(a));
      if (!name || NAV_NOISE.test(name) || name.length > 70) continue;
      if (/@|^https?:/i.test(name)) continue;
      services.push({ name, summary: '', sourceUrl: href });
    }
  }

  return uniqueBy(services, (s) => slugify(s.name)).slice(0, 24);
}

export function extractTestimonials(doc) {
  const out = [];
  const seen = new Set();

  const push = (quote, author, source) => {
    const q = squash(quote).replace(/^["“”']+|["“”']+$/g, '');
    if (!q || q.length < 25 || q.length > 900) return;
    const key = q.slice(0, 60).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ quote: q, author: squash(author ?? '').replace(/^[-–—\s]+/, ''), source });
  };

  for (const el of qsa(doc, 'blockquote')) {
    const cite = qs(el, 'cite, footer, .author, .name');
    const citeText = cite ? cleanText(cite) : '';
    const quote = cleanText(el).replace(citeText, '').trim();
    push(quote, citeText, 'blockquote');
  }

  for (const el of qsa(doc, '[class*=testimonial], [class*=review], [class*=quote], [id*=testimonial]')) {
    if (qs(el, 'blockquote')) continue;
    const cite = qs(el, 'cite, .author, .name, .customer, footer, h4, h5, strong');
    const citeText = cite ? cleanText(cite) : '';
    let quote = cleanText(qs(el, 'p') ?? el);
    if (citeText && quote.includes(citeText)) quote = quote.replace(citeText, '').trim();
    push(quote, citeText, 'testimonial block');
  }

  return out.slice(0, 30);
}

export function extractFaqs(doc) {
  const out = [];
  const push = (question, answer) => {
    const q = squash(question);
    const a = squash(answer);
    if (!q || !a || q.length > 200 || a.length < 10) return;
    if (!/\?$/.test(q) && wordCount(q) > 14) return;
    if (a.length > 1500) return;
    out.push({ question: q, answer: a });
  };

  // Definition lists
  for (const dl of qsa(doc, 'dl')) {
    const children = (dl.children ?? []).filter((c) => c.type === 'element');
    for (let i = 0; i < children.length - 1; i++) {
      if (children[i].tag === 'dt' && children[i + 1]?.tag === 'dd') {
        push(cleanText(children[i]), cleanText(children[i + 1]));
      }
    }
  }

  // Heading-then-prose pairs where the heading is a question. <h2> is only
  // trusted on pages that announce themselves as FAQ pages, because elsewhere
  // an h2 question is usually a section header ("Why Choose Us?").
  const isFaqPage = /frequently asked|faqs?\b|common questions/i.test(cleanText(mainContent(doc)).slice(0, 4000));
  const faqSelector = isFaqPage
    ? 'h2, h3, h4, h5, summary, .question, [class*=accordion] [class*=title]'
    : 'h3, h4, h5, summary, .question, [class*=accordion] [class*=title]';
  for (const h of qsa(mainContent(doc), faqSelector)) {
    const question = cleanText(h);
    if (!/\?\s*$/.test(question)) continue;
    let answer = '';
    if (h.tag === 'summary') {
      answer = cleanText(h.parent).replace(question, '').trim();
    } else {
      const siblings = h.parent?.children ?? [];
      for (let i = siblings.indexOf(h) + 1; i < siblings.length; i++) {
        const sib = siblings[i];
        if (sib.type !== 'element') continue;
        if (/^h[1-6]$/.test(sib.tag)) break;
        const text = cleanText(sib);
        if (text) { answer = text; break; }
      }
    }
    push(question, answer);
  }

  return uniqueBy(out, (f) => f.question.toLowerCase()).slice(0, 25);
}

export function extractTeam(doc) {
  const out = [];
  for (const group of findRepeatedBlocks(mainContent(doc))) {
    const label = labelFor(group) + ' ' + classList(group.container).join(' ').toLowerCase();
    if (!/team|staff|our people|meet|doctors|attorneys|agents|stylists|technicians/.test(label)) continue;
    for (const item of group.items) {
      const name = headingIn(item);
      if (!name || name.length > 60 || NAV_NOISE.test(name)) continue;
      const paragraphs = qsa(item, 'p').map((p) => cleanText(p)).filter(Boolean);
      out.push({
        name,
        role: paragraphs[0] && wordCount(paragraphs[0]) <= 8 ? paragraphs[0] : '',
        bio: paragraphs.find((t) => wordCount(t) > 8) ?? '',
        photo: attr(qs(item, 'img'), 'src') || '',
      });
    }
    if (out.length) break;
  }
  return uniqueBy(out, (m) => m.name.toLowerCase()).slice(0, 20);
}

/** The site's own navigation, useful for deciding which pages to rebuild. */
export function extractNav(doc, baseUrl) {
  const nav = qs(doc, 'nav') || qs(doc, '[role=navigation]') || qs(doc, '.nav, .navbar, .menu, #menu, .main-menu');
  if (!nav) return [];
  return uniqueBy(
    qsa(nav, 'a')
      .map((a) => ({ label: squash(cleanText(a)), href: attr(a, 'href') || '' }))
      .filter((l) => l.label && l.href && l.label.length < 40),
    (l) => l.label.toLowerCase(),
  ).slice(0, 20);
}
