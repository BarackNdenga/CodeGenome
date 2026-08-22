import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import AdmZip from "adm-zip";

export type GenomeSourceType = "github" | "zip" | "local" | "demo";

type Evolution = {
  available: boolean;
  commitsCount: number | null;
  contributorsCount: number | null;
  ageDays: number | null;
  growthRate: number | null;
  stabilityIndex: number | null;
  timeline: Array<{ period: string; commits: number; loc: number; event: string }>;
  note: string;
};

export type GenomeFileFormat = {
  specVersion: "1.0.0";
  generator: "CodeGenome Software DNA Profiler (Apache-2.0)";
  createdAt: string;
  project: { name: string; sourceType: GenomeSourceType; repositoryUrl?: string };
  signature: {
    hash: string;
    genomeScore: number;
    dimensions: {
      structure: { filesCount: number; linesOfCode: number; languages: Record<string, number>; modulesCount: number; classesCount: number; functionsCount: number; importsCount: number };
      behavior: { complexityScore: number; couplingScore: number; duplicationRate: number; maintainabilityIndex: number; structuralRisk: number };
      evolution: Evolution;
    };
  };
  modules: Array<{ name: string; path: string; files: number; complexity: number }>;
  dependencies: { internal: string[]; external: string[] };
};

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".py": "Python", ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript",
  ".ts": "TypeScript", ".tsx": "TypeScript", ".java": "Java", ".kt": "Kotlin",
  ".go": "Go", ".rs": "Rust", ".c": "C", ".h": "C/C++", ".cpp": "C++",
  ".php": "PHP", ".rb": "Ruby", ".swift": "Swift", ".html": "HTML", ".css": "CSS",
};
const IGNORED = new Set(["node_modules", "dist", "build", ".next", "coverage", "vendor"]);

export function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80) || "project";
}

const sha = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 20);

const unavailableEvolution = (root: string): Evolution => ({
  available: fs.existsSync(path.join(root, ".git")),
  commitsCount: null,
  contributorsCount: null,
  ageDays: null,
  growthRate: null,
  stabilityIndex: null,
  timeline: [],
  note: fs.existsSync(path.join(root, ".git"))
    ? "Git metadata detected; detailed history requires a Git adapter."
    : "No Git history was provided; evolution metrics remain unavailable.",
});

export function analyzeDirectory(root: string, projectName: string, sourceType: GenomeSourceType, repositoryUrl?: string): GenomeFileFormat {
  let filesCount = 0, linesOfCode = 0, classesCount = 0, functionsCount = 0, importsCount = 0;
  const languages: Record<string, number> = {};
  const modules = new Map<string, { files: number; complexity: number }>();
  const internal = new Set<string>(), external = new Set<string>(), lineHashes = new Map<string, number>();

  const walk = (dir: string, relative = "") => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || IGNORED.has(entry.name)) continue;
      const full = path.join(dir, entry.name), rel = path.join(relative, entry.name);
      if (entry.isDirectory()) { walk(full, rel); continue; }
      if (!entry.isFile()) continue;
      filesCount++;
      const language = LANGUAGE_BY_EXTENSION[path.extname(entry.name).toLowerCase()] ?? "Other";
      languages[language] = (languages[language] ?? 0) + 1;
      let content = "";
      try { content = fs.readFileSync(full, "utf8"); } catch { continue; }
      const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      linesOfCode += lines.length;
      lines.forEach(line => { const key = createHash("sha1").update(line).digest("hex"); lineHashes.set(key, (lineHashes.get(key) ?? 0) + 1); });
      classesCount += (content.match(/\bclass\s+[A-Za-z0-9_]+/g) ?? []).length;
      functionsCount += (content.match(/\b(function|def|fn|func)\s+[A-Za-z0-9_]+/g) ?? []).length;
      const foundImports = content.match(/(?:import|require|from)\s*[('" ]+([@A-Za-z0-9_./-]+)/g) ?? [];
      importsCount += foundImports.length;
      foundImports.forEach(statement => {
        const dependency = statement.replace(/^(import|require|from)\s*[('" ]+/, "").replace(/[)'";].*$/, "");
        (dependency.startsWith(".") || dependency.includes("/") ? internal : external).add(dependency);
      });
      const moduleName = rel.split(path.sep)[0] || "root";
      const module = modules.get(moduleName) ?? { files: 0, complexity: 0 };
      module.files++;
      module.complexity += Math.max(1, Math.round(lines.length / 50));
      modules.set(moduleName, module);
    }
  };
  walk(root);

  const duplicateLines = Array.from(lineHashes.values()).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const duplicationRate = linesOfCode ? Math.round((duplicateLines / linesOfCode) * 100) : 0;
  const complexityScore = Math.min(100, Math.round((linesOfCode / Math.max(1, filesCount)) * 0.6 + functionsCount * 0.2 + classesCount * 0.4));
  const couplingScore = Math.min(100, Math.round((importsCount / Math.max(1, filesCount)) * 8));
  const maintainabilityIndex = Math.max(0, Math.round(100 - complexityScore * 0.45 - couplingScore * 0.35 - duplicationRate * 0.2));
  const structuralRisk = Math.min(100, Math.round(complexityScore * 0.45 + couplingScore * 0.35 + duplicationRate * 0.2));
  const genomeScore = Math.max(0, Math.min(100, Math.round(maintainabilityIndex * 0.55 + (100 - structuralRisk) * 0.45)));
  const moduleList = Array.from(modules.entries()).sort((a, b) => b[1].files - a[1].files).map(([name, data]) => ({ name, path: `./${name}`, files: data.files, complexity: Math.min(100, data.complexity) }));
  const structure = { filesCount, linesOfCode, languages, modulesCount: moduleList.length, classesCount, functionsCount, importsCount };
  const behavior = { complexityScore, couplingScore, duplicationRate, maintainabilityIndex, structuralRisk };
  const dependencies = { internal: Array.from(internal).sort().slice(0, 50), external: Array.from(external).sort().slice(0, 50) };
  const stable = { structure, behavior, modules: moduleList, dependencies };

  return {
    specVersion: "1.0.0",
    generator: "CodeGenome Software DNA Profiler (Apache-2.0)",
    createdAt: new Date().toISOString(),
    project: { name: safeName(projectName), sourceType, ...(repositoryUrl ? { repositoryUrl } : {}) },
    signature: { hash: `gen_${sha(stable)}`, genomeScore, dimensions: { structure, behavior, evolution: getEvolution(root) } },
    modules: moduleList,
    dependencies,
  };
}

export function analyzeZipBuffer(buffer: Buffer, originalName: string): GenomeFileFormat {
  const temp = fs.mkdtempSync(path.join("/tmp", "codegenome-"));
  const root = path.resolve(temp);
  let expandedBytes = 0;
  try {
    const entries = new AdmZip(buffer).getEntries();
    if (entries.length > 10_000) throw new Error("ZIP archive contains too many entries.");
    for (const entry of entries) {
      const name = entry.entryName.replace(/\\/g, "/");
      if (!name || name.startsWith("/") || name.split("/").includes("..")) throw new Error("ZIP archive contains an unsafe path.");
      const target = path.resolve(root, name);
      if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error("ZIP archive contains an unsafe path.");
      if (entry.isDirectory) { fs.mkdirSync(target, { recursive: true }); continue; }
      const data = entry.getData();
      expandedBytes += data.byteLength;
      if (expandedBytes > 150 * 1024 * 1024) throw new Error("ZIP archive expands beyond the safety limit.");
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, data);
    }
    return analyzeDirectory(root, safeName(path.basename(originalName, path.extname(originalName))), "zip");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export function compareGenomes(a: GenomeFileFormat, b: GenomeFileFormat) {
  const left = a.signature.dimensions, right = b.signature.dimensions;
  const distances = [
    Math.abs(left.structure.filesCount - right.structure.filesCount) / Math.max(1, left.structure.filesCount, right.structure.filesCount),
    Math.abs(left.structure.modulesCount - right.structure.modulesCount) / Math.max(1, left.structure.modulesCount, right.structure.modulesCount),
    Math.abs(left.behavior.complexityScore - right.behavior.complexityScore) / 100,
    Math.abs(left.behavior.couplingScore - right.behavior.couplingScore) / 100,
    Math.abs(left.behavior.maintainabilityIndex - right.behavior.maintainabilityIndex) / 100,
  ];
  const phylogeneticDistance = Number((distances.reduce((sum, value) => sum + value, 0) / distances.length).toFixed(3));
  return {
    projectA: a.project.name,
    projectB: b.project.name,
    similarityPercentage: Math.round((1 - phylogeneticDistance) * 100),
    phylogeneticDistance,
    metricsComparison: { scoreA: a.signature.genomeScore, scoreB: b.signature.genomeScore, complexityA: left.behavior.complexityScore, complexityB: right.behavior.complexityScore, couplingA: left.behavior.couplingScore, couplingB: right.behavior.couplingScore },
  };
}

export const genomeToJson = (genome: GenomeFileFormat) => JSON.stringify(genome, null, 2);
export const genomeToFilename = (name: string) => `${safeName(name)}.genome`;
export const getGenomeMediaType = () => "application/vnd.codegenome+json";
export const getGenomeLicense = () => "Apache-2.0" as const;
export const getGenomeStandardVersion = () => "1.0.0" as const;
export const getGenomeStandardFilename = () => "project.genome";
export const getGenomeStandardStatus = () => "Draft proposal";
export const getGenomeStandardNote = () => "project.genome is versioned JSON distributed with CodeGenome under Apache-2.0.";

export function isSafeZipEntryName(entryName: string) {
  const normalized = entryName.replace(/\\/g, "/");
  return Boolean(normalized) && !normalized.startsWith("/") && !normalized.split("/").includes("..");
}

export function parseGenomeJson(json: string): GenomeFileFormat {
  const value = JSON.parse(json) as GenomeFileFormat;
  if (value.specVersion !== "1.0.0" || !value.project?.name || !value.signature?.hash) {
    throw new Error("Invalid .genome document.");
  }
  return value;
}

export function getGenomeOpenSourceNotice() {
  return "CodeGenome is open source under Apache-2.0; see LICENSE for the complete text.";
}

export function getGenomeDisclaimer() {
  return "Metrics are static-analysis signals, not scientific truths or production guarantees.";
}

export function getGenomeUploadSecurityNote() {
  return "ZIP paths, entry count, and expanded size are bounded before temporary extraction.";
}

export function getGenomeStandardRequiredFields() {
  return ["specVersion", "project", "signature"] as const;
}

export function getGenomeStandardVersioning() {
  return "Incompatible schema changes increment the major version.";
}

export function getGenomeStandardDimensions() {
  return ["structure", "behavior", "evolution"] as const;
}

export function getGenomeStandardDescription() {
  return "Human-readable, machine-consumable JSON genome artifact.";
}

export function getGenomeFeatureSet() {
  return ["extraction", "visualization", "comparison", "evolution", "phylogeny"] as const;
}

export function getGenomeDimensionLabels() {
  return ["Structure", "Behavior", "Evolution"] as const;
}

export function getGenomeStandardGithubAnalogy() {
  return "README.md + LICENSE + package.json + project.genome";
}

export function getGenomeEvolutionDescription() {
  return "Evolution is reported only when source history is available; absent history is never inferred.";
}

export function getGenomeComparisonDescription() {
  return "Similarity is a normalized distance across measured structure and behavior dimensions.";
}

export function getGenomePhylogenyDescription() {
  return "Structural proximity view over comparable genome vectors, not biological ancestry.";
}

export function getGenomeArtifactDescription() {
  return "Portable JSON signature for software structure, behavior signals, and evidence-backed evolution.";
}

export function getGenomeProductName() { return "CodeGenome"; }
export function getGenomeProductTagline() { return "The DNA profiler for software."; }
export function getGenomeProductDescription() { return "Turn source code, architecture, and history into a portable software genome."; }
export function getGenomeDimensionCopy() { return { structure: "What exists", behavior: "How it connects", evolution: "How it changes" }; }
export function getGenomeManifest(genome: GenomeFileFormat) {
  return { file: genomeToFilename(genome.project.name), mediaType: getGenomeMediaType(), specVersion: genome.specVersion, license: getGenomeLicense(), generatedAt: genome.createdAt };
}
export function getGenomeSummary(genome: GenomeFileFormat) {
  return { project: genome.project.name, score: genome.signature.genomeScore, hash: genome.signature.hash, modules: genome.modules.length, sourceType: genome.project.sourceType };
}
export function getGenomeLanguageDistribution(genome: GenomeFileFormat) {
  const total = Math.max(1, genome.signature.dimensions.structure.filesCount);
  return Object.entries(genome.signature.dimensions.structure.languages)
    .map(([language, count]) => ({ language, count, percentage: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}
export function getGenomeRadarValues(genome: GenomeFileFormat) {
  const behavior = genome.signature.dimensions.behavior;
  return [
    { label: "Complexity", value: behavior.complexityScore },
    { label: "Coupling", value: behavior.couplingScore },
    { label: "Maintainability", value: behavior.maintainabilityIndex },
    { label: "Stability", value: 100 - behavior.structuralRisk },
  ];
}
export function getGenomeMetricRows(genome: GenomeFileFormat) {
  const structure = genome.signature.dimensions.structure;
  return [
    { label: "Files", value: structure.filesCount },
    { label: "Lines of code", value: structure.linesOfCode },
    { label: "Functions", value: structure.functionsCount },
    { label: "Classes", value: structure.classesCount },
    { label: "Dependencies", value: genome.dependencies.external.length },
  ];
}
export function getGenomeFileSize(genome: GenomeFileFormat) { return Buffer.byteLength(genomeToJson(genome), "utf8"); }

export function buildPhylogeny(genomes: GenomeFileFormat[]) {
  if (genomes.length === 0) return { nodes: [], links: [] };
  return {
    nodes: genomes.map((genome, index) => ({
      id: `genome-${index}`,
      name: genome.project.name,
      type: genome.project.sourceType,
      score: genome.signature.genomeScore,
    })),
    links: genomes.slice(1).map((genome, index) => ({
      source: "genome-0",
      target: `genome-${index + 1}`,
      distance: compareGenomes(genomes[0], genome).phylogeneticDistance,
    })),
  };
}

function getEvolution(root: string): Evolution {
  if (!fs.existsSync(path.join(root, ".git"))) return unavailableEvolution(root);
  try {
    const log = (format: string) => execFileSync("git", ["-C", root, "log", "--all", "--date=short", `--format=${format}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const commits = log("%H|%ad|%an").split(/\r?\n/).filter(Boolean);
    if (commits.length === 0) return unavailableEvolution(root);
    const contributors = new Set(commits.map(row => row.split("|")[2] ?? "")).size;
    const dates = commits.map(row => row.split("|")[1] ?? "").filter(Boolean).sort();
    const first = new Date(dates[0]).getTime();
    const last = new Date(dates[dates.length - 1]).getTime();
    const ageDays = Math.max(0, Math.round((Date.now() - first) / 86_400_000));
    const churn = log("%H").split(/\r?\n/).filter(Boolean).slice(0, 120).map(hash => {
      try {
        const stat = execFileSync("git", ["-C", root, "show", "--shortstat", "--oneline", "--no-renames", hash], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
        const match = stat.match(/(\d+) insertions?\(\+\)|(?:(\d+) deletions?\(-\))/g) ?? [];
        return match.reduce((sum, value) => sum + Number(value.match(/\d+/)?.[0] ?? 0), 0);
      } catch { return 0; }
    });
    const averageChurn = churn.length ? Math.round(churn.reduce((sum, value) => sum + value, 0) / churn.length) : 0;
    const stabilityIndex = Math.max(0, Math.min(100, 100 - Math.round(averageChurn / 10)));
    const growthRate = ageDays > 0 ? Number((commits.length / ageDays).toFixed(4)) : commits.length;
    const timeline = dates.slice(-6).map((period, index) => ({ period, commits: Math.max(1, Math.round(commits.length / Math.min(6, dates.length))), loc: 0, event: index === 0 ? "Git history observed" : "Commit history observed" }));
    return { available: true, commitsCount: commits.length, contributorsCount: contributors, ageDays, growthRate, stabilityIndex, timeline, note: `Git history observed from ${new Date(first).toISOString().slice(0, 10)} to ${new Date(last).toISOString().slice(0, 10)}.` };
  } catch {
    return unavailableEvolution(root);
  }
}
