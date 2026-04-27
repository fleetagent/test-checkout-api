import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { Producer } from "kafkajs";
import { z } from "zod";
import { logger } from "../lib/logger";

const CreateOrderSchema = z.object({
  userId: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    })
  ).min(1),
  currency: z.string().length(3).default("USD"),
});

export function orderRouter(prisma: PrismaClient, producer: Producer): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const { userId, status, limit = "20", offset = "0" } = req.query;
    const orders = await prisma.order.findMany({
      where: {
        ...(userId ? { userId: String(userId) } : {}),
        ...(status ? { status: String(status) } : {}),
      },
      include: { items: true },
      take: Math.min(Number(limit), 100),
      skip: Number(offset),
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders, count: orders.length });
  });

  router.get("/:id", async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  });

  router.post("/", async (req, res) => {
    const parsed = CreateOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { userId, items, currency } = parsed.data;
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const order = await prisma.order.create({
      data: {
        userId,
        total,
        currency,
        items: { create: items },
      },
      include: { items: true },
    });

    await producer.send({
      topic: "order.created",
      messages: [{ key: order.id, value: JSON.stringify(order) }],
    });
    logger.info({ orderId: order.id }, "Order created");

    res.status(201).json(order);
  });

  router.patch("/:id/status", async (req, res) => {
    const { status } = req.body;
    if (!["confirmed", "shipped", "delivered", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });
    await producer.send({
      topic: "order.status_changed",
      messages: [{ key: order.id, value: JSON.stringify({ orderId: order.id, status }) }],
    });
    res.json(order);
  });

  router.delete("/:id", async (req, res) => {
    await prisma.orderItem.deleteMany({ where: { orderId: req.params.id } });
    await prisma.order.delete({ where: { id: req.params.id } });
    res.status(204).send();
  });

  return router;
}
