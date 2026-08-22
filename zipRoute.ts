import { Express } from "express";
import multer from "multer";
import { analyzeZipBuffer } from "./genomeEngine";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { analyses } from "../drizzle/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

export function registerZipRoute(app: Express) {
  app.post("/api/analyze-zip", upload.single("projectZip"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No ZIP file uploaded. Please provide a valid .zip archive." });
      }

      let storageKey: string | null = null;
      try {
        const stored = await storagePut(`uploads/${Date.now()}-${req.file.originalname}`, req.file.buffer, "application/zip");
        storageKey = stored.key;
      } catch (storageErr) {
        console.warn("[Storage] Temporary ZIP upload warning:", storageErr);
      }

      const genome = analyzeZipBuffer(req.file.buffer, req.file.originalname);

      // Save to database with storageKey
      try {
        const db = await getDb();
        if (db) {
          await db.insert(analyses).values({
            projectName: genome.project.name,
            sourceType: "zip",
            sourceUrl: req.file.originalname,
            storageKey,
            genomeScore: genome.signature.genomeScore,
            metrics: genome.signature.dimensions,
            modules: genome.modules,
            dependencies: genome.dependencies,
          });
        }
      } catch (err) {
        console.warn("[Database] Could not save ZIP analysis:", err);
      }

      return res.json(genome);
    } catch (error: any) {
      console.error("[ZipAnalysis] Error processing ZIP archive:", error);
      return res.status(500).json({ error: error.message || "Failed to analyze ZIP archive." });
    }
  });
}
