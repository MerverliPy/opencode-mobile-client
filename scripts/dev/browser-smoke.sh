#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
ARTIFACT_DIR="$REPO_ROOT/playwright-artifacts"
PREVIEW_URL="http://127.0.0.1:4173"
STANDARD_ARTIFACTS=(
  "sessions-screen.png"
  "task-screen.png"
  "tool-drawer.png"
  "offline-baseline.png"
  "offline-state.png"
  "offline-recovered.png"
)

probe_playwright_webkit() {
  REPO_ROOT="$REPO_ROOT" node --input-type=module <<'EOF'
import fs from 'node:fs';
import { createRequire } from 'node:module';

const repoRoot = process.env.REPO_ROOT;
const require = createRequire(`${repoRoot}/package.json`);

let playwright;

try {
  playwright = require('playwright');
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`PLAYWRIGHT_MODULE_MISSING:${reason}`);
  process.exit(11);
}

const executablePath = playwright.webkit.executablePath();

if (!executablePath || !fs.existsSync(executablePath)) {
  console.error(`PLAYWRIGHT_WEBKIT_MISSING:${executablePath || 'unknown'}`);
  process.exit(12);
}

console.log(executablePath);
EOF
}

ensure_playwright_webkit() {
  local probe_output=""
  local probe_status=0

  printf '\n%s\n' "==> Checking Playwright WebKit runtime"

  if probe_output="$(probe_playwright_webkit 2>&1)"; then
    printf '%s\n' "Playwright WebKit runtime is available."
    printf 'Executable: %s\n' "$probe_output"
    return 0
  else
    probe_status=$?
  fi

  case "$probe_status" in
    11)
      printf '%s\n' "Repo-owned Playwright is unavailable. Run \`npm install\` from repo root, then retry \`npm run browser:smoke\`." >&2
      printf '%s\n' "$probe_output" >&2
      return 1
      ;;
    12)
      printf '%s\n' "Playwright WebKit runtime is missing. Run \`npx playwright install webkit\` from repo root, then retry \`npm run browser:smoke\`." >&2
      printf '%s\n' "$probe_output" >&2
      return 1
      ;;
    *)
      printf '%s\n' "Unable to determine Playwright WebKit readiness before capture." >&2
      printf '%s\n' "$probe_output" >&2
      return 1
      ;;
  esac
}

print_usage() {
  printf '%s\n' "Usage: bash scripts/dev/browser-smoke.sh [--start-preview]"
  printf '%s\n' ""
  printf '%s\n' "Runs local validation and writes the standard browser-proof"
  printf '%s\n' "artifacts from a repo-owned Playwright capture flow."
  printf '%s\n' "Use --start-preview only when you need a manual preview session."
}

START_PREVIEW=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --start-preview)
      START_PREVIEW=1
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n\n' "$1" >&2
      print_usage >&2
      exit 1
      ;;
  esac
  shift
done

mkdir -p "$ARTIFACT_DIR"

for artifact in "${STANDARD_ARTIFACTS[@]}"; do
  rm -f "$ARTIFACT_DIR/$artifact"
done

printf '%s\n' "==> Running local validation"
ensure_playwright_webkit
npm --prefix "$REPO_ROOT" run validate:local

if [ "$START_PREVIEW" -eq 1 ]; then
  printf '\n%s\n' "==> Starting preview server"
  exec npm --prefix "$REPO_ROOT" run preview:host
fi

PREVIEW_PID=""
PREVIEW_LOG="$ARTIFACT_DIR/browser-smoke-preview.log"

cleanup() {
  if [ -n "$PREVIEW_PID" ] && kill -0 "$PREVIEW_PID" >/dev/null 2>&1; then
    kill "$PREVIEW_PID" >/dev/null 2>&1 || true
    wait "$PREVIEW_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

rm -f "$PREVIEW_LOG"

printf '\n%s\n' "==> Starting preview server"
npm --prefix "$REPO_ROOT" run preview:host >"$PREVIEW_LOG" 2>&1 &
PREVIEW_PID="$!"

printf '%s\n' "==> Waiting for preview server"
BASE_URL="$PREVIEW_URL" node --input-type=module <<'EOF'
const baseUrl = process.env.BASE_URL;
const deadline = Date.now() + 30000;

while (Date.now() < deadline) {
  try {
    const response = await fetch(baseUrl);
    if (response.ok) {
      process.exit(0);
    }
  } catch {
    // Keep retrying until the preview server is reachable.
  }

  await new Promise((resolve) => setTimeout(resolve, 250));
}

console.error(`Preview server did not become ready at ${baseUrl}.`);
process.exit(1);
EOF

printf '%s\n' "==> Capturing standard browser-proof artifacts"
REPO_ROOT="$REPO_ROOT" ARTIFACT_DIR="$ARTIFACT_DIR" BASE_URL="$PREVIEW_URL" node --input-type=module <<'EOF'
import path from 'node:path';

const repoRoot = process.env.REPO_ROOT;
const artifactDir = process.env.ARTIFACT_DIR;
const baseUrl = process.env.BASE_URL;

async function loadRepoOwnedPlaywright() {
  try {
    return await import('playwright');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Repo-owned Playwright is unavailable. Run \`npm install\` from repo root, then retry \`npm run browser:smoke\`.\nOriginal error: ${reason}`,
    );
  }
}

const { webkit } = await loadRepoOwnedPlaywright();

const artifactPath = (filename) => path.join(artifactDir, filename);
let browser;

try {
  browser = await webkit.launch();
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);

  if (reason.includes('Executable doesn\'t exist')) {
    throw new Error(
      `Playwright WebKit browser binaries are missing. Run \`npx playwright install webkit\` from repo root, then retry \`npm run browser:smoke\`.\nOriginal error: ${reason}`,
    );
  }

  throw error;
}
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  deviceScaleFactor: 3,
});
const page = await context.newPage();

async function waitForHydratedShell() {
  await page.waitForSelector('#main-content');
  await page.waitForFunction(() => {
    const text = document.body?.innerText ?? '';
    return !text.includes('Loading saved work from this device') && !text.includes('Task is waiting for local sessions to finish loading');
  });
}

async function ensureNoHorizontalScroll(label) {
  const metrics = await page.evaluate(() => {
    const mainContent = document.querySelector('#main-content');
    const target = mainContent ?? document.documentElement;
    return {
      clientWidth: target.clientWidth,
      scrollWidth: target.scrollWidth,
    };
  });

  if (metrics.scrollWidth > metrics.clientWidth + 1) {
    throw new Error(`${label} requires horizontal scrolling (${metrics.scrollWidth} > ${metrics.clientWidth}).`);
  }
}

async function gotoRoute(hash) {
  await page.goto(`${baseUrl}/${hash}`, { waitUntil: 'networkidle' });
  await waitForHydratedShell();
}

await gotoRoute('#sessions');
await page.evaluate(async () => {
  window.localStorage.clear();
  window.sessionStorage.clear();

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
});

await page.reload({ waitUntil: 'networkidle' });
await waitForHydratedShell();
await page.locator('[data-action="create-session"]').first().click();
await page.waitForURL(/#task$/);
await page.waitForSelector('#composer-input');
await ensureNoHorizontalScroll('Task view');
await page.screenshot({ path: artifactPath('task-screen.png') });

const toolsButton = page.locator('[data-action="open-tool-drawer"]').first();
await toolsButton.waitFor({ state: 'visible' });
await toolsButton.click();
await page.locator('#tool-drawer').waitFor({ state: 'visible' });
await page.screenshot({ path: artifactPath('tool-drawer.png') });
await page.locator('.tool-drawer .tool-nav-button[data-action="close-tool-drawer"]').click();
await page.locator('#tool-drawer').waitFor({ state: 'hidden' });

await gotoRoute('#sessions');
await page.locator('[data-action="select-session"]').first().waitFor({ state: 'visible' });
await ensureNoHorizontalScroll('Sessions view');
await page.screenshot({ path: artifactPath('sessions-screen.png') });
await page.screenshot({ path: artifactPath('offline-baseline.png') });

await context.setOffline(true);
await page.evaluate(() => window.dispatchEvent(new Event('offline')));
await page.waitForFunction(() => document.body?.innerText.includes('You are offline.'));
await page.screenshot({ path: artifactPath('offline-state.png') });

await context.setOffline(false);
await page.evaluate(() => window.dispatchEvent(new Event('online')));
await page.waitForFunction(() => document.body?.innerText.includes('Back online.'));
await page.screenshot({ path: artifactPath('offline-recovered.png') });

await browser.close();
EOF

printf '\n%s\n' "==> Browser smoke prep complete"
printf '%s\n' "Artifacts directory: $ARTIFACT_DIR"
printf '%s\n' "Required screenshot targets:"
for artifact in "${STANDARD_ARTIFACTS[@]}"; do
  printf '  - %s\n' "$artifact"
done
