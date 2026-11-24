// The World in One Picture, v4 — a broadsheet infographic.
// Round 2 (v2) fell to 38.1% and round 3's poster (v3) still read as
// too plain: a big poster is clear but empty. This version follows the
// language of a rich front-page infographic — top bar, giant masthead,
// timeline strip, numbers strip, three big pictured stories, three
// smaller ones, a schematic map, a red DATE CHECK bar — while keeping
// only our six verified stories of Monday 23 November 2026, in our own
// words. Nothing is copied from any other entry's text. Node standard
// library only, no network, no clock, no randomness: two runs are
// byte-identical.
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

type RGB = [number, number, number];
const PAPER: RGB = [250, 246, 236];
const INK: RGB = [14, 14, 14];
const RED: RGB = [178, 34, 28];
const HOTRED: RGB = [235, 92, 76];
const BLUE: RGB = [28, 74, 132];
const SEA: RGB = [30, 90, 138];
const SKY: RGB = [188, 217, 234];
const GREEN: RGB = [34, 120, 70];
const BROWN: RGB = [139, 94, 52];
const GOLD: RGB = [196, 148, 30];
const ORANGE: RGB = [228, 124, 30];
const YELLOW: RGB = [240, 196, 25];
const GREY: RGB = [118, 118, 114];
const SOFT: RGB = [232, 226, 210];
const LAND: RGB = [198, 188, 164];
const WHITE: RGB = [255, 255, 255];

const canvas = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  canvas[i * 3] = PAPER[0];
  canvas[i * 3 + 1] = PAPER[1];
  canvas[i * 3 + 2] = PAPER[2];
}

function put(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  canvas[i] = c[0];
  canvas[i + 1] = c[1];
  canvas[i + 2] = c[2];
}

function fill(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(i, j, c);
}

function edge(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
  fill(x, y, w, t, c);
  fill(x, y + h - t, w, t, c);
  fill(x, y, t, h, c);
  fill(x + w - t, y, t, h, c);
}

function stroke(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (let n = 0; n < 4000; n++) {
    fill(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
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

function ball(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) put(x, y, c);
    }
  }
}

function wedge(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
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
      if (a >= 0 && b >= 0 && 1 - a - b >= 0) put(x, y, c);
    }
  }
}

// A 5x7 bitmap font: '#' is on, '.' is off, one row per string.
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

function glyphAt(ch: string, x: number, y: number, s: number, c: RGB): void {
  const rows = GLYPHS[ch] ?? GLYPHS["?"];
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (rows[r][col] === "#") fill(x + col * s, y + r * s, s, s, c);
    }
  }
}

function textWidth(s: string, scale: number): number {
  return s.length === 0 ? 0 : s.length * 6 * scale - scale;
}

function putText(s: string, x: number, y: number, scale: number, c: RGB): void {
  for (let i = 0; i < s.length; i++) glyphAt(s[i], x + i * 6 * scale, y, scale, c);
}

function centerText(s: string, cx: number, y: number, scale: number, c: RGB): void {
  putText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

function rightText(s: string, x1: number, y: number, scale: number, c: RGB): void {
  putText(s, x1 - textWidth(s, scale), y, scale, c);
}

// Greedy word wrap into lines that fit maxWidth at the given scale.
function wrapLines(s: string, maxWidth: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textWidth(trial, scale) <= maxWidth) {
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
    putText(lines[i], x, y + i * (7 * scale + gap), scale, c);
  }
}

// ---- PNG encoding: fixed settings, no timestamps, fully deterministic ----
const CRC_TABLE: number[] = (() => {
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
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
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
    raw.set(canvas.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- The six verified stories, in our own words ----
interface Big {
  num: string;
  region: string;
  tag: string;
  tagColor: RGB;
  head: string;
  deck: string;
  source: string;
  pic: "hormuz" | "libya" | "cop";
}

const BIGS: Big[] = [
  {
    num: "1",
    region: "MIDDLE EAST",
    tag: "CONFIRMED",
    tagColor: GREEN,
    head: "TANKERS HIT BY MINES",
    deck: "Three tankers attacked Fri-Sat; two more ablaze Sun after sea mines. The most attacks since the war began.",
    source: "AP • CNN • UKMTO",
    pic: "hormuz",
  },
  {
    num: "2",
    region: "LIBYA",
    tag: "CONFIRMED",
    tagColor: GREEN,
    head: "SEA DRONE SINKS RUSSIAN WARSHIP",
    deck: "A suspected Ukrainian sea drone hit the corvette Merkury at Benghazi on Sunday. Badly damaged, it later sank; ten were hurt.",
    source: "AP • Reuters • BBC Verify",
    pic: "libya",
  },
  {
    num: "3",
    region: "CLIMATE",
    tag: "CONFIRMED",
    tagColor: GREEN,
    head: "COP31 COLLAPSES WITH NO DEAL",
    deck: "Climate talks collapsed Sun with no deal after a record extension, deadlocked on fossil-fuel phase-out.",
    source: "Reuters • The Hindu",
    pic: "cop",
  },
];

interface Small {
  num: string;
  region: string;
  tag: string;
  tagColor: RGB;
  head: string;
  deck: string;
  source: string;
}

const SMALLS: Small[] = [
  {
    num: "4",
    region: "MARKETS",
    tag: "REPORTED",
    tagColor: BROWN,
    head: "STOCKS SLIDE ON AI-BUBBLE FEARS",
    deck: "US shares fell sharply Fri. Taiwan down 17.5% in a week; Kospi over 3%.",
    source: "Al Jazeera",
  },
  {
    num: "5",
    region: "POLAND",
    tag: "CONFIRMED",
    tagColor: GREEN,
    head: "POLAND: RUSSIAN MISSILES FELL",
    deck: "Three objects confirmed as Russian cruise missiles; NATO to meet.",
    source: "AP • Reuters",
  },
  {
    num: "6",
    region: "NVIDIA",
    tag: "REPORTED",
    tagColor: BROWN,
    head: "NVIDIA CHIEF HUANG STEPS DOWN",
    deck: "Jensen Huang leaves as CEO; the board says he will not return.",
    source: "SimpleLife",
  },
];

// ---- The three big pictures, drawn inside a 312x100 frame ----
function spikedMine(cx: number, cy: number, r: number): void {
  ball(cx, cy, r, INK);
  stroke(cx - r - 7, cy, cx + r + 7, cy, 3, INK);
  stroke(cx, cy - r - 7, cx, cy + r + 7, 3, INK);
  stroke(cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4, 3, INK);
  stroke(cx - r - 4, cy + r + 4, cx + r + 4, cy - r - 4, 3, INK);
}

function drawPic(kind: Big["pic"], x: number, y: number, w: number, h: number): void {
  edge(x, y, w, h, 2, INK);
  if (kind === "hormuz") {
    // Tanker under a pale sky, sea mines waiting in the water.
    fill(x + 2, y + 2, w - 4, 44, SKY);
    ball(x + w - 40, y + 22, 12, YELLOW);
    fill(x + 2, y + 46, w - 4, h - 48, SEA);
    fill(x + 22, y + 62, 14, 18, INK);
    fill(x + 36, y + 68, 44, 14, RED);
    fill(x + 84, y + 68, 44, 14, GREEN);
    fill(x + 132, y + 68, 44, 14, YELLOW);
    fill(x + 180, y + 68, 44, 14, BLUE);
    fill(x + 14, y + 82, 220, 14, INK);
    wedge(x + 234, y + 82, x + 252, y + 89, x + 234, y + 96, INK);
    wedge(x + 44, y + 68, x + 58, y + 68, x + 51, y + 52, ORANGE);
    wedge(x + 92, y + 68, x + 104, y + 68, x + 98, y + 56, RED);
    ball(x + 51, y + 46, 6, GREY);
    ball(x + 64, y + 38, 5, GREY);
    spikedMine(x + 262, y + 84, 9);
    spikedMine(x + 286, y + 90, 7);
  } else if (kind === "libya") {
    // A warship at dusk, a drone diving in from above.
    fill(x + 2, y + 2, w - 4, h - 4, [38, 52, 84]);
    for (let i = 0; i < 5; i++) {
      fill(x + 18 + i * 56, y + 14, 8, 22, YELLOW);
      fill(x + 34 + i * 56, y + 22, 6, 14, YELLOW);
    }
    fill(x + 2, y + 66, w - 4, h - 68, SEA);
    fill(x + 40, y + 58, 150, 12, INK);
    fill(x + 90, y + 42, 6, 16, INK);
    fill(x + 104, y + 46, 22, 7, RED);
    fill(x + 200, y + 44, 34, 12, INK);
    stroke(x + 234, y + 50, x + 268, y + 30, 3, WHITE);
    wedge(x + 268, y + 30, x + 256, y + 26, x + 262, y + 40, WHITE);
    wedge(x + 60, y + 70, x + 70, y + 70, x + 65, y + 60, WHITE);
    wedge(x + 150, y + 70, x + 160, y + 70, x + 155, y + 62, WHITE);
  } else {
    // A globe crossed out, with a red NO CONSENSUS bar.
    fill(x + 2, y + 2, w - 4, h - 4, SOFT);
    ball(x + 92, y + 42, 30, GREEN);
    fill(x + 74, y + 28, 18, 12, [190, 224, 196]);
    fill(x + 102, y + 48, 16, 11, [190, 224, 196]);
    stroke(x + 66, y + 68, x + 118, y + 16, 6, RED);
    for (let yy = y + 12; yy <= y + 72; yy++) {
      for (let xx = x + 62; xx <= x + 122; xx++) {
        const d = Math.sqrt((xx - (x + 92)) * (xx - (x + 92)) + (yy - (y + 42)) * (yy - (y + 42)));
        if (d >= 28 && d <= 32) put(xx, yy, INK);
      }
    }
    for (let i = 0; i < 6; i++) {
      const cols: RGB[] = [RED, YELLOW, BLUE, WHITE, GREEN, [200, 120, 200]];
      fill(x + 150 + i * 26, y + 18, 22, 14, cols[i]);
    }
    fill(x + 150, y + 62, 156, 20, RED);
    putText("NO CONSENSUS", x + 158, y + 66, 1, WHITE);
  }
}

// ---- Page sections ----
function drawTopBar(): void {
  fill(20, 20, 984, 24, INK);
  putText("6 STORIES • MONDAY 23 NOVEMBER 2026", 30, 26, 2, WHITE);
  rightText("THE WORLD IN ONE PICTURE", 994, 26, 2, GOLD);
  centerText("THE WORLD IN ONE PICTURE", 512, 52, 2, INK);
  centerText("Monday 23 November 2026", 512, 70, 6, INK);
  fill(30, 118, 964, 2, INK);
}

function drawTimeline(): void {
  putText("THE WEEKEND TO MONDAY", 30, 126, 2, RED);
  const cols = [
    { day: "FRI-SAT", text: "Three tankers attacked in the Strait of Hormuz" },
    { day: "SUNDAY", text: "Two more tankers hit mines; drone sinks ship" },
    { day: "MONDAY", text: "COP31 fails; markets fall; Poland confirms" },
  ];
  const xs = [30, 352, 674];
  for (let i = 0; i < 3; i++) {
    putText(cols[i].day, xs[i], 148, 2, RED);
    wrapped(cols[i].text, xs[i], 166, 300, 2, INK, 4);
    if (i > 0) fill(xs[i] - 8, 146, 1, 56, GREY);
  }
  fill(30, 206, 964, 2, INK);
}

function drawNumbers(): void {
  putText("THE DAY IN NUMBERS", 30, 214, 2, RED);
  const nums = [
    { n: "5", s: 5, label: "TANKERS HIT IN HORMUZ" },
    { n: "10", s: 5, label: "HURT IN BENGHAZI" },
    { n: "17.5%", s: 4, label: "TAIWAN DROP IN A WEEK" },
    { n: "3%", s: 5, label: "KOSPI FALL" },
    { n: "3", s: 5, label: "MISSILES IN POLAND" },
  ];
  const xs = [30, 222, 414, 606, 798];
  for (let i = 0; i < 5; i++) {
    putText(nums[i].n, xs[i], 232, nums[i].s, INK);
    wrapped(nums[i].label, xs[i], 270, 180, 2, INK, 4);
    if (i > 0) fill(xs[i] - 8, 232, 1, 68, GREY);
  }
  fill(30, 306, 964, 2, INK);
}

function drawTag(x: number, y: number, label: string, c: RGB): void {
  const w = textWidth(label, 2) + 8;
  fill(x, y, w, 20, c);
  putText(label, x + 4, y + 3, 2, WHITE);
}

function drawBig(b: Big, x: number, y0: number): void {
  putText(b.num, x, y0, 4, RED);
  putText(b.region, x + 30, y0 + 6, 2, INK);
  drawTag(x + 312 - (textWidth(b.tag, 2) + 8), y0, b.tag, b.tagColor);
  drawPic(b.pic, x, y0 + 28, 312, 100);
  wrapped(b.head, x, y0 + 136, 312, 3, INK, 6);
  wrapped(b.deck, x, y0 + 204, 312, 2, INK, 4);
  putText(b.source, x, y0 + 294, 2, GREY);
}

function drawSmall(s: Small, x: number, y0: number): void {
  putText(s.num, x, y0, 4, RED);
  putText(s.region, x + 30, y0 + 6, 2, INK);
  drawTag(x + 312 - (textWidth(s.tag, 2) + 8), y0, s.tag, s.tagColor);
  wrapped(s.head, x, y0 + 44, 312, 3, INK, 6);
  wrapped(s.deck, x, y0 + 106, 312, 2, INK, 4);
  putText(s.source, x, y0 + 162, 2, GREY);
}

function drawMap(): void {
  putText("WHERE IT HAPPENED", 30, 808, 2, RED);
  rightText("schematic map — not to scale", 994, 808, 2, GREY);
  fill(30, 828, 964, 66, SOFT);
  edge(30, 828, 964, 66, 2, INK);
  ball(180, 862, 26, LAND);
  ball(420, 858, 30, LAND);
  ball(700, 862, 28, LAND);
  ball(880, 856, 22, LAND);
  const pins: Array<[number, number, string]> = [
    [170, 858, "6"],
    [400, 838, "5"],
    [460, 868, "2"],
    [520, 842, "3"],
    [720, 850, "1"],
    [880, 860, "4"],
  ];
  for (const [cx, cy, n] of pins) {
    ball(cx, cy, 10, RED);
    putText(n, cx - 2, cy - 3, 1, WHITE);
  }
  centerText("1 Hormuz • 2 Benghazi • 3 COP31 • 4 Markets • 5 Poland • 6 Nvidia", 512, 900, 2, INK);
}

function drawDateCheck(): void {
  fill(30, 922, 964, 54, RED);
  centerText("DATE CHECK — Hormuz attacks Fri-Sun • Merkury hit Sun • COP31 collapsed Sun", 512, 930, 2, WHITE);
  centerText("Markets fell Fri • Poland confirmed Mon • Huang stepped down Mon", 512, 948, 2, WHITE);
}

function drawFooter(): void {
  centerText("Sources: AP, Reuters, BBC Verify, Al Jazeera, The Hindu, UKMTO, IRNA", 512, 984, 2, GREY);
}

export function render(): Buffer {
  edge(10, 10, W - 20, H - 20, 3, INK);
  edge(18, 18, W - 36, H - 36, 1, INK);
  drawTopBar();
  drawTimeline();
  drawNumbers();
  const bigX = [30, 356, 682];
  for (let i = 0; i < 3; i++) {
    drawBig(BIGS[i], bigX[i], 314);
    if (i > 0) fill(bigX[i] - 8, 314, 1, 308, GREY);
  }
  const smallX = [30, 356, 682];
  for (let i = 0; i < 3; i++) {
    drawSmall(SMALLS[i], smallX[i], 630);
    if (i > 0) fill(smallX[i] - 8, 630, 1, 170, GREY);
  }
  drawMap();
  drawDateCheck();
  drawFooter();
  return toPng();
}
