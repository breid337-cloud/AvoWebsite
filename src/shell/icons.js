/**
 * Inline SVG icon set. Inlined rather than icon-fonted so the generated sites
 * make zero external requests and the icons inherit currentColor.
 */
const S = (body, { stroke = true, viewBox = '0 0 24 24' } = {}) =>
  `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false"${
    stroke
      ? ' fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"'
      : ' fill="currentColor"'
  }>${body}</svg>`;

export const ICONS = {
  phone: S('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>'),
  mail: S('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>'),
  pin: S('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
  clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  arrow: S('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  check: S('<path d="m20 6-11 11-5-5"/>'),
  checkCircle: S('<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'),
  star: S('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1Z"/>', { stroke: false }),
  menu: S('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  close: S('<path d="M6 6l12 12M18 6 6 18"/>'),
  chevron: S('<path d="m6 9 6 6 6-6"/>'),
  quote: S('<path d="M9.5 5C6.5 6.6 5 9.2 5 12.9V19h6.2v-6.1H8.4c0-2.4.9-4 2.7-5L9.5 5Zm9 0C15.5 6.6 14 9.2 14 12.9V19h6.2v-6.1h-2.8c0-2.4.9-4 2.7-5L18.5 5Z"/>', { stroke: false }),
  shield: S('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>'),
  award: S('<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>'),
  users: S('<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>'),
  wrench: S('<path d="M14.7 6.3a4 4 0 0 0 5 5l-9 9a2.8 2.8 0 0 1-4-4l9-9Z"/><path d="M14.7 6.3 18 3l3 3-3.3 3.3"/>'),
  sparkle: S('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>'),
  calendar: S('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  external: S('<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
};

const BRAND = {
  facebook: '<path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"/>',
  instagram: '<path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-1-.5-.4-.8-.8-1-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.1A6.7 6.7 0 1 0 18.7 12 6.7 6.7 0 0 0 12 5.3Zm0 11A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3ZM19.1 5a1.6 1.6 0 1 1-1.6-1.6A1.6 1.6 0 0 1 19.1 5Z"/>',
  x: '<path d="M17.5 3h3.2l-7 8 8.2 10h-6.4l-5-6.1L4.7 21H1.5l7.5-8.6L1.1 3h6.6l4.5 5.6Zm-1.1 16h1.8L7.7 4.8H5.8Z"/>',
  linkedin: '<path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0 0-5ZM3 9.5h4V21H3ZM9.5 9.5h3.8v1.6h.05a4.2 4.2 0 0 1 3.75-2c4 0 4.75 2.6 4.75 6V21h-4v-5.2c0-1.25 0-2.85-1.75-2.85s-2 1.35-2 2.75V21h-4Z"/>',
  youtube: '<path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.7-1.8C19.3 5 12 5 12 5s-7.3 0-8.9.5a2.5 2.5 0 0 0-1.7 1.8C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.7 1.8C4.7 19 12 19 12 19s7.3 0 8.9-.5a2.5 2.5 0 0 0 1.7-1.8C23 15.2 23 12 23 12Zm-13 3V9l5.2 3Z"/>',
  tiktok: '<path d="M16.5 2h-3v13.2a2.7 2.7 0 1 1-2.2-2.7v-3a5.7 5.7 0 1 0 5.2 5.7V9a7.1 7.1 0 0 0 4.2 1.4v-3a4.2 4.2 0 0 1-4.2-4.2Z"/>',
  pinterest: '<path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.1-2 .1-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.5-.2 1 .5 1.9 1.6 1.9 1.9 0 3.2-2.4 3.2-5.3 0-2.2-1.5-3.8-4.1-3.8a4.7 4.7 0 0 0-4.9 4.7c0 .9.3 1.5.7 2 .2.2.2.3.1.6l-.2.8c-.1.3-.3.4-.5.2a4.6 4.6 0 0 1-1.7-4c0-2.9 2.5-6.4 7.3-6.4 3.9 0 6.4 2.8 6.4 5.8 0 4-2.2 6.9-5.4 6.9a2.9 2.9 0 0 1-2.4-1.2l-.7 2.6a11 11 0 0 1-.9 2A10 10 0 1 0 12 2Z"/>',
  yelp: '<path d="M11.2 3.1v9.1c0 .8-1 1.2-1.5.5L5.9 7.9a1 1 0 0 1 .2-1.5A11 11 0 0 1 10 3a1 1 0 0 1 1.2.1Zm2.4 8.6 4.6-1.5a1 1 0 0 1 1.2.6c.4 1.1.6 2.2.6 3.4a1 1 0 0 1-1 1l-4.8-.2c-.9 0-1.2-1.1-.6-1.6Zm-1.3 3.6 2.8 3.9a1 1 0 0 1-.3 1.4c-1 .6-2.1 1-3.3 1.2a1 1 0 0 1-1.1-1l.1-4.8c0-1 1.2-1.4 1.8-.7Zm-2.9-.9-4.2 2.3a1 1 0 0 1-1.4-.5A10 10 0 0 1 3 13a1 1 0 0 1 1-1.1l4.9.6c.9.1 1.1 1.3.5 1.9Zm4-4.2 3-3.7a1 1 0 0 1 1.5-.1c.9.8 1.5 1.7 2 2.8a1 1 0 0 1-.6 1.3l-4.6 1.4c-.9.3-1.6-.8-1-1.5Z"/>',
  google: '<path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2a9.7 9.7 0 0 0 3-7.4ZM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5a6 6 0 0 1-9-3.2H3.1v2.6A10 10 0 0 0 12 22ZM6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9ZM12 5.9a5.4 5.4 0 0 1 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6A6 6 0 0 1 12 5.9Z"/>',
  nextdoor: '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm4.6 14.4h-2.4v-4.1c0-1-.5-1.6-1.4-1.6s-1.6.7-1.6 1.8v3.9H8.8V9.2h2.3v1a2.9 2.9 0 0 1 2.5-1.2c1.8 0 3 1.2 3 3.3Z"/>',
};

export const icon = (name, className = 'icon') => {
  const body = ICONS[name];
  if (!body) return '';
  return body.replace('<svg ', `<svg class="${className}" `);
};

export const brandIcon = (name, className = 'icon') => {
  const body = BRAND[name];
  if (!body) return icon('external', className);
  return `<svg class="${className}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
};

export const hasBrandIcon = (name) => Object.hasOwn(BRAND, name);

/** Pick a sensible icon for a service, based on its name. */
export function iconForService(name = '') {
  const n = name.toLowerCase();
  if (/repair|fix|service|maintenance|tune|install/.test(n)) return 'wrench';
  if (/clean|wash|polish|detail/.test(n)) return 'sparkle';
  if (/inspect|audit|assess|consult|review|plan/.test(n)) return 'checkCircle';
  if (/emergency|24|urgent|same.day/.test(n)) return 'clock';
  if (/warrant|guarantee|protect|insur|safe|secur/.test(n)) return 'shield';
  if (/design|custom|new|build|remodel|renovat/.test(n)) return 'sparkle';
  if (/team|staff|training|coach/.test(n)) return 'users';
  if (/book|appointment|schedul/.test(n)) return 'calendar';
  if (/award|premium|best|quality/.test(n)) return 'award';
  return 'checkCircle';
}
