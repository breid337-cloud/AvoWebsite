const TTY = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code) => (s) => (TTY ? `\x1b[${code}m${s}\x1b[0m` : String(s));

export const color = {
  dim: c('2'),
  bold: c('1'),
  red: c('31'),
  green: c('32'),
  yellow: c('33'),
  blue: c('34'),
  magenta: c('35'),
  cyan: c('36'),
  grey: c('90'),
};

let verbose = false;
export const setVerbose = (v) => { verbose = !!v; };
export const isVerbose = () => verbose;

export const log = {
  plain: (...a) => console.log(...a),
  step: (msg) => console.log(`${color.cyan('›')} ${msg}`),
  info: (msg) => console.log(`  ${color.grey(msg)}`),
  ok: (msg) => console.log(`${color.green('✓')} ${msg}`),
  warn: (msg) => console.warn(`${color.yellow('!')} ${msg}`),
  error: (msg) => console.error(`${color.red('✗')} ${msg}`),
  debug: (msg) => { if (verbose) console.log(`  ${color.grey('· ' + msg)}`); },
  blank: () => console.log(''),
  title: (msg) => console.log(`\n${color.bold(msg)}\n${color.grey('─'.repeat(Math.min(msg.length, 60)))}`),
};

/** Render an aligned two-column key/value block. */
export function table(rows, indent = '  ') {
  const width = rows.reduce((w, [k]) => Math.max(w, String(k).length), 0);
  for (const [k, v] of rows) {
    console.log(`${indent}${color.grey(String(k).padEnd(width))}  ${v}`);
  }
}

export class AvoError extends Error {
  constructor(message, hint) {
    super(message);
    this.name = 'AvoError';
    this.hint = hint;
  }
}
