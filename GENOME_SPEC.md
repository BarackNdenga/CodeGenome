# Software Genome Format — `.genome`

**Status:** Draft proposal  
**Version:** 1.0.0  
**License:** Apache-2.0  
**Media type:** `application/vnd.codegenome+json`

## Purpose

The `.genome` format is a portable JSON artifact that describes a software project through three explicit dimensions:

| Dimension | Meaning | Evidence in CodeGenome |
|---|---|---|
| `structure` | What exists in the source tree | Files, lines, languages, modules, classes, functions, imports |
| `behavior` | How the observed source is connected | Complexity, coupling, duplication, maintainability, structural risk |
| `evolution` | How the project changes over time | Git-backed history only; unavailable evidence remains `null` |

The format is intentionally inspectable by humans and consumable by tools. It describes static-analysis signals, not biological ancestry, runtime behavior guarantees, or software quality in an absolute sense.

## Minimal document

```json
{
  "specVersion": "1.0.0",
  "generator": "CodeGenome Software DNA Profiler (Apache-2.0)",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "project": {
    "name": "example-project",
    "sourceType": "zip"
  },
  "signature": {
    "hash": "gen_0123456789abcdef0123",
    "genomeScore": 82,
    "dimensions": {
      "structure": {},
      "behavior": {},
      "evolution": {}
    }
  },
  "modules": [],
  "dependencies": {
    "internal": [],
    "external": []
  }
}
```

## Required fields

`specVersion` identifies the schema contract. `project.name` identifies the analyzed project and `project.sourceType` identifies its input (`github`, `zip`, `local`, or `demo`). `signature.hash` is a stable display identifier derived from measured structure and behavior fields. `signature.dimensions` contains the three genome dimensions.

`createdAt` is provenance metadata and may differ between runs. It is deliberately excluded from the stable signature hash. Consumers must not treat the display hash as a credential or cryptographic authorization token.

## Structure

The structure object contains numeric counts and a language-to-file-count map:

```text
filesCount       number
linesOfCode      number
languages        object<string, number>
modulesCount    number
classesCount     number
functionsCount   number
importsCount     number
```

Modules are represented as `{ name, path, files, complexity }`. Dependencies are divided into `internal` and `external` arrays. The exact parser can evolve while preserving these field meanings.

## Behavior

Behavior values are normalized static-analysis signals between 0 and 100 where applicable:

```text
complexityScore       higher means more observed complexity
couplingScore         higher means more observed import coupling
duplicationRate       percentage of repeated non-empty lines
maintainabilityIndex  higher indicates a more maintainable signal profile
structuralRisk        higher indicates more structural risk signals
```

These values are not runtime measurements and should not be used as a substitute for tests, profiling, review, or operational observability.

## Evolution and absence of evidence

Evolution is evidence-backed. When a source does not include usable Git history, fields such as `commitsCount`, `contributorsCount`, `ageDays`, `growthRate`, and `stabilityIndex` are `null`, `timeline` is empty, and `note` explains why. Implementations **MUST NOT** fabricate history from source-tree snapshots.

A future Git adapter may populate the fields without changing the meaning of the dimension. Consumers should preserve unknown optional fields and should tolerate `null` values.

## Comparison and phylogeny

Genome comparison is a normalized distance over measured structure and behavior vectors. Similarity is a convenience presentation of that distance. Software phylogeny is a structural-proximity graph between genome documents; it is not a claim of biological descent or historical authorship.

## ZIP input security

ZIP input is an ingestion mechanism, not part of the artifact itself. Implementations should reject absolute paths and traversal segments, bound entry count and expanded bytes, avoid writing outside a private temporary directory, and remove temporary material after processing. CodeGenome’s web path applies these rules before source analysis.

## Versioning

The format follows semantic versioning for schema compatibility. Incompatible changes increment the major version. Additive optional fields should be introduced without invalidating existing readers. Unknown optional fields should be preserved when a document is read and written again.

## License and governance

The reference implementation and this draft specification are distributed under the **Apache License 2.0**, SPDX identifier **Apache-2.0**. See the repository [`LICENSE`](../LICENSE). This document is a proposal; adoption by other tools does not imply that the format is a formal industry standard.
