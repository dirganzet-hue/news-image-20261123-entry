// The World on Monday, v3 — a poster, not a newspaper.
// Round 2 (v2) fell to 38.1%: the page was still too dense at a glance.
// This version bets everything on readability: one huge masthead, one big
// hero picture with a single giant headline, and five wide strips where
// every story is one short headline plus one short line. Nothing smaller
// than scale 3 except the sources line. Same six verified stories of
// Monday 23 November 2026 — only the visuals changed. Node standard
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
const GREEN: RGB = [44, 122, 68];
const ORANGE: RGB = [228, 124, 30];
const YELLOW: RGB = [240, 196, 25];
const GREY: RGB = [118, 118, 114];
const SOFT: RGB = [232, 226, 210];
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

// ---- The five stories below the hero (the sixth is the hero itself) ----
// Headline: one line, scale 4. Deck: one line, scale 3. Nothing smaller.
interface Strip {
  head: string;
  deck: string;
  icon: "libya" | "cop" | "markets" | "poland" | "nvidia";
}

const STRIPS: Strip[] = [
  {
    head: "SEA DRONE HITS RUSSIAN WARSHIP",
    deck: "Ukrainian drone hit corvette Merkury; it sank",
    icon: "libya",
  },
  {
    head: "COP31 COLLAPSES, NO DEAL",
    deck: "Climate talks fail after a record extension.",
    icon: "cop",
  },
  {
    head: "MARKETS SLIDE ON AI FEARS",
    deck: "Kospi -3%, Taiwan -17.5% in a week.",
    icon: "markets",
  },
  {
    head: "POLAND: RUSSIAN MISSILES FELL",
    deck: "Three fallen objects were Russian missiles.",
    icon: "poland",
  },
  {
    head: "NVIDIA CHIEF HUANG STEPS DOWN",
    deck: "Jensen Huang leaves; board says no return.",
    icon: "nvidia",
  },
];

// ---- Icons: chunky 72x72 pictures, drawn fresh for this poster ----
function spikedMine(cx: number, cy: number, r: number): void {
  ball(cx, cy, r, INK);
  stroke(cx - r - 7, cy, cx + r + 7, cy, 3, INK);
  stroke(cx, cy - r - 7, cx, cy + r + 7, 3, INK);
  stroke(cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4, 3, INK);
  stroke(cx - r - 4, cy + r + 4, cx + r + 4, cy - r - 4, 3, INK);
}

function drawIcon(kind: Strip["icon"], x: number, y: number): void {
  if (kind === "libya") {
    // A warship on the sea, a drone above it.
    fill(x, y + 46, 72, 18, SEA);
    fill(x + 8, y + 30, 44, 14, INK);
    fill(x + 20, y + 18, 5, 12, INK);
    fill(x + 30, y + 22, 16, 6, RED);
    fill(x + 56, y + 8, 16, 5, INK);
    stroke(x + 54, y + 6, x + 74, y + 6, 2, INK);
    wedge(x + 52, y + 46, x + 58, y + 46, x + 55, y + 36, WHITE);
    wedge(x + 62, y + 46, x + 68, y + 46, x + 65, y + 38, WHITE);
  } else if (kind === "cop") {
    // A globe crossed out.
    ball(x + 30, y + 30, 26, GREEN);
    fill(x + 16, y + 18, 15, 10, SOFT);
    fill(x + 34, y + 34, 14, 10, SOFT);
    stroke(x + 6, y + 54, x + 54, y + 6, 6, RED);
    for (let yy = y + 4; yy <= y + 56; yy++) {
      for (let xx = x + 4; xx <= x + 56; xx++) {
        const d = Math.sqrt((xx - (x + 30)) * (xx - (x + 30)) + (yy - (y + 30)) * (yy - (y + 30)));
        if (d >= 24 && d <= 28) put(xx, yy, INK);
      }
    }
  } else if (kind === "markets") {
    // Falling bars and a red arrow down.
    fill(x + 8, y + 46, 11, 16, GREY);
    fill(x + 25, y + 34, 11, 28, GREY);
    fill(x + 42, y + 22, 11, 40, RED);
    fill(x + 59, y + 10, 11, 52, RED);
    stroke(x + 8, y + 12, x + 30, y + 28, 4, RED);
    stroke(x + 30, y + 28, x + 52, y + 20, 4, RED);
    stroke(x + 52, y + 20, x + 70, y + 50, 4, RED);
    wedge(x + 70, y + 52, x + 60, y + 46, x + 68, y + 58, RED);
  } else if (kind === "poland") {
    // Polish flag and a missile streaking in.
    fill(x + 4, y + 40, 44, 12, WHITE);
    fill(x + 4, y + 52, 44, 12, RED);
    edge(x + 4, y + 40, 44, 24, 2, INK);
    stroke(x + 52, y + 10, x + 70, y + 28, 5, INK);
    wedge(x + 70, y + 28, x + 60, y + 24, x + 64, y + 36, INK);
    ball(x + 54, y + 14, 4, YELLOW);
    ball(x + 72, y + 30, 4, YELLOW);
  } else {
    // A chip with a red down arrow beside it.
    fill(x, y + 8, 48, 48, GREEN);
    fill(x + 12, y + 20, 24, 24, INK);
    for (let i = 0; i < 3; i++) {
      fill(x + 10 + i * 14, y, 6, 8, INK);
      fill(x + 10 + i * 14, y + 56, 6, 8, INK);
      fill(x, y + 10 + i * 14, 8, 6, INK);
    }
    stroke(x + 62, y + 14, x + 62, y + 50, 4, RED);
    wedge(x + 62, y + 56, x + 54, y + 44, x + 70, y + 44, RED);
  }
}

// ---- Hero: the Strait of Hormuz, drawn big across the whole page ----
function drawHeroScene(): void {
  fill(32, 142, 960, 108, SKY);
  ball(920, 180, 24, YELLOW);
  ball(150, 182, 14, WHITE);
  ball(182, 192, 10, WHITE);
  ball(700, 168, 12, WHITE);
  ball(728, 178, 9, WHITE);
  fill(32, 250, 960, 110, SEA);
  // Tanker, bow to the right, fully loaded.
  fill(88, 282, 18, 30, INK);
  fill(110, 288, 60, 24, RED);
  fill(180, 288, 60, 24, GREEN);
  fill(250, 288, 60, 24, YELLOW);
  fill(320, 288, 60, 24, BLUE);
  fill(390, 288, 60, 24, WHITE);
  fill(460, 288, 60, 24, ORANGE);
  fill(80, 312, 560, 34, INK);
  wedge(640, 312, 676, 329, 640, 346, INK);
  // Fire and smoke over the containers.
  wedge(120, 288, 142, 288, 131, 256, ORANGE);
  wedge(196, 288, 212, 288, 204, 264, RED);
  ball(131, 246, 9, GREY);
  ball(150, 234, 7, GREY);
  ball(112, 238, 6, GREY);
  // Sea mines in the water, right of the tanker.
  spikedMine(760, 340, 13);
  spikedMine(862, 362, 11);
  wedge(740, 356, 750, 356, 745, 344, WHITE);
  wedge(846, 376, 856, 376, 851, 366, WHITE);
  // Whitecaps.
  for (let i = 0; i < 6; i++) {
    stroke(60 + i * 150, 352, 92 + i * 150, 352, 3, WHITE);
  }
}

function drawMasthead(): void {
  centerText("THE WORLD ON MONDAY", 512, 24, 8, INK);
  fill(40, 92, 944, 36, RED);
  centerText("MONDAY 23 NOVEMBER 2026", 512, 100, 3, WHITE);
}

function drawHero(): void {
  edge(30, 140, 964, 344, 2, INK);
  drawHeroScene();
  fill(30, 360, 964, 2, INK);
  fill(32, 362, 960, 120, INK);
  putText("STRAIT OF HORMUZ", 46, 372, 3, HOTRED);
  putText("TANKERS HIT BY MINES", 46, 400, 6, WHITE);
  putText("Two more ablaze after hitting sea mines.", 46, 452, 3, WHITE);
}

function drawStrip(s: Strip, y0: number, odd: boolean): void {
  fill(32, y0 + 2, 960, 88, odd ? SOFT : PAPER);
  edge(30, y0, 964, 92, 2, INK);
  drawIcon(s.icon, 44, y0 + 10);
  putText(s.head, 132, y0 + 12, 4, INK);
  putText(s.deck, 132, y0 + 52, 3, INK);
}

function drawFooter(): void {
  centerText("Sources: AP, Reuters, BBC Verify, Al Jazeera, The Hindu, UKMTO, IRNA", 512, 988, 2, GREY);
}

export function render(): Buffer {
  edge(10, 10, W - 20, H - 20, 3, INK);
  edge(18, 18, W - 36, H - 36, 1, INK);
  drawMasthead();
  drawHero();
  for (let i = 0; i < STRIPS.length; i++) {
    drawStrip(STRIPS[i], 496 + i * 98, i % 2 === 1);
  }
  drawFooter();
  return toPng();
}
