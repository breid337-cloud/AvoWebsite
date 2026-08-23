/**
 * Small argv parser: long flags (--flag, --key=value, --key value), negations
 * (--no-key), short boolean clusters, and positional arguments.
 */
export function parseArgs(argv, { booleans = [], aliases = {} } = {}) {
  const boolSet = new Set(booleans);
  const flags = {};
  const positional = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    if (arg === '--') { positional.push(...argv.slice(i + 1)); break; }

    if (arg.startsWith('--')) {
      let key = arg.slice(2);
      let value;
      const eq = key.indexOf('=');
      if (eq !== -1) { value = key.slice(eq + 1); key = key.slice(0, eq); }

      if (key.startsWith('no-')) {
        flags[camel(key.slice(3))] = false;
        i++;
        continue;
      }
      const name = camel(aliases[key] ?? key);
      if (value !== undefined) flags[name] = coerce(value);
      else if (boolSet.has(key) || boolSet.has(name)) flags[name] = true;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('-')) { flags[name] = coerce(argv[++i]); }
      else flags[name] = true;
      i++;
      continue;
    }

    if (arg.startsWith('-') && arg.length > 1) {
      for (const ch of arg.slice(1)) {
        const name = camel(aliases[ch] ?? ch);
        flags[name] = true;
      }
      i++;
      continue;
    }

    positional.push(arg);
    i++;
  }

  return { flags, positional };
}

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

function coerce(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}
