#!/usr/bin/env node

/**
 * MP3 File Check for Horizon Worlds 3P Snackables Content
 *
 * Scans the repo for .mp3 files. All audio should use .ogg format.
 * Exit code 0 = clean, 1 = .mp3 files found.
 */

const fs = require("fs");
const path = require("path");

function findMp3Files() {
  const mp3Files = [];

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
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".mp3")) {
        mp3Files.push(fullPath);
      }
    }
  }

  walk(".");
  return mp3Files;
}

function main() {
  console.log("Checking for .mp3 files (use .ogg instead)...\n");

  const mp3Files = findMp3Files();

  if (mp3Files.length === 0) {
    console.log("✅ No .mp3 files found.");
    process.exit(0);
  }

  console.error(`🚫 Found ${mp3Files.length} .mp3 file(s). Use .ogg format instead:\n`);
  for (const f of mp3Files) {
    console.error(`  ❌ ${f}`);
  }
  console.error("\nConvert audio files to .ogg before committing.");
  process.exit(1);
}

main();
