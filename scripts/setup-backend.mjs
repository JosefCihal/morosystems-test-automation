/**
 * Clones the MoroSystems todo backend into `.backend/todo-be` at the tested commit and installs its dependencies,
 * unless that is done already. The OpenAPI snapshot in `openapi/` belongs to this commit; to test another version,
 * change the commit and run `npm run api:generate`.
 */
import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';

const REPOSITORY_URL = 'https://github.com/morosystems/todo-be.git';
const TESTED_COMMIT = '2cfa7c31aba1ee9f1086a3dcff22bae5c132952f';
const TARGET_DIR = '.backend/todo-be';
// Written only after a successful install, so an interrupted install is repeated.
const INSTALLED_MARKER = `${TARGET_DIR}/node_modules/.tested-commit`;

const run = (command) => execSync(command, { stdio: 'inherit' });

/** Commit checked out in the target directory, or undefined when it is not a usable clone. */
const headCommit = () => {
  try {
    return execSync(`git -C ${TARGET_DIR} rev-parse HEAD`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch {
    return undefined;
  }
};

// Without its own `.git`, `git -C` would fall back to this repository, so a broken clone is replaced.
if (!existsSync(`${TARGET_DIR}/.git`) || headCommit() !== TESTED_COMMIT) {
  rmSync(TARGET_DIR, { recursive: true, force: true });
  run(`git clone --quiet ${REPOSITORY_URL} ${TARGET_DIR}`);
  run(`git -C ${TARGET_DIR} checkout --quiet ${TESTED_COMMIT}`);
}
if (!existsSync(INSTALLED_MARKER)) {
  run(`npm --prefix ${TARGET_DIR} ci --no-audit --no-fund`);
  writeFileSync(INSTALLED_MARKER, TESTED_COMMIT);
}
