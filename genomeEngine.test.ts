import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { analyzeDirectory, compareGenomes, parseGenomeJson, genomeToJson, isSafeZipEntryName } from "./genomeEngine";

const temporaryDirectories: string[] = [];

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codegenome-test-"));
  temporaryDirectories.push(root);
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src", "main.ts"), "import { helper } from './helper';\nexport function main() { return helper(); }\n");
  fs.writeFileSync(path.join(root, "src", "helper.ts"), "export function helper() { return 42; }\n");
  return root;
}

afterEach(() => {
  while (temporaryDirectories.length) fs.rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
});

describe("genomeEngine", () => {
  it("produces a stable signature from the same source tree", () => {
    const root = createFixture();
    const first = analyzeDirectory(root, "fixture", "local");
    const second = analyzeDirectory(root, "fixture", "local");

    expect(first.signature.hash).toBe(second.signature.hash);
    expect(first.signature.dimensions.structure.filesCount).toBe(2);
    expect(first.signature.dimensions.structure.languages.TypeScript).toBe(2);
    expect(first.signature.dimensions.evolution.commitsCount).toBeNull();
    expect(parseGenomeJson(genomeToJson(first)).signature.hash).toBe(first.signature.hash);
  });

  it("rejects ZIP path traversal before extraction", () => {
    expect(isSafeZipEntryName("../escape.ts")).toBe(false);
    expect(isSafeZipEntryName("src/main.ts")).toBe(true);
  });

  it("reads evolution only from an actual Git history", () => {
    const root = createFixture();
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
    execFileSync("git", ["config", "user.name", "CodeGenome Test"], { cwd: root });
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync("git", ["commit", "-qm", "initial source"], { cwd: root });
    const result = analyzeDirectory(root, "git-fixture", "local");

    expect(result.signature.dimensions.evolution.available).toBe(true);
    expect(result.signature.dimensions.evolution.commitsCount).toBe(1);
    expect(result.signature.dimensions.evolution.contributorsCount).toBe(1);
  });

  it("compares two genome vectors without fabricated history", () => {
    const root = createFixture();
    const first = analyzeDirectory(root, "first", "local");
    const second = analyzeDirectory(root, "second", "local");
    const comparison = compareGenomes(first, second);

    expect(comparison.similarityPercentage).toBe(100);
    expect(comparison.phylogeneticDistance).toBe(0);
  });
});

export {};
