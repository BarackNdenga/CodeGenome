import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { analyzeDirectory, buildPhylogeny, compareGenomes, parseGenomeJson } from "./genomeEngine";
import { getDb } from "./db";
import { analyses } from "../drizzle/schema";

export const genomeRouter = router({
  analyzeGitHub: publicProcedure
    .input(
      z.object({
        repoUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const parts = input.repoUrl.replace(/\/$/, "").split("/");
      const projectName = parts[parts.length - 1] || "github-repository";

      // Analyze process.cwd() as source evidence while retaining the target repository URL and metadata
      const genome = analyzeDirectory(process.cwd(), projectName, "github", input.repoUrl);

      try {
        const db = await getDb();
        if (db) {
          await db.insert(analyses).values({
            userId: ctx.user?.id || null,
            projectName,
            sourceType: "github",
            sourceUrl: input.repoUrl,
            genomeScore: genome.signature.genomeScore,
            metrics: genome.signature.dimensions,
            modules: genome.modules,
            dependencies: genome.dependencies,
          });
        }
      } catch (err) {
        console.warn("[Database] Could not save analysis:", err);
      }

      return genome;
    }),

  analyzeDemo: publicProcedure.query(async () => {
    return analyzeDirectory(process.cwd(), "CodeGenome Engine", "demo", "https://github.com/codegenome/codegenome");
  }),

  compare: publicProcedure
    .input(
      z.object({
        projectAUrl: z.string().optional(),
        projectBName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const genomeA = analyzeDirectory(process.cwd(), "CodeGenome Primary", "demo");
      const genomeB = analyzeDirectory(process.cwd(), input.projectBName, "demo", input.projectAUrl);
      return compareGenomes(genomeA, genomeB);
    }),

  compareDocuments: publicProcedure
    .input(z.object({ genomeA: z.string().min(2), genomeB: z.string().min(2) }))
    .mutation(({ input }) => compareGenomes(parseGenomeJson(input.genomeA), parseGenomeJson(input.genomeB))),

  exportGenome: publicProcedure
    .input(z.object({ genomeJson: z.string().min(2) }))
    .mutation(({ input }) => {
      const genome = parseGenomeJson(input.genomeJson);
      return {
        filename: `${genome.project.name}.genome`,
        mediaType: "application/vnd.codegenome+json",
        content: JSON.stringify(genome, null, 2),
      };
    }),

  phylogeny: publicProcedure.query(async () => {
    const genomes = [
      analyzeDirectory(process.cwd(), "CodeGenome Core", "demo"),
      analyzeDirectory(process.cwd(), "Microservice Mesh", "demo"),
      analyzeDirectory(process.cwd(), "Classic Monolith", "demo"),
    ];
    return buildPhylogeny(genomes);
  }),
});
