// The World on Monday — one newspaper-style image summing up Monday 23 November 2026.
// Draws a 1024x1024 PNG with a masthead, a lead story and five more stories, using only
// Node's standard library. No network, no randomness, no clock: running it twice gives
// byte-identical output. Written from scratch for this entry.
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// Palette: warm newsprint paper, near-black ink, and a few flat accent colours.
const PAPER: [number, number, number] = [246, 241, 227];
const INK: [number, number, number] = [17, 17, 17];
const RED: [number, number, number] = [179, 38, 30];
const BLUE: [number, number, number] = [29, 78, 137];
const SEA: [number, number, number] = [38, 110, 168];
const SKY: [number, number, number] = [207, 228, 242];
const GREEN: [number, number, number] = [46, 125, 70];
const ORANGE: [number, number, number] = [230, 126, 34];
const YELLOW: [number, number, number] = [240, 196, 25];
const GREY: [number, number, number] = [120, 120, 116];
const LIGHTGREY: [number, number, number] = [226, 220, 205];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK: [number, number, number] = [34, 34, 34];

type RGB = [number, number, number];

class Canvas {
  data = new Uint8Array(W * H * 3);
  constructor() {
    for (let i = 0; i < W * H; i++) {
      this.data[i * 3] = PAPER[0];
      this.data[i * 3 + 1] = PAPER[1];
      this.data[i * 3 + 2] = PAPER[2];
    }
  }
  px(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) this.px(i, j, c);
    }
  }
  frame(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
    this.rect(x, y, w, t, c);
    this.rect(x, y + h - t, w, t, c);
    this.rect(x, y, t, h, c);
    this.rect(x + w - t, y, t, h, c);
  }
  hline(x0: number, x1: number, y: number, t: number, c: RGB): void {
    this.rect(x0, y, x1 - x0, t, c);
  }
  vline(x: number, y0: number, y1: number, t: number, c: RGB): void {
    this.rect(x, y0, t, y1 - y0, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (let steps = 0; steps < 4000; steps++) {
      this.rect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
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
  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r * r) this.px(x, y, c);
      }
    }
  }
  ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
    for (let y = cy - r - t; y <= cy + r + t; y++) {
      for (let x = cx - r - t; x <= cx + r + t; x++) {
        const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (d >= r - t / 2 && d <= r + t / 2) this.px(x, y, c);
      }
    }
  }
  triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
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
        const g = 1 - a - b;
        if (a >= 0 && b >= 0 && g >= 0) this.px(x, y, c);
      }
    }
  }
}

// A 5x7 bitmap font, one row per number, bit 4 = leftmost column. Hand-drawn here.
const FONT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  a: [0, 0, 14, 1, 15, 17, 15], b: [16, 16, 30, 17, 17, 17, 30],
  c: [0, 0, 14, 17, 16, 17, 14], d: [1, 1, 15, 17, 17, 17, 15],
  e: [0, 0, 14, 17, 31, 16, 14], f: [6, 9, 8, 30, 8, 8, 8],
  g: [0, 15, 17, 17, 15, 1, 14], h: [16, 16, 30, 17, 17, 17, 17],
  i: [4, 0, 12, 4, 4, 4, 14], j: [2, 0, 6, 2, 2, 18, 12],
  k: [16, 16, 18, 20, 24, 20, 18], l: [12, 4, 4, 4, 4, 4, 14],
  m: [0, 0, 26, 21, 21, 21, 21], n: [0, 0, 30, 17, 17, 17, 17],
  o: [0, 0, 14, 17, 17, 17, 14], p: [0, 0, 30, 17, 30, 16, 16],
  q: [0, 0, 15, 17, 15, 1, 1], r: [0, 0, 22, 25, 16, 16, 16],
  s: [0, 0, 15, 16, 14, 1, 30], t: [8, 8, 28, 8, 8, 9, 6],
  u: [0, 0, 17, 17, 17, 19, 13], v: [0, 0, 17, 17, 17, 10, 4],
  w: [0, 0, 17, 21, 21, 21, 10], x: [0, 0, 17, 10, 4, 10, 17],
  y: [0, 0, 17, 17, 15, 1, 14], z: [0, 0, 31, 2, 4, 8, 31],
  "0": [14, 17, 19, 21, 25, 17, 14], "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31], "3": [31, 2, 4, 2, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2], "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14], "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14], "9": [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0], ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 4, 8], ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8], "-": [0, 0, 0, 14, 0, 0, 0],
  "'": [4, 4, 8, 0, 0, 0, 0], '"': [10, 10, 10, 0, 0, 0, 0],
  "(": [2, 4, 8, 8, 8, 4, 2], ")": [8, 4, 2, 2, 2, 4, 8],
  "%": [25, 26, 2, 4, 8, 11, 19], "/": [1, 2, 2, 4, 8, 8, 16],
  "&": [12, 18, 20, 8, 21, 18, 13], "!": [4, 4, 4, 4, 4, 0, 4],
  "?": [14, 17, 1, 6, 4, 0, 4], "=": [0, 0, 31, 0, 31, 0, 0],
  "+": [0, 4, 4, 31, 4, 4, 0], "\u2022": [0, 0, 12, 12, 12, 0, 0],
};

function drawChar(cv: Canvas, ch: string, x: number, y: number, s: number, c: RGB): void {
  const rows = FONT[ch] ?? FONT["?"];
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if ((rows[r] >> (4 - col)) & 1) cv.rect(x + col * s, y + r * s, s, s, c);
    }
  }
}

function textWidth(s: string, scale: number): number {
  if (s.length === 0) return 0;
  return s.length * 6 * scale - scale;
}

function drawText(cv: Canvas, s: string, x: number, y: number, scale: number, c: RGB): void {
  for (let i = 0; i < s.length; i++) drawChar(cv, s[i], x + i * 6 * scale, y, scale, c);
}

function drawCentered(cv: Canvas, s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(cv, s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

// Greedy word wrap. Returns lines that fit maxWidth at the given scale.
function wrap(text: string, maxWidth: number, scale: number): string[] {
  const words = text.split(" ");
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

function drawWrapped(cv: Canvas, text: string, x: number, y: number, maxWidth: number, scale: number, c: RGB, gap: number): number {
  const lines = wrap(text, maxWidth, scale);
  for (let i = 0; i < lines.length; i++) {
    drawText(cv, lines[i], x, y + i * (7 * scale + gap), scale, c);
  }
  return lines.length * (7 * scale + gap);
}

// ---- PNG encoding (deterministic: fixed zlib level, no timestamps anywhere) ----
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(cv: Canvas): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(W, 0);
  header.writeUInt32BE(H, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type 2 = RGB
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(cv.data.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- The six verified stories of Monday 23 November 2026 ----
interface Story {
  kicker: string;
  headline: string;
  summary: string;
  source: string;
}

const LEAD: Story = {
  kicker: "STRAIT OF HORMUZ - LEAD STORY",
  headline: "TANKERS HIT BY MINES AS ATTACKS SURGE IN THE STRAIT",
  summary:
    "At least three tankers were attacked in and near the Strait of Hormuz on Friday and Saturday, and two more caught fire on Sunday after striking sea mines. Attacks on shipping there are at their highest since the war began.",
  source: "Sources: AP, CNN, UKMTO, IRNA",
};

const STORIES: Story[] = [
  {
    kicker: "LIBYA",
    headline: "SEA DRONE HITS RUSSIAN WARSHIP IN BENGHAZI",
    summary:
      "A suspected Ukrainian sea drone struck the Russian corvette Merkury at Benghazi on Sunday. The ship later sank; ten were hurt.",
    source: "Sources: AP, Reuters, BBC Verify",
  },
  {
    kicker: "CLIMATE - COP31",
    headline: "COP31 TALKS COLLAPSE WITH NO DEAL",
    summary:
      "Climate talks at COP31 collapsed without agreement after a record extension, deadlocked over language on phasing out fossil fuels.",
    source: "Sources: Reuters, The Hindu",
  },
  {
    kicker: "MARKETS",
    headline: "STOCKS SLIDE AS AI-BUBBLE FEARS SPREAD",
    summary:
      "US stocks fell sharply on Friday; Asian markets braced. Taiwan is down 17.5% in a week; South Korea's Kospi fell over 3% on AI-bubble fears.",
    source: "Sources: Al Jazeera",
  },
  {
    kicker: "POLAND - NATO",
    headline: "POLAND SAYS FALLEN OBJECTS WERE RUSSIAN MISSILES",
    summary:
      "Polish authorities confirmed three objects that fell in south-east Poland were Russian cruise missiles. NATO will meet over the incident.",
    source: "Sources: Polish authorities",
  },
];

// ---- Small flat icons, one per story ----
function iconLibya(cv: Canvas, x: number, y: number): void {
  cv.rect(x, y + 34, 104, 20, SEA);
  cv.rect(x + 14, y + 18, 62, 14, DARK); // hull
  cv.rect(x + 30, y + 6, 5, 12, DARK); // mast
  cv.rect(x + 44, y + 10, 16, 5, RED); // flag
  cv.rect(x + 82, y + 8, 12, 4, INK); // drone body
  cv.line(x + 80, y + 6, x + 96, y + 6, 2, INK); // rotor
  cv.triangle(x + 76, y + 32, x + 84, y + 32, x + 80, y + 24, WHITE); // splash
  cv.triangle(x + 88, y + 34, x + 96, y + 34, x + 92, y + 26, WHITE);
}

function iconCop(cv: Canvas, x: number, y: number): void {
  cv.circle(x + 30, y + 27, 24, GREEN);
  cv.rect(x + 16, y + 16, 14, 9, LIGHTGREY);
  cv.rect(x + 36, y + 30, 12, 8, LIGHTGREY);
  cv.line(x + 8, y + 50, x + 52, y + 4, 4, RED); // slash: no deal
  cv.ring(x + 30, y + 27, 24, 2, INK);
}

function iconMarkets(cv: Canvas, x: number, y: number): void {
  cv.rect(x + 6, y + 40, 8, 12, GREY);
  cv.rect(x + 20, y + 32, 8, 20, GREY);
  cv.rect(x + 34, y + 22, 8, 30, RED);
  cv.rect(x + 48, y + 12, 8, 40, RED);
  cv.line(x + 4, y + 10, x + 30, y + 26, 3, RED);
  cv.line(x + 30, y + 26, x + 56, y + 20, 3, RED);
  cv.line(x + 56, y + 20, x + 92, y + 46, 3, RED);
  cv.triangle(x + 92, y + 46, x + 82, y + 42, x + 88, y + 52, RED);
}

function iconPoland(cv: Canvas, x: number, y: number): void {
  cv.rect(x + 4, y + 30, 44, 11, WHITE);
  cv.rect(x + 4, y + 41, 44, 11, RED);
  cv.frame(x + 4, y + 30, 44, 22, 2, INK);
  cv.line(x + 56, y + 8, x + 92, y + 30, 5, DARK); // missile
  cv.triangle(x + 92, y + 30, x + 82, y + 26, x + 86, y + 38, DARK);
  cv.circle(x + 60, y + 12, 4, YELLOW);
  cv.circle(x + 96, y + 34, 4, YELLOW);
  cv.circle(x + 88, y + 20, 3, ORANGE);
}

function iconHormuz(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, Math.floor(h * 0.42), SKY);
  cv.circle(x + w - 52, y + 34, 22, YELLOW); // sun
  cv.rect(x, y + Math.floor(h * 0.42), w, h - Math.floor(h * 0.42), SEA);
  cv.rect(x + 18, y + Math.floor(h * 0.58), w - 60, 26, DARK); // tanker hull
  cv.rect(x + 30, y + Math.floor(h * 0.58) - 22, 34, 22, RED); // container
  cv.rect(x + 70, y + Math.floor(h * 0.58) - 22, 34, 22, GREEN);
  cv.rect(x + 110, y + Math.floor(h * 0.58) - 22, 34, 22, YELLOW);
  cv.rect(x + w - 66, y + Math.floor(h * 0.58) - 34, 14, 34, DARK); // funnel
  // Sea mine with spikes, in the water to the right of the tanker.
  const mx = x + w - 36;
  const my = y + Math.floor(h * 0.62);
  cv.circle(mx, my, 13, INK);
  cv.line(mx - 20, my, mx + 20, my, 3, INK);
  cv.line(mx, my - 20, mx, my + 20, 3, INK);
  cv.line(mx - 14, my - 14, mx + 14, my + 14, 3, INK);
  cv.line(mx - 14, my + 14, mx + 14, my - 14, 3, INK);
  // Flames above the tanker and smoke.
  cv.triangle(x + 44, y + Math.floor(h * 0.58) - 22, x + 62, y + Math.floor(h * 0.58) - 22, x + 53, y + Math.floor(h * 0.58) - 52, ORANGE);
  cv.triangle(x + 84, y + Math.floor(h * 0.58) - 22, x + 100, y + Math.floor(h * 0.58) - 22, x + 92, y + Math.floor(h * 0.58) - 44, RED);
  cv.circle(x + 53, y + Math.floor(h * 0.58) - 62, 9, GREY);
  cv.circle(x + 70, y + Math.floor(h * 0.58) - 74, 7, GREY);
  // Waves.
  for (let i = 0; i < 5; i++) {
    cv.line(x + 10 + i * 62, y + h - 26, x + 34 + i * 62, y + h - 26, 3, WHITE);
  }
}

function iconChip(cv: Canvas, x: number, y: number, s: number): void {
  for (let i = 0; i < 4; i++) {
    cv.rect(x + 8 + i * 16, y - 6, 6, 6, INK);
    cv.rect(x + 8 + i * 16, y + s, 6, 6, INK);
    cv.rect(x - 6, y + 8 + i * 16, 6, 6, INK);
    cv.rect(x + s, y + 8 + i * 16, 6, 6, INK);
  }
  cv.rect(x, y, s, s, GREEN);
  cv.rect(x + 14, y + 14, s - 28, s - 28, DARK);
  cv.line(x + s + 12, y + 8, x + s + 12, y + s - 8, 4, RED);
  cv.triangle(x + s + 12, y + s - 4, x + s + 4, y + s - 14, x + s + 20, y + s - 14, RED);
}

// ---- Layout ----
function drawMasthead(cv: Canvas): void {
  drawCentered(cv, "THE WORLD ON MONDAY", 512, 32, 6, INK);
  cv.hline(40, 984, 88, 2, INK);
  drawCentered(cv, "MONDAY, 23 NOVEMBER 2026", 512, 98, 2, RED);
  drawCentered(cv, "SIX STORIES FROM ONE DAY IN WORLD NEWS", 512, 122, 2, INK);
  cv.hline(40, 984, 146, 3, INK);
}

function drawLead(cv: Canvas): void {
  const x0 = 30;
  const y0 = 158;
  const x1 = 994;
  const y1 = 424;
  cv.frame(x0, y0, x1 - x0, y1 - y0, 2, INK);
  drawText(cv, LEAD.kicker, x0 + 14, y0 + 12, 2, RED);
  const headY = y0 + 40;
  drawWrapped(cv, LEAD.headline, x0 + 14, headY, 560, 3, INK, 6);
  drawWrapped(cv, LEAD.summary, x0 + 14, headY + 96, 560, 2, INK, 4);
  drawText(cv, LEAD.source, x0 + 14, y1 - 26, 2, BLUE);
  cv.vline(622, y0 + 12, y1 - 12, 2, INK);
  iconHormuz(cv, 636, y0 + 12, 344, y1 - y0 - 24);
}

function drawCell(cv: Canvas, s: Story, x0: number, y0: number, w: number, h: number, icon: (cv: Canvas, x: number, y: number) => void): void {
  cv.frame(x0, y0, w, h, 2, INK);
  drawText(cv, s.kicker, x0 + 12, y0 + 12, 2, RED);
  const iconX = x0 + w - 118;
  const iconY = y0 + 38;
  icon(cv, iconX, iconY);
  drawWrapped(cv, s.headline, x0 + 12, y0 + 38, w - 142, 3, INK, 6);
  const summaryY = y0 + 38 + 3 * 27 + 8;
  drawWrapped(cv, s.summary, x0 + 12, summaryY, w - 24, 2, INK, 4);
  drawText(cv, s.source, x0 + 12, y0 + h - 16, 1, BLUE);
}

function drawNvidia(cv: Canvas): void {
  const x0 = 30;
  const y0 = 892;
  const x1 = 994;
  const y1 = 990;
  cv.frame(x0, y0, x1 - x0, y1 - y0, 2, INK);
  iconChip(cv, 48, y0 + 26, 52);
  drawText(cv, "TECH - NVIDIA", 128, y0 + 12, 2, RED);
  drawText(cv, "Source: SimpleLife", x1 - 14 - textWidth("Source: SimpleLife", 1), y0 + 12, 1, BLUE);
  drawText(cv, "NVIDIA CHIEF JENSEN HUANG STEPS DOWN", 128, y0 + 34, 3, INK);
  drawText(cv, "Jensen Huang has stepped down as chief executive of Nvidia,", 128, y0 + 64, 2, INK);
  drawText(cv, "and the board confirmed he will not return.", 128, y0 + 82, 2, INK);
}

function drawFooter(cv: Canvas): void {
  drawCentered(
    cv,
    "Sources: AP, Reuters, BBC Verify, Al Jazeera, The Hindu, UKMTO, IRNA - Monday 23 November 2026",
    512,
    997,
    1,
    GREY,
  );
}

function buildImage(): Buffer {
  const cv = new Canvas();
  cv.frame(10, 10, W - 20, H - 20, 3, INK);
  cv.frame(18, 18, W - 36, H - 36, 1, INK);
  drawMasthead(cv);
  drawLead(cv);
  const icons = [iconLibya, iconCop, iconMarkets, iconPoland];
  const cells: Array<[number, number]> = [
    [30, 436],
    [518, 436],
    [30, 664],
    [518, 664],
  ];
  for (let i = 0; i < 4; i++) {
    drawCell(cv, STORIES[i], cells[i][0], cells[i][1], 476, 216, icons[i]);
  }
  drawNvidia(cv);
  drawFooter(cv);
  return encodePNG(cv);
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const png = buildImage();
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
}

main();
