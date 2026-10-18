/**
 * Downloads the OpenAPI document from a running backend and stores it as the versioned contract snapshot.
 * Part of `npm run api:generate`, which regenerates the TypeScript types from the snapshot afterwards.
 */
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

// Same configuration as the tests (see src/config/env.ts): `.env` overrides, real environment variables win,
// and an empty variable counts as not set.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const SPEC_URL = new URL('/v3/api-docs', BASE_URL);
const OUTPUT_FILE = 'openapi/todo-api.json';

const response = await fetch(SPEC_URL).catch((error) => {
  console.error(`Backend is not reachable at ${BASE_URL}. Start it with "npm run backend:start".`);
  throw error;
});

if (!response.ok) {
  throw new Error(`Failed to download ${SPEC_URL}: HTTP ${response.status}`);
}

const spec = await response.json();
// Guards the snapshot against being overwritten by another JSON document, e.g. from a wrong API_BASE_URL.
if (typeof spec?.paths !== 'object' || spec.paths === null) {
  throw new Error(`${SPEC_URL} is not an OpenAPI document: it has no "paths"`);
}
await writeFile(OUTPUT_FILE, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`OpenAPI spec saved to ${OUTPUT_FILE}`);
