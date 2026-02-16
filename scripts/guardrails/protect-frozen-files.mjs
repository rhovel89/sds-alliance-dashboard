import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const FROZEN = [
  "src/pages/calendar/AllianceCalendarPage.tsx",
  "src/components/calendar/RecurringControls.tsx",
  "src/utils/recurrence.ts",
  "src/pages/hq/AllianceHQMap.tsx",
  "src/pages/hq-map/AllianceHQMap.tsx",
  "src/components/hq/AllianceHQMap.tsx",
  "src/AllianceHQMap.tsx",
].filter((p) => existsSync(p));

function hasGit() {
  try {
    execSync("git --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!hasGit()) {
  console.warn("[frozen-files] git not found; skipping frozen file check in this environment.");
  process.exit(0);
}

function diffNames(cmd) {
  try {
    const out = execSync(cmd, { encoding: "utf8" }).trim();
    return out ? out.split(/\r?\n/) : [];
  } catch {
    return [];
  }
}

const changed = new Set([
  ...diffNames("git diff --name-only"),
  ...diffNames("git diff --name-only --cached"),
]);

const violations = FROZEN.filter((f) => changed.has(f));

if (violations.length) {
  console.error("\n🚫 FROZEN FILES MODIFIED (blocked):\n");
  for (const v of violations) console.error(" - " + v);
  console.error("\nRevert changes to frozen files before building.\n");
  process.exit(1);
}

console.log("[frozen-files] OK");
