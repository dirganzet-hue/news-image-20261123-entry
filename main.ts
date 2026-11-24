// main.ts — entrypoint for make.fun news-image-20261123 (v5).
// Renders the front page once and writes exactly one PNG to the output
// directory (MAKEFUN_OUTPUT_DIR, default /output). Deterministic.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderV5 } from './render-v5.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), renderV5());
