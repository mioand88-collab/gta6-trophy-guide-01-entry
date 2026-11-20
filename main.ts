// Leonida Legends — entry program for the GTA VI trophy guide bounty.
//
// Copies app/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the
// kit's vendor/makefun-frontend.ts. Standard library only, no network.
//
// Run locally the same way the grader runs it:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

/** Where the grader expects the entry: /output, or MAKEFUN_OUTPUT_DIR outside it. */
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';

/** The caps this bounty gates on (see the kit's RULES.txt, "The gate"). */
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

/** The repository root: the directory holding this file. */
const REPO_ROOT = dirname(fileURLToPath(import.meta.url));

/** Copy one top-level directory of the repository into the output directory. */
function copyIntoOutput(name: string): void {
  cpSync(join(REPO_ROOT, name), join(OUTPUT_DIR, name), { recursive: true });
}

/** Confirm the output directory holds exactly what the entry hands in. */
function verifyOutput(): void {
  const dossierPath = join(OUTPUT_DIR, 'dossier.json');
  const again = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  const written = readFileSync(dossierPath);
  if (!written.equals(Buffer.from(again))) {
    throw new Error('dossier.json does not match a fresh buildDossier run');
  }
}

/** Build the entry's output directory from this repository. */
function main(): void {
  // Never remove OUTPUT_DIR itself: in the grader it is a mount point,
  // and rmSync on a mount point fails with EBUSY (exit 1). Empty only
  // its contents, then write into it.
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const child of readdirSync(OUTPUT_DIR)) {
    rmSync(join(OUTPUT_DIR, child), { recursive: true, force: true });
  }
  copyIntoOutput('app');
  copyIntoOutput('screenshots');
  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
  verifyOutput();
  console.log(`wrote ${OUTPUT_DIR}/dossier.json (${dossier.length} bytes)`);
}

main();
