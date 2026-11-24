// The World on Monday, v3 — entrypoint: renders the new poster front page
// (see render-v3.ts) and writes the single image to the output folder.
import * as fs from "node:fs";
import * as path from "node:path";
import { render } from "./render-v3.ts";

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "entry.png"), render());
