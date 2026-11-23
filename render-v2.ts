// The World on Monday, v2 — a front page built to be read at a glance.
// One big picture leads (tankers in the Strait of Hormuz), five more stories
// follow in short, large-type panels. Same six verified stories as v1, same
// date — only the visuals changed. Node standard library only, no network,
// no clock, no randomness: two runs give byte-identical output.
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

type RGB = [number, number, number];
const PAPER: RGB = [248, 244, 232];
const INK: RGB = [16, 16, 16];
const RED: RGB = [178, 34, 28];
const BRIGHTRED: RGB = [232, 90, 74];
const BLUE: RGB = [28, 74, 132];
const SEA: RGB = [30, 90, 138];
const SKY: RGB = [188, 217, 234];
const GREEN: RGB = [44, 122, 68];
const ORANGE: RGB = [228, 124, 30];
const YELLOW: RGB = [240, 196, 25];
const GREY: RGB = [118, 118, 114];
const LIGHT: RGB = [228, 222, 206];
const WHITE: RGB = [255, 255, 255];
const DARK: RGB = [32, 32, 32];

// Flat pixel buffer for the whole page, filled with newsprint paper.
const buf = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  buf[i * 3] = PAPER[0];
  buf[i * 3 + 1] = PAPER[1];
  buf[i * 3 + 2] = PAPER[2];
}

function set(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function box(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c);
}

function frame(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
  box(x, y, w, t, c);
  box(x, y + h - t, w, t, c);
  box(x, y, t, h, c);
  box(x + w - t, y, t, h, c);
}

function hline(x0: number, x1: number, y: number, t: number, c: RGB): void {
  box(x0, y, x1 - x0, t, c);
}

function vline(x: number, y0: number, y1: number, t: number, c: RGB): void {
  box(x, y0, t, y1 - y0, c);
}

function seg(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (let n = 0; n < 4000; n++) {
    box(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) set(x, y, c);
    }
  }
}

function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.min(x0, x1, x2);
  const maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
      const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
      if (a >= 0 && b >= 0 && 1 - a - b >= 0) set(x, y, c);
    }
  }
}

// A 5x7 bitmap font, drawn as rows of '#' (on) and '.' (off).
const GLYPHS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".####"],
  b: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "####."],
  c: [".....", ".....", ".###.", "#...#", "#....", "#...#", ".###."],
  d: ["....#", "....#", ".####", "#...#", "#...#", "#...#", ".####"],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
  f: ["..##.", ".#..#", ".#...", "####.", ".#...", ".#...", ".#..."],
  g: [".....", ".####", "#...#", "#...#", ".####", "....#", ".###."],
  h: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "#...#"],
  i: ["..#..", ".....", ".##..", "..#..", "..#..", "..#..", ".###."],
  j: ["...#.", ".....", "..##.", "...#.", "...#.", "#..#.", ".##.."],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
  l: [".##..", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  m: [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#"],
  n: [".....", ".....", "####.", "#...#", "#...#", "#...#", "#...#"],
  o: [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
  p: [".....", ".....", "####.", "#...#", "####.", "#....", "#...."],
  q: [".....", ".....", ".####", "#...#", ".####", "....#", "....#"],
  r: [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
  s: [".....", ".....", ".####", "#....", ".###.", "....#", "####."],
  t: [".#...", ".#...", "###..", ".#...", ".#...", ".#..#", "..##."],
  u: [".....", ".....", "#...#", "#...#", "#...#", "#..##", ".##.#"],
  v: [".....", ".....", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  w: [".....", ".....", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
  x: [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  y: [".....", ".....", "#...#", "#...#", ".####", "....#", ".###."],
  z: [".....", ".....", "#####", "...#.", "..#..", ".#...", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "..##.", ".#...", "#....", "#####"],
  "3": ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", "..#..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", "..#..", ".#..."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".#.#.", ".....", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "%": ["##..#", "##.#.", "....#", "..#..", ".#...", ".#.##", "#..##"],
  "/": ["....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "..##.", "..#..", ".....", "..#.."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "•": [".....", ".....", ".##..", ".##..", ".##..", ".....", "....."],
  "—": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
};

function drawChar(ch: string, x: number, y: number, s: number, c: RGB): void {
  const rows = GLYPHS[ch] ?? GLYPHS["?"];
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (rows[r][col] === "#") box(x + col * s, y + r * s, s, s, c);
    }
  }
}

function textW(s: string, scale: number): number {
  return s.length === 0 ? 0 : s.length * 6 * scale - scale;
}

function text(s: string, x: number, y: number, scale: number, c: RGB): void {
  for (let i = 0; i < s.length; i++) drawChar(s[i], x + i * 6 * scale, y, scale, c);
}

function centerText(s: string, cx: number, y: number, scale: number, c: RGB): void {
  text(s, cx - Math.floor(textW(s, scale) / 2), y, scale, c);
}

// Greedy word wrap into lines that fit maxWidth at the given scale.
function wrapLines(s: string, maxWidth: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textW(trial, scale) <= maxWidth) {
      cur = trial;
    } else {
      if (cur !== "") lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function wrapped(s: string, x: number, y: number, maxWidth: number, scale: number, c: RGB, gap: number): void {
  const lines = wrapLines(s, maxWidth, scale);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], x, y + i * (7 * scale + gap), scale, c);
  }
}

// ---- PNG encoding: fixed settings, no timestamps, fully deterministic ----
const CRC: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, "ascii");
  const cb = Buffer.alloc(4);
  cb.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, cb]);
}

function toPng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- The six verified stories of Monday 23 November 2026 (unchanged) ----
interface Panel {
  kicker: string;
  headline: string;
  deck: string;
}

const PANELS: Panel[] = [
  {
    kicker: "LIBYA",
    headline: "SEA DRONE HITS RUSSIAN WARSHIP",
    deck: "Suspected Ukrainian drone hit the corvette Merkury in Benghazi; it later sank, ten hurt.",
  },
  {
    kicker: "CLIMATE - COP31",
    headline: "COP31 COLLAPSES WITH NO DEAL",
    deck: "Climate talks fail after a record extension, deadlocked on fossil fuels.",
  },
  {
    kicker: "MARKETS",
    headline: "MARKET SLIDE ON AI-BUBBLE FEARS",
    deck: "US shares fell sharply; Taiwan down 17.5% in a week, Kospi over 3%.",
  },
  {
    kicker: "POLAND - NATO",
    headline: "POLAND: RUSSIAN MISSILES FELL",
    deck: "Three fallen objects confirmed as Russian cruise missiles; NATO to meet.",
  },
];

// ---- Icons: flat, chunky, readable at a glance ----
function spikeMine(cx: number, cy: number, r: number): void {
  disc(cx, cy, r, INK);
  seg(cx - r - 7, cy, cx + r + 7, cy, 3, INK);
  seg(cx, cy - r - 7, cx, cy + r + 7, 3, INK);
  seg(cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4, 3, INK);
  seg(cx - r - 4, cy + r + 4, cx + r + 4, cy - r - 4, 3, INK);
}

function iconLibya(x: number, y: number): void {
  box(x, y + 38, 96, 18, SEA);
  box(x + 8, y + 22, 58, 14, DARK);
  box(x + 24, y + 8, 5, 14, DARK);
  box(x + 38, y + 12, 18, 6, RED);
  box(x + 74, y + 6, 14, 5, INK);
  seg(x + 72, y + 4, x + 90, y + 4, 2, INK);
  tri(x + 68, y + 38, x + 76, y + 38, x + 72, y + 28, WHITE);
  tri(x + 82, y + 38, x + 90, y + 38, x + 86, y + 30, WHITE);
}

function iconCop(x: number, y: number): void {
  disc(x + 28, y + 28, 25, GREEN);
  box(x + 14, y + 16, 14, 9, LIGHT);
  box(x + 32, y + 32, 13, 9, LIGHT);
  seg(x + 6, y + 50, x + 50, y + 6, 5, RED);
  for (let yy = y + 4; yy <= y + 52; yy++) {
    for (let xx = x + 4; xx <= x + 52; xx++) {
      const d = Math.sqrt((xx - (x + 28)) * (xx - (x + 28)) + (yy - (y + 28)) * (yy - (y + 28)));
      if (d >= 23 && d <= 27) set(xx, yy, INK);
    }
  }
}

function iconMarkets(x: number, y: number): void {
  box(x + 8, y + 42, 10, 12, GREY);
  box(x + 24, y + 32, 10, 22, GREY);
  box(x + 40, y + 24, 10, 30, RED);
  box(x + 56, y + 12, 10, 42, RED);
  seg(x + 6, y + 8, x + 34, y + 26, 3, RED);
  seg(x + 34, y + 26, x + 60, y + 18, 3, RED);
  seg(x + 60, y + 18, x + 90, y + 48, 3, RED);
  tri(x + 90, y + 48, x + 80, y + 44, x + 86, y + 54, RED);
}

function iconPoland(x: number, y: number): void {
  box(x + 4, y + 32, 44, 11, WHITE);
  box(x + 4, y + 43, 44, 11, RED);
  frame(x + 4, y + 32, 44, 22, 2, INK);
  seg(x + 56, y + 8, x + 90, y + 28, 5, DARK);
  tri(x + 90, y + 28, x + 80, y + 24, x + 84, y + 36, DARK);
  disc(x + 58, y + 12, 4, YELLOW);
  disc(x + 94, y + 32, 4, YELLOW);
}

function iconChip(x: number, y: number, s: number): void {
  for (let i = 0; i < 4; i++) {
    box(x + 8 + i * 15, y - 6, 6, 6, INK);
    box(x + 8 + i * 15, y + s, 6, 6, INK);
    box(x - 6, y + 8 + i * 15, 6, 6, INK);
    box(x + s, y + 8 + i * 15, 6, 6, INK);
  }
  box(x, y, s, s, GREEN);
  box(x + 13, y + 13, s - 26, s - 26, DARK);
  seg(x + s + 12, y + 6, x + s + 12, y + s - 6, 4, RED);
  tri(x + s + 12, y + s - 2, x + s + 4, y + s - 12, x + s + 20, y + s - 12, RED);
}

// ---- Hero: the Strait of Hormuz, drawn big across the whole page ----
function drawHeroScene(): void {
  box(32, 138, 960, 120, SKY);
  disc(920, 178, 24, YELLOW);
  disc(150, 182, 14, WHITE);
  disc(182, 192, 10, WHITE);
  disc(700, 168, 12, WHITE);
  disc(728, 178, 9, WHITE);
  box(32, 258, 960, 142, SEA);
  // Tanker, bow to the right.
  box(96, 280, 20, 32, DARK);
  box(110, 288, 60, 24, RED);
  box(180, 288, 60, 24, GREEN);
  box(250, 288, 60, 24, YELLOW);
  box(320, 288, 60, 24, BLUE);
  box(390, 288, 60, 24, WHITE);
  box(460, 288, 60, 24, ORANGE);
  box(80, 312, 560, 34, DARK);
  tri(640, 312, 676, 329, 640, 346, DARK);
  // Fire and smoke over the containers.
  tri(120, 288, 142, 288, 131, 256, ORANGE);
  tri(196, 288, 212, 288, 204, 264, RED);
  disc(131, 246, 9, GREY);
  disc(150, 234, 7, GREY);
  disc(112, 238, 6, GREY);
  // Sea mines in the water, right of the tanker.
  spikeMine(760, 340, 13);
  spikeMine(862, 362, 11);
  tri(740, 356, 750, 356, 745, 344, WHITE);
  tri(846, 376, 856, 376, 851, 366, WHITE);
  // Whitecaps.
  for (let i = 0; i < 6; i++) {
    seg(60 + i * 150, 384, 92 + i * 150, 384, 3, WHITE);
  }
}

function drawMasthead(): void {
  centerText("THE WORLD ON MONDAY", 512, 22, 7, INK);
  box(40, 82, 944, 36, RED);
  centerText("MONDAY, 23 NOVEMBER 2026", 512, 90, 3, WHITE);
  hline(40, 984, 126, 2, INK);
}

function drawHero(): void {
  frame(30, 136, 964, 384, 2, INK);
  drawHeroScene();
  hline(30, 994, 400, 2, INK);
  box(32, 402, 960, 116, INK);
  text("STRAIT OF HORMUZ", 46, 412, 2, BRIGHTRED);
  text("TANKERS HIT BY MINES", 46, 432, 5, WHITE);
  text("Three tankers attacked Fri-Sat; two more ablaze Sun after sea mines.", 46, 472, 2, WHITE);
  text("Attacks on shipping at their highest since the war began.", 46, 490, 2, WHITE);
}

function drawCell(p: Panel, x0: number, y0: number, icon: (x: number, y: number) => void): void {
  frame(x0, y0, 476, 176, 2, INK);
  text(p.kicker, x0 + 14, y0 + 12, 2, RED);
  icon(x0 + 364, y0 + 36);
  wrapped(p.headline, x0 + 14, y0 + 38, 336, 3, INK, 6);
  wrapped(p.deck, x0 + 14, y0 + 100, 448, 2, INK, 4);
}

function drawNvidia(): void {
  frame(30, 908, 964, 80, 2, INK);
  iconChip(46, 922, 56);
  text("TECH - NVIDIA", 142, 916, 2, RED);
  text("NVIDIA CHIEF HUANG STEPS DOWN", 142, 936, 3, INK);
  text("Jensen Huang leaves as CEO; the board says he will not return.", 142, 964, 2, INK);
}

function drawFooter(): void {
  centerText(
    "Sources: AP, Reuters, BBC Verify, Al Jazeera, The Hindu, UKMTO, IRNA - Monday 23 November 2026",
    512,
    996,
    1,
    GREY,
  );
}

export function render(): Buffer {
  frame(10, 10, W - 20, H - 20, 3, INK);
  frame(18, 18, W - 36, H - 36, 1, INK);
  drawMasthead();
  drawHero();
  const icons = [iconLibya, iconCop, iconMarkets, iconPoland];
  const cells: Array<[number, number]> = [
    [30, 532],
    [518, 532],
    [30, 720],
    [518, 720],
  ];
  for (let i = 0; i < 4; i++) {
    drawCell(PANELS[i], cells[i][0], cells[i][1], icons[i]);
  }
  drawNvidia();
  drawFooter();
  return toPng();
}
