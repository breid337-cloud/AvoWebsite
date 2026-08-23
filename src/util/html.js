import { decodeEntities, squash } from './text.js';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);
const BLOCK = new Set(['address', 'article', 'aside', 'blockquote', 'br', 'details', 'dd', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'section', 'table', 'td', 'th', 'tr', 'ul']);
const NON_TEXT = new Set(['script', 'style', 'noscript', 'template', 'svg', 'iframe']);

// Tags that implicitly close a currently-open tag when encountered.
const IMPLICIT_CLOSE = {
  li: new Set(['li']),
  dt: new Set(['dt', 'dd']),
  dd: new Set(['dt', 'dd']),
  option: new Set(['option']),
  optgroup: new Set(['option', 'optgroup']),
  tr: new Set(['td', 'th', 'tr']),
  td: new Set(['td', 'th']),
  th: new Set(['td', 'th']),
  thead: new Set(['td', 'th', 'tr']),
  tbody: new Set(['td', 'th', 'tr', 'thead']),
  tfoot: new Set(['td', 'th', 'tr', 'tbody']),
};

const element = (tag, attrs, parent) => ({ type: 'element', tag, attrs, children: [], parent });

/**
 * Tolerant HTML parser. Returns a root node; never throws on malformed markup,
 * which matters because the sites we harvest are, by definition, not well built.
 */
export function parseHtml(html = '') {
  const root = { type: 'root', tag: '#root', attrs: {}, children: [], parent: null };
  let current = root;
  const stack = [root];
  let i = 0;
  const src = String(html);

  const addText = (raw) => {
    if (!raw) return;
    const value = decodeEntities(raw);
    if (!value.trim() && !/[ \n\t]/.test(raw)) return;
    current.children.push({ type: 'text', value, parent: current });
  };

  const openTagOf = (tag) => {
    for (let s = stack.length - 1; s > 0; s--) if (stack[s].tag === tag) return s;
    return -1;
  };

  const closeTo = (index) => {
    while (stack.length > index) stack.pop();
    current = stack[stack.length - 1];
  };

  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt === -1) { addText(src.slice(i)); break; }
    if (lt > i) addText(src.slice(i, lt));

    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt + 4);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    if (src.startsWith('<!', lt) || src.startsWith('<?', lt)) {
      const end = src.indexOf('>', lt);
      i = end === -1 ? src.length : end + 1;
      continue;
    }

    // Closing tag
    if (src[lt + 1] === '/') {
      const end = src.indexOf('>', lt);
      if (end === -1) { i = src.length; break; }
      const tag = src.slice(lt + 2, end).trim().toLowerCase().split(/[\s/]/)[0];
      const at = openTagOf(tag);
      if (at !== -1) closeTo(at);
      i = end + 1;
      continue;
    }

    // Opening tag — scan attributes so that `>` inside a quoted value is not mistaken for the end.
    const parsed = parseOpenTag(src, lt);
    if (!parsed) { addText(src.slice(lt, lt + 1)); i = lt + 1; continue; }
    const { tag, attrs, selfClosing, end } = parsed;
    i = end;

    const closes = IMPLICIT_CLOSE[tag];
    if (closes && closes.has(current.tag)) closeTo(stack.length - 1);
    if (BLOCK.has(tag) && current.tag === 'p' && tag !== 'p') closeTo(stack.length - 1);
    else if (tag === 'p' && current.tag === 'p') closeTo(stack.length - 1);

    const node = element(tag, attrs, current);
    current.children.push(node);

    if (VOID.has(tag) || selfClosing) continue;

    if (RAW_TEXT.has(tag)) {
      const closeIdx = findRawClose(src, tag, i);
      const raw = src.slice(i, closeIdx.content);
      if (raw) node.children.push({ type: 'text', value: tag === 'title' ? decodeEntities(raw) : raw, parent: node });
      i = closeIdx.next;
      continue;
    }

    stack.push(node);
    current = node;
  }

  return root;
}

function parseOpenTag(src, start) {
  const nameMatch = /^<([a-zA-Z][a-zA-Z0-9:-]*)/.exec(src.slice(start, start + 64));
  if (!nameMatch) return null;
  const tag = nameMatch[1].toLowerCase();
  let i = start + nameMatch[0].length;
  const attrs = {};
  let selfClosing = false;

  while (i < src.length) {
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src[i] === '>') { i++; break; }
    if (src[i] === '/' && src[i + 1] === '>') { selfClosing = true; i += 2; break; }
    if (i >= src.length) break;

    const nameStart = i;
    while (i < src.length && !/[\s=>/]/.test(src[i])) i++;
    if (i === nameStart) { i++; continue; }
    const name = src.slice(nameStart, i).toLowerCase();

    while (i < src.length && /\s/.test(src[i])) i++;
    let value = '';
    if (src[i] === '=') {
      i++;
      while (i < src.length && /\s/.test(src[i])) i++;
      const quote = src[i];
      if (quote === '"' || quote === "'") {
        const end = src.indexOf(quote, i + 1);
        value = end === -1 ? src.slice(i + 1) : src.slice(i + 1, end);
        i = end === -1 ? src.length : end + 1;
      } else {
        const vStart = i;
        while (i < src.length && !/[\s>]/.test(src[i])) i++;
        value = src.slice(vStart, i);
      }
    } else {
      value = name;
    }
    attrs[name] = decodeEntities(value);
  }

  return { tag, attrs, selfClosing, end: i };
}

function findRawClose(src, tag, from) {
  const re = new RegExp(`</${tag}\\s*>`, 'i');
  const rest = src.slice(from);
  const m = re.exec(rest);
  if (!m) return { content: src.length, next: src.length };
  return { content: from + m.index, next: from + m.index + m[0].length };
}

/* ── Tree access ─────────────────────────────────────────────────────── */

export function attr(node, name) {
  return node?.attrs?.[name.toLowerCase()] ?? null;
}

export function classList(node) {
  return (attr(node, 'class') || '').split(/\s+/).filter(Boolean);
}

/** Visible text content, with block-level boundaries turned into spaces. */
export function textOf(node, { block = true } = {}) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  if (node.type === 'element' && NON_TEXT.has(node.tag)) return '';
  let out = '';
  for (const child of node.children ?? []) {
    const piece = textOf(child, { block });
    if (!piece) continue;
    if (block && child.type === 'element' && BLOCK.has(child.tag)) out += ` ${piece} `;
    else out += piece;
  }
  return out;
}

/**
 * Raw concatenated text children, ignoring the "not visible text" rule.
 * This is how you read <script> and <style> bodies.
 */
export function rawText(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  return (node.children ?? []).map(rawText).join('');
}

/** Squashed visible text — the form almost every extractor wants. */
export const cleanText = (node) => squash(textOf(node));

export function* walkNodes(node) {
  yield node;
  for (const child of node.children ?? []) yield* walkNodes(child);
}

export function findAll(root, predicate) {
  const out = [];
  for (const node of walkNodes(root)) {
    if (node.type === 'element' && predicate(node)) out.push(node);
  }
  return out;
}

export const findOne = (root, predicate) => findAll(root, predicate)[0] ?? null;

export const byTag = (root, ...tags) => {
  const set = new Set(tags.map((t) => t.toLowerCase()));
  return findAll(root, (n) => set.has(n.tag));
};

/* ── Mini selector engine ────────────────────────────────────────────── */

/**
 * Supports: `tag`, `.class`, `#id`, `[attr]`, `[attr=v]`, `[attr*=v]`, `[attr^=v]`,
 * `[attr$=v]`, descendant (space) and child (`>`) combinators, and comma groups.
 */
export function qsa(root, selector) {
  const groups = String(selector).split(',').map((s) => s.trim()).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const group of groups) {
    for (const node of matchGroup(root, group)) {
      if (seen.has(node)) continue;
      seen.add(node);
      out.push(node);
    }
  }
  return out;
}

export const qs = (root, selector) => qsa(root, selector)[0] ?? null;

function matchGroup(root, group) {
  const parts = group.split(/\s+/).filter(Boolean);
  const steps = [];
  for (const part of parts) {
    if (part === '>') { steps[steps.length - 1] && (steps[steps.length - 1].child = true); continue; }
    if (part.startsWith('>')) {
      steps.push({ compound: compile(part.slice(1)), child: false, prevChild: true });
      continue;
    }
    steps.push({ compound: compile(part), child: false });
  }
  // Normalise the `a > b` form into a flag on the following step.
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].child && steps[i + 1]) steps[i + 1].directChild = true;
  }

  let candidates = [root];
  steps.forEach((step, idx) => {
    const next = [];
    const direct = step.directChild || step.prevChild;
    for (const parent of candidates) {
      const pool = direct ? (parent.children ?? []).filter((c) => c.type === 'element') : descendants(parent);
      for (const node of pool) if (step.compound(node)) next.push(node);
    }
    candidates = idx === 0 && root.type === 'element' && step.compound(root) && !direct ? [root, ...next] : next;
  });
  return candidates.filter((n) => n.type === 'element');
}

function descendants(node) {
  const out = [];
  const stack = [...(node.children ?? [])];
  while (stack.length) {
    const n = stack.shift();
    if (n.type === 'element') { out.push(n); stack.unshift(...(n.children ?? [])); }
  }
  return out;
}

function compile(compound) {
  const tests = [];
  const re = /([#.]?[a-zA-Z0-9_*-]+|\[[^\]]+\])/g;
  let m;
  while ((m = re.exec(compound))) {
    const token = m[1];
    if (token.startsWith('#')) {
      const id = token.slice(1);
      tests.push((n) => attr(n, 'id') === id);
    } else if (token.startsWith('.')) {
      const cls = token.slice(1);
      tests.push((n) => classList(n).includes(cls));
    } else if (token.startsWith('[')) {
      tests.push(attrTest(token.slice(1, -1)));
    } else if (token !== '*') {
      const tag = token.toLowerCase();
      tests.push((n) => n.tag === tag);
    }
  }
  return (node) => node.type === 'element' && tests.every((t) => t(node));
}

function attrTest(body) {
  const m = /^([a-zA-Z0-9_:-]+)\s*(?:([*^$~|]?)=\s*(.*))?$/.exec(body.trim());
  if (!m) return () => false;
  const [, name, op, rawValue] = m;
  if (rawValue === undefined) return (n) => attr(n, name) !== null;
  const value = rawValue.trim().replace(/^["']|["']$/g, '').toLowerCase();
  return (n) => {
    const actual = (attr(n, name) ?? '').toLowerCase();
    if (attr(n, name) === null) return false;
    switch (op) {
      case '*': return actual.includes(value);
      case '^': return actual.startsWith(value);
      case '$': return actual.endsWith(value);
      case '~': return actual.split(/\s+/).includes(value);
      default: return actual === value;
    }
  };
}

/** Serialise a node back to HTML (used for debugging and content snippets). */
export function serialize(node) {
  if (node.type === 'text') return node.value;
  if (node.type === 'root') return (node.children ?? []).map(serialize).join('');
  const attrs = Object.entries(node.attrs ?? {})
    .map(([k, v]) => (v === k ? ` ${k}` : ` ${k}="${String(v).replace(/"/g, '&quot;')}"`))
    .join('');
  if (VOID.has(node.tag)) return `<${node.tag}${attrs}>`;
  return `<${node.tag}${attrs}>${(node.children ?? []).map(serialize).join('')}</${node.tag}>`;
}
