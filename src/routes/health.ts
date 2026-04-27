import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export function healthRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", db: "connected" });
    } catch {
      res.status(503).json({ status: "degraded", db: "disconnected" });
    }
  });

  return router;
}
