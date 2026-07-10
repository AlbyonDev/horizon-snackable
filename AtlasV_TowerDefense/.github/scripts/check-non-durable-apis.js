#!/usr/bin/env node

/**
 * Non-Durable API Check for Horizon Worlds 3P Snackables Content
 *
 * Two-phase check:
 *   1. Scan package.json for non-durable (Provisional/Experimental) dependencies.
 *   2. If found, scan ALL .ts files for actual imports of those non-durable APIs.
 *
 * Only blocks the PR if .ts files actually import non-durable APIs.
 * Exit code 0 = clean, 1 = violations found.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const FORBIDDEN_IMPORT_PATTERNS = [
  {
    pattern: /(?:from|import)\s+.*['"][^'"]*_provisional(?:['"\/])/,
    description: "Import from a Provisional package (name contains _provisional)",
  },
  {
    pattern: /(?:from|import)\s+.*['"][^'"]*_experimental(?:['"\/])/,
    description: "Import from an Experimental package (name contains _experimental)",
  },
];

function findNonDurableDeps(packageJsonPath) {
  const nonDurableDeps = [];

  if (!fs.existsSync(packageJsonPath)) {
    return nonDurableDeps;
  }

  let content;
  try {
    content = fs.readFileSync(packageJsonPath, "utf-8");
  } catch (err) {
    console.error(`Warning: Could not read ${packageJsonPath}: ${err.message}`);
    return nonDurableDeps;
  }

  let json;
  try {
    json = JSON.parse(content);
  } catch (err) {
    console.error(`Warning: Could not parse ${packageJsonPath}: ${err.message}`);
    return nonDurableDeps;
  }

  const depSections = [json.dependencies, json.devDependencies, json.peerDependencies];

  for (const section of depSections) {
    if (!section) continue;

    const depNames = Array.isArray(section)
      ? section.map((d) => d.name || "")
      : Object.keys(section);

    for (const depName of depNames) {
      if (
        depName.includes("_provisional") ||
        depName.includes("_experimental")
      ) {
        nonDurableDeps.push(depName);
      }
    }
  }

  return nonDurableDeps;
}

function findAllTsFiles() {
  const tsFiles = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        tsFiles.push(fullPath);
      }
    }
  }

  walk(".");
  return tsFiles;
}

function checkTypeScriptFile(filePath) {
  const violations = [];
  let content;

  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    console.error(`Warning: Could not read file ${filePath}: ${err.message}`);
    return violations;
  }

  const lines = content.split("\n");

  lines.forEach((line, index) => {
    for (const { pattern, description } of FORBIDDEN_IMPORT_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
          reason: description,
        });
        break;
      }
    }
  });

  return violations;
}

function main() {
  // Phase 1: Find all package.json files and check for non-durable dependencies
  const packageJsonPaths = [];

  function findPackageJsons(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
        findPackageJsons(fullPath);
      } else if (entry.isFile() && entry.name === "package.json") {
        packageJsonPaths.push(fullPath);
      }
    }
  }

  findPackageJsons(".");

  console.log(`Phase 1: Checking ${packageJsonPaths.length} package.json file(s) for non-durable dependencies...\n`);

  let allNonDurableDeps = [];
  for (const pkgPath of packageJsonPaths) {
    const deps = findNonDurableDeps(pkgPath);
    if (deps.length > 0) {
      console.log(`  ⚠️  ${pkgPath} has non-durable deps: ${deps.join(", ")}`);
      allNonDurableDeps = allNonDurableDeps.concat(deps);
    }
  }

  if (allNonDurableDeps.length === 0) {
    console.log("✅ No non-durable dependencies in package.json. Skipping .ts scan.");
    process.exit(0);
  }

  // Phase 2: Non-durable deps found — scan ALL .ts files for actual imports
  console.log(`\nPhase 2: Non-durable dependencies detected. Scanning all .ts files for actual imports...\n`);

  const tsFiles = findAllTsFiles();
  console.log(`  Found ${tsFiles.length} .ts file(s) to scan.\n`);

  let allViolations = [];

  for (const tsFile of tsFiles) {
    allViolations = allViolations.concat(checkTypeScriptFile(tsFile));
  }

  if (allViolations.length === 0) {
    console.log("✅ Non-durable packages are listed in package.json but not imported in any .ts files. No blocking violations.");
    process.exit(0);
  }

  console.error(
    `\n🚫 Found ${allViolations.length} non-durable API import(s) in .ts files:\n`
  );

  for (const v of allViolations) {
    const location = v.line ? `${v.file}:${v.line}` : v.file;
    console.error(`  ❌ ${location}`);
    console.error(`     ${v.content}`);
    console.error(`     Reason: ${v.reason}\n`);
  }

  console.error(
    "3P Snackable content must only use Durable APIs (meta/worlds_sdk)."
  );
  console.error(
    "Provisional and Experimental APIs have no stability guarantees and are not allowed."
  );

  process.exit(1);
}

main();
