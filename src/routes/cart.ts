import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export function cartRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get("/:userId", async (req, res) => {
    res.json({ userId: req.params.userId, items: [], total: 0 });
  });

  router.post("/:userId/items", async (req, res) => {
    const { productId, quantity } = req.body;
    res.status(201).json({ productId, quantity, added: true });
  });

  return router;
}
