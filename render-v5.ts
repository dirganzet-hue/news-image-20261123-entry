// render-v5.ts — "The World in One Picture" v5
// Broadsheet infographic for make.fun news-image-20261123, Round 3.
// NEW in v5: a bold 6x8 bitmap font (2px stems) replacing the thin 5x7
// font of v1-v4, which Iwan found hard to read. Same 6 verified stories,
// same layout language as v4, geometry re-computed for advance 7*scale.
// Deterministic: no time, no randomness. Node stdlib only, no network.
// Exports renderV5(): Buffer (1024x1024 RGB PNG).

import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- font
// Each glyph: 8 rows x 6 cols, '#' = ink, '.' = empty. Bold by design:
// vertical stems and horizontals are 2px where the 6px cell allows it,
// counters stay open so a/e/o/c/s stay distinct at small scales.
const FONT: Record<string, string[]> = {
  'A': ['.####.', '##..##', '##..##', '######', '##..##', '##..##', '##..##', '##..##'],
  'B': ['#####.', '##..##', '##..##', '#####.', '##..##', '##..##', '##..##', '#####.'],
  'C': ['.####.', '##..##', '##....', '##....', '##....', '##..##', '.####.', '......'],
  'D': ['#####.', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '#####.'],
  'E': ['######', '##....', '##....', '#####.', '##....', '##....', '##....', '######'],
  'F': ['######', '##....', '##....', '#####.', '##....', '##....', '##....', '##....'],
  'G': ['.####.', '##..##', '##....', '##.###', '##..##', '##..##', '.####.', '......'],
  'H': ['##..##', '##..##', '##..##', '######', '##..##', '##..##', '##..##', '##..##'],
  'I': ['.####.', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '.####.'],
  'J': ['..####', '....##', '....##', '....##', '....##', '##..##', '##..##', '.####.'],
  'K': ['##..##', '##..##', '##.##.', '####..', '##.##.', '##..##', '##..##', '##..##'],
  'L': ['##....', '##....', '##....', '##....', '##....', '##....', '##....', '######'],
  'M': ['##..##', '###.##', '##.#.#', '##.#.#', '##...#', '##...#', '##...#', '##...#'],
  'N': ['##..##', '###.##', '###.##', '##.###', '##.###', '##..##', '##..##', '##..##'],
  'O': ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
  'P': ['#####.', '##..##', '##..##', '#####.', '##....', '##....', '##....', '##....'],
  'Q': ['.####.', '##..##', '##..##', '##..##', '##..##', '##.#.#', '##..##', '.###.#'],
  'R': ['#####.', '##..##', '##..##', '#####.', '##.##.', '##..##', '##..##', '##..##'],
  'S': ['.####.', '##..##', '##....', '.####.', '....##', '##..##', '.####.', '......'],
  'T': ['######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
  'U': ['##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
  'V': ['##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.', '..##..'],
  'W': ['##...#', '##...#', '##...#', '##...#', '##.#.#', '##.#.#', '######', '.##.##.'],
  'X': ['##..##', '##..##', '.####.', '..##..', '.####.', '##..##', '##..##', '##..##'],
  'Y': ['##..##', '##..##', '##..##', '.####.', '..##..', '..##..', '..##..', '..##..'],
  'Z': ['######', '....##', '...##.', '..##..', '.##...', '##....', '##....', '######'],
  '0': ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
  '1': ['..##..', '.###..', '..##..', '..##..', '..##..', '..##..', '..##..', '.####.'],
  '2': ['.####.', '##..##', '....##', '...##.', '..##..', '.##...', '##....', '######'],
  '3': ['#####.', '....##', '....##', '.####.', '....##', '....##', '##..##', '.####.'],
  '4': ['...##.', '..###.', '.####.', '##.##.', '######', '...##.', '...##.', '...##.'],
  '5': ['######', '##....', '#####.', '....##', '....##', '##..##', '##..##', '.####.'],
  '6': ['.####.', '##....', '##....', '#####.', '##..##', '##..##', '##..##', '.####.'],
  '7': ['######', '....##', '...##.', '...##.', '..##..', '..##..', '..##..', '..##..'],
  '8': ['.####.', '##..##', '##..##', '.####.', '##..##', '##..##', '##..##', '.####.'],
  '9': ['.####.', '##..##', '##..##', '##..##', '.####.', '....##', '....##', '.####.'],
  'a': ['......', '......', '.####.', '....##', '.#####', '##..##', '##..##', '.####.'],
  'b': ['##....', '##....', '#####.', '##..##', '##..##', '##..##', '##..##', '#####.'],
  'c': ['......', '......', '.####.', '##..##', '##....', '##....', '##..##', '.####.'],
  'd': ['....##', '....##', '.####.', '##..##', '##..##', '##..##', '##..##', '.####.'],
  'e': ['......', '......', '.####.', '##..##', '######', '##....', '##..##', '.####.'],
  'f': ['..###.', '.##...', '##....', '#####.', '##....', '##....', '##....', '##....'],
  'g': ['......', '.####.', '##..##', '##..##', '.####.', '....##', '##..##', '.###..'],
  'h': ['##....', '##....', '#####.', '##..##', '##..##', '##..##', '##..##', '##..##'],
  'i': ['......', '..##..', '......', '.###..', '..##..', '..##..', '..##..', '.####.'],
  'j': ['......', '....##', '......', '..####', '....##', '....##', '##..##', '##..##'],
  'k': ['##....', '##....', '##.##.', '##.##.', '####..', '##.##.', '##..##', '##..##'],
  'l': ['.###..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '.####.'],
  'm': ['......', '......', '##.##.', '######', '##.#.#', '##.#.#', '##.#.#', '##.#.#'],
  'n': ['......', '......', '#####.', '##..##', '##..##', '##..##', '##..##', '##..##'],
  'o': ['......', '......', '.####.', '##..##', '##..##', '##..##', '##..##', '.####.'],
  'p': ['......', '......', '#####.', '##..##', '##..##', '#####.', '##....', '##....'],
  'q': ['......', '......', '.####.', '##..##', '##..##', '.####.', '....##', '....##'],
  'r': ['......', '......', '##.##.', '##.##.', '##....', '##....', '##....', '##....'],
  's': ['......', '......', '.####.', '##..##', '.###..', '...###', '##..##', '.###..'],
  't': ['.##...', '.##...', '#####.', '.##...', '.##...', '.##...', '.##...', '.###..'],
  'u': ['......', '......', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
  'v': ['......', '......', '##..##', '##..##', '##..##', '##..##', '.####.', '..##..'],
  'w': ['......', '......', '##..##', '##..##', '##.###', '##.#.#', '##.#.#', '.###..'],
  'x': ['......', '......', '##..##', '.####.', '..##..', '.####.', '##..##', '##..##'],
  'y': ['......', '......', '##..##', '##..##', '##..##', '.####.', '....##', '.####.'],
  'z': ['......', '......', '######', '....##', '...##.', '..##..', '##....', '######'],
  ' ': ['......', '......', '......', '......', '......', '......', '......', '......'],
  '.': ['......', '......', '......', '......', '......', '......', '.##...', '.##...'],
  ',': ['......', '......', '......', '......', '......', '.##...', '.##...', '##....'],
  ':': ['......', '......', '.##...', '.##...', '......', '.##...', '.##...', '......'],
  ';': ['......', '......', '.##...', '.##...', '......', '.##...', '.##...', '##....'],
  '-': ['......', '......', '......', '.####.', '.####.', '......', '......', '......'],
  "'": ['..##..', '..##..', '..##..', '......', '......', '......', '......', '......'],
  '"': ['.##.##', '.##.##', '.##.##', '......', '......', '......', '......', '......'],
  '(': ['...##.', '..##..', '.##...', '.##...', '.##...', '.##...', '..##..', '...##.'],
  ')': ['.##...', '..##..', '...##.', '...##.', '...##.', '...##.', '..##..', '.##...'],
  '%': ['##...#', '##..##', '....##', '...##.', '..##..', '.##...', '##..##', '#...##'],
  '/': ['....##', '....##', '...##.', '...##.', '..##..', '..##..', '.##...', '.##...'],
  '&': ['.####.', '##..##', '##..##', '.###..', '##.#.#', '##..##', '##..##', '.##.##'],
  '!': ['..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '......', '..##..'],
  '?': ['.####.', '##..##', '....##', '...##.', '..##..', '..##..', '......', '..##..'],
  '=': ['......', '......', '######', '......', '######', '......', '......', '......'],
  '+': ['......', '......', '..##..', '..##..', '######', '######', '..##..', '..##..'],
  '•': ['......', '......', '.####.', '.####.', '.####.', '.####.', '......', '......'],
  '—': ['......', '......', '......', '######', '######', '......', '......', '......'],
};

// ---------------------------------------------------------------- canvas
const W = 1024;
const H = 1024;
const PAPER: [number, number, number] = [247, 243, 234];
const INK: [number, number, number] = [17, 17, 17];
const RED: [number, number, number] = [200, 16, 46];
const BLUE: [number, number, number] = [31, 78, 121];
const SEA: [number, number, number] = [46, 111, 158];
const SKY: [number, number, number] = [168, 205, 226];
const SAND: [number, number, number] = [232, 226, 212];
const LIGHT: [number, number, number] = [255, 255, 255];
const GRAY: [number, number, number] = [120, 116, 108];
const DARKGRAY: [number, number, number] = [64, 62, 58];
const GREEN: [number, number, number] = [46, 125, 50];
const ORANGE: [number, number, number] = [230, 126, 34];
const YELLOW: [number, number, number] = [241, 196, 15];

type RGB = [number, number, number];

const px = new Uint8Array(W * H * 3);

function fillAll(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2];
  }
}

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
    }
  }
}

function filledCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = cy - r; yy <= cy + r; yy++) {
    for (let xx = cx - r; xx <= cx + r; xx++) {
      const dx = xx - cx, dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) setPx(xx, yy, c);
    }
  }
}

// Thick diagonal bar (staircase steps of size s) from (x0,y0) to (x1,y1).
function diagBar(x0: number, y0: number, x1: number, y1: number, s: number, c: RGB): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let t = 0; t <= steps; t++) {
    const x = Math.round(x0 + ((x1 - x0) * t) / steps);
    const y = Math.round(y0 + ((y1 - y0) * t) / steps);
    fillRect(x - Math.floor(s / 2), y - Math.floor(s / 2), s, s, c);
  }
}

// ------------------------------------------------------------------- text
// Advance is 7*scale (6px glyph + 1px gap).
function textWidth(s: string, scale: number): number {
  if (s.length === 0) return 0;
  return s.length * 7 * scale - scale;
}

function putText(x: number, y: number, s: string, scale: number, c: RGB): void {
  for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]] ?? FONT[' '];
    const gx = x + i * 7 * scale;
    for (let row = 0; row < 8; row++) {
      const bits = g[row];
      for (let col = 0; col < 6; col++) {
        if (bits[col] === '#') {
          fillRect(gx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
  }
}

function centerText(cx: number, y: number, s: string, scale: number, c: RGB): void {
  putText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}

function rightText(xRight: number, y: number, s: string, scale: number, c: RGB): void {
  putText(xRight - textWidth(s, scale), y, s, scale, c);
}

// Greedy word wrap; returns lines that fit maxWidth px at the scale.
function wrapText(s: string, maxWidth: number, scale: number): string[] {
  const maxChars = Math.max(1, Math.floor(maxWidth / (7 * scale)));
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') {
      if (w.length <= maxChars) { cur = w; continue; }
      // single over-long word: hard split
      let rest = w;
      while (rest.length > maxChars) { lines.push(rest.slice(0, maxChars)); rest = rest.slice(maxChars); }
      cur = rest;
      continue;
    }
    if (cur.length + 1 + w.length <= maxChars) { cur += ' ' + w; continue; }
    lines.push(cur);
    if (w.length <= maxChars) { cur = w; continue; }
    let rest = w;
    while (rest.length > maxChars) { lines.push(rest.slice(0, maxChars)); rest = rest.slice(maxChars); }
    cur = rest;
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

function putLines(x: number, y: number, lines: string[], scale: number, c: RGB, lh?: number): void {
  const step = lh ?? (8 * scale + 2);
  lines.forEach((ln, i) => putText(x, y + i * step, ln, scale, c));
}

// -------------------------------------------------------------------- png
const CRC_TABLE: number[] = (() => {
  const t: number[] = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  dv.setUint32(8 + data.length, crc);
  return out;
}

function encodePNG(): Buffer {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W);
  dv.setUint32(4, H);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = new Uint8Array(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return Buffer.from(out);
}

// -------------------------------------------------------------- pictures
// Simple geometric illustrations, drawn inside a 312x90 box at (x, y).

function drawTanker(x: number, y: number): void {
  fillRect(x, y, 312, 90, SKY);
  fillRect(x, y + 58, 312, 32, SEA);
  // tanker hull: long dark body + bow
  fillRect(x + 18, y + 46, 240, 16, INK);
  fillRect(x + 258, y + 50, 30, 12, INK);
  // deck cabin + stack
  fillRect(x + 40, y + 30, 34, 16, LIGHT);
  fillRect(x + 82, y + 34, 10, 12, RED);
  // cargo tanks
  fillRect(x + 120, y + 36, 26, 10, LIGHT);
  fillRect(x + 152, y + 36, 26, 10, LIGHT);
  fillRect(x + 184, y + 36, 26, 10, LIGHT);
  // sea mine: spiky dark ball floating by the bow
  filledCircle(x + 282, y + 70, 9, INK);
  fillRect(x + 279, y + 56, 6, 4, INK);
  fillRect(x + 279, y + 80, 6, 4, INK);
  fillRect(x + 268, y + 67, 4, 6, INK);
  fillRect(x + 292, y + 67, 4, 6, INK);
  // explosion burst above the hull
  filledCircle(x + 150, y + 18, 12, ORANGE);
  filledCircle(x + 150, y + 18, 7, YELLOW);
  fillRect(x + 146, y + 2, 8, 6, YELLOW);
  fillRect(x + 132, y + 14, 6, 8, YELLOW);
  fillRect(x + 162, y + 14, 6, 8, YELLOW);
}

function drawWarship(x: number, y: number): void {
  fillRect(x, y, 312, 90, SKY);
  fillRect(x, y + 58, 312, 32, SEA);
  // gray warship hull + superstructure + mast
  fillRect(x + 30, y + 48, 220, 14, DARKGRAY);
  fillRect(x + 250, y + 52, 34, 10, DARKGRAY);
  fillRect(x + 90, y + 34, 60, 14, DARKGRAY);
  fillRect(x + 118, y + 18, 6, 16, DARKGRAY);
  fillRect(x + 100, y + 22, 42, 4, DARKGRAY);
  // sea drone: small dark craft skimming the water
  fillRect(x + 262, y + 62, 26, 8, INK);
  filledCircle(x + 268, y + 58, 4, INK);
  filledCircle(x + 282, y + 58, 4, INK);
  // blast where the drone hit
  filledCircle(x + 252, y + 44, 11, ORANGE);
  filledCircle(x + 252, y + 44, 6, YELLOW);
  fillRect(x + 248, y + 30, 8, 6, YELLOW);
}

function drawGlobe(x: number, y: number): void {
  fillRect(x, y, 312, 90, SAND);
  // globe: blue disc, green land blobs, red X across it
  filledCircle(x + 156, y + 45, 40, SEA);
  filledCircle(x + 140, y + 32, 12, GREEN);
  filledCircle(x + 170, y + 52, 14, GREEN);
  filledCircle(x + 148, y + 60, 8, GREEN);
  filledCircle(x + 176, y + 28, 7, GREEN);
  // red X over the globe
  diagBar(x + 122, y + 12, x + 190, y + 78, 10, RED);
  diagBar(x + 190, y + 12, x + 122, y + 78, 10, RED);
}

// ------------------------------------------------------------------ layout
const COLX = [30, 356, 682];
const COLW = 312;

export function renderV5(): Buffer {
  fillAll(PAPER);

  // Top bar (black): left story count + date, right masthead line.
  fillRect(0, 8, W, 24, INK);
  putText(30, 12, '6 STORIES - MONDAY 23 NOVEMBER 2026', 2, LIGHT);
  rightText(994, 12, 'THE WORLD IN ONE PICTURE', 2, LIGHT);

  // Masthead.
  centerText(512, 40, 'THE WORLD IN ONE PICTURE', 2, INK);
  centerText(512, 60, 'Monday 23 November 2026', 5, INK);
  fillRect(30, 106, 964, 2, INK);

  // Timeline strip.
  putText(30, 114, 'THE WEEKEND TO MONDAY', 2, RED);
  const tl: [string, string][] = [
    ['FRI-SAT', 'Three tankers attacked in Hormuz'],
    ['SUNDAY', 'Mines hit two tankers; drone sinks ship'],
    ['MONDAY', 'COP31 fails; markets fall; Poland, Huang'],
  ];
  tl.forEach(([day, txt], i) => {
    const x = COLX[i];
    putText(x, 134, day, 2, RED);
    putLines(x, 154, wrapText(txt, COLW, 2), 2, INK);
  });
  fillRect(30, 196, 964, 2, INK);

  // Numbers strip.
  putText(30, 204, 'THE DAY IN NUMBERS', 2, RED);
  const nums: [string, string][] = [
    ['5', 'TANKERS HIT IN HORMUZ'],
    ['10', 'HURT IN BENGHAZI'],
    ['17.5%', 'TAIWAN DROP IN A WEEK'],
    ['3%', 'KOSPI FALL'],
    ['3', 'MISSILES IN POLAND'],
  ];
  nums.forEach(([n, label], i) => {
    const x = 30 + i * 194;
    putText(x, 224, n, 4, INK);
    putLines(x, 260, wrapText(label, 190, 2), 2, INK);
  });
  fillRect(30, 302, 964, 2, INK);

  // Three big stories, y0 = 310.
  const bigY = 310;
  const big: { n: string; region: string; tag: string; head: string; deck: string; src: string }[] = [
    { n: '1', region: 'HORMUZ', tag: 'CONFIRMED', head: 'TANKERS HIT BY MINES', deck: 'At least three tankers attacked Fri-Sat; two more hit mines Sunday.', src: 'AP / CNN / UKMTO' },
    { n: '2', region: 'LIBYA', tag: 'UNCONFIRMED', head: 'SEA DRONE SINKS WARSHIP', deck: 'Ukrainian sea drone hit Russian corvette Merkury in Benghazi; it sank. 10 hurt.', src: 'AP / Reuters / BBC' },
    { n: '3', region: 'COP31', tag: 'COLLAPSED', head: 'COP31 COLLAPSES', deck: 'Climate talks collapsed with no deal after a record extension.', src: 'Reuters / The Hindu' },
  ];
  big.forEach((s, i) => {
    const x = COLX[i];
    // header: red number square + region + tag
    fillRect(x, bigY, 18, 18, RED);
    putText(x + 5, bigY + 5, s.n, 1, LIGHT);
    putText(x + 26, bigY + 1, s.region, 2, INK);
    rightText(x + COLW, bigY + 1, s.tag, 2, RED);
    // picture
    if (i === 0) drawTanker(x, bigY + 24);
    if (i === 1) drawWarship(x, bigY + 24);
    if (i === 2) drawGlobe(x, bigY + 24);
    // headline (2 lines, scale 3) + deck (scale 2) + source
    putLines(x, bigY + 122, wrapText(s.head, COLW, 3), 3, INK, 26);
    putLines(x, bigY + 182, wrapText(s.deck, COLW, 2), 2, INK);
    putText(x, bigY + 278, s.src, 2, GRAY);
  });

  // Three small stories, y0 = 614.
  const smallY = 614;
  const small: { n: string; region: string; head: string; deck: string; src: string; icon: RGB; glyph: string }[] = [
    { n: '4', region: 'MARKETS', head: 'MARKETS SLIDE ON AI FEARS', deck: 'US stocks fell sharply Friday; Taiwan down 17.5% in a week; Kospi fell 3%.', src: 'Al Jazeera', icon: RED, glyph: 'v' },
    { n: '5', region: 'POLAND', head: '3 MISSILES IN POLAND', deck: 'Three fallen objects were Russian cruise missiles; NATO to meet.', src: 'Reuters', icon: BLUE, glyph: '!' },
    { n: '6', region: 'NVIDIA', head: 'HUANG STEPS DOWN', deck: 'CEO Jensen Huang stepped down; the board confirmed he will not return.', src: 'SimpleLife', icon: GREEN, glyph: 'N' },
  ];
  small.forEach((s, i) => {
    const x = COLX[i];
    fillRect(x, smallY, 18, 18, RED);
    putText(x + 5, smallY + 5, s.n, 1, LIGHT);
    putText(x + 26, smallY + 1, s.region, 2, INK);
    // small icon square with a white glyph
    fillRect(x, smallY + 26, 22, 22, s.icon);
    putText(x + 5, smallY + 29, s.glyph, 2, LIGHT);
    putLines(x + 30, smallY + 26, wrapText(s.head, COLW - 30, 3), 3, INK, 26);
    putLines(x, smallY + 86, wrapText(s.deck, COLW, 2), 2, INK);
    putText(x, smallY + 164, s.src, 2, GRAY);
  });

  // Schematic map, y 804..906.
  putText(30, 804, 'WHERE IT HAPPENED', 2, RED);
  rightText(994, 804, 'schematic map - not to scale', 2, GRAY);
  fillRect(30, 824, 964, 60, SAND);
  // very schematic continents
  fillRect(80, 836, 120, 36, [214, 206, 184]);
  fillRect(430, 830, 90, 42, [214, 206, 184]);
  fillRect(560, 834, 300, 34, [214, 206, 184]);
  fillRect(880, 840, 80, 28, [214, 206, 184]);
  const pins: [number, number, string][] = [
    [700, 856, '1'], // Hormuz
    [470, 858, '2'], // Benghazi
    [540, 838, '3'], // COP31
    [840, 850, '4'], // Markets (Asia)
    [498, 836, '5'], // Poland
    [130, 850, '6'], // Nvidia (US)
  ];
  pins.forEach(([px0, py0, n]) => {
    filledCircle(px0, py0, 11, RED);
    putText(px0 - 3, py0 - 4, n, 1, LIGHT);
  });
  putText(30, 890, '1 Hormuz - 2 Benghazi - 3 COP31 - 4 Markets - 5 Poland - 6 Nvidia', 2, INK);

  // DATE CHECK bar (red).
  fillRect(0, 916, W, 52, RED);
  putText(30, 924, 'DATE CHECK: Hormuz Fri-Sun - Merkury Sun - COP31 Sun', 2, LIGHT);
  putText(30, 942, 'Markets fell Fri - Poland confirmed Mon - Huang stepped down Mon', 2, LIGHT);

  // Footer.
  centerText(512, 976, 'Sources: AP, Reuters, BBC Verify, Al Jazeera, The Hindu, UKMTO, IRNA', 2, INK);

  return encodePNG();
}
