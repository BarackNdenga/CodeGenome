# CodeGenome

> The DNA profiler for software.

CodeGenome turns source code, architecture, and available history into a **calculable software genome**. A genome separates three dimensions: **Structure** (modules, files, imports, classes, functions), **Behavior** (static-analysis signals such as complexity, coupling, duplication, and maintainability), and **Evolution** (historical evidence when Git history is actually available).

The project is an open-source proposal for a portable `project.genome` artifact. The artifact is human-readable JSON, versioned with `specVersion`, and designed to sit beside familiar project files:

```text
README.md
LICENSE
package.json
project.genome
```

## Capabilities

CodeGenome provides genome extraction, an interactive Software DNA view, normalized genome comparison, an evolution view, and a software-phylogeny view for structural proximity. The current implementation supports GitHub-style input, ZIP upload as an alternative to GitHub or the CLI, and a local demo source.

### ZIP analysis

The web interface accepts a `.zip` archive at `POST /api/analyze-zip` using the `projectZip` multipart field. The archive is kept in memory, unpacked only into a private temporary workspace, and removed in a `finally` block after analysis. Entry count and expanded size are bounded, and absolute paths or `..` traversal segments are rejected before writing files.

The upload limit is 50 MiB at the HTTP layer and the expanded temporary workspace is capped at 150 MiB. ZIP archives are analyzed as source input; they are not retained as a downloadable customer file.

## `.genome` format

The draft specification is documented in [`docs/GENOME_SPEC.md`](docs/GENOME_SPEC.md). The media type is `application/vnd.codegenome+json` and the current draft version is `1.0.0`. Required top-level fields are `specVersion`, `project`, and `signature`.

A generated genome includes a stable display hash derived from measured structure and behavior data. `createdAt` records generation time but is not included in that stable hash. Evolution values remain `null` when the source does not provide Git history; CodeGenome does not infer or fabricate a timeline.

## Development

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

The web application uses React, Vite, Express, tRPC, Drizzle, and Manus authentication. The core engine is in `server/genomeEngine.ts`; the tRPC procedures are in `server/genomeRouter.ts`; the ZIP endpoint is in `server/zipRoute.ts`.

## Open source

CodeGenome is distributed under the **Apache License 2.0**, identified by the SPDX expression **Apache-2.0**. See [`LICENSE`](LICENSE) for the complete license text. Contributions and security reports are described in [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md).

## Status

The `.genome` format is a **draft standard proposal**, not an industry standard. Consumers should preserve unknown optional fields and treat the reported metrics as static-analysis signals rather than production guarantees.
