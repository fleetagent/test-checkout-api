import express from "express";
import helmet from "helmet";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { Kafka, Producer } from "kafkajs";
import { orderRouter } from "./routes/orders";
import { cartRouter } from "./routes/cart";
import { healthRouter } from "./routes/health";
import { logger } from "./lib/logger";

const app = express();
const prisma = new PrismaClient();

const kafka = new Kafka({
  clientId: "checkout-api",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});
const producer: Producer = kafka.producer();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/orders", orderRouter(prisma, producer));
app.use("/api/cart", cartRouter(prisma));
app.use("/health", healthRouter(prisma));

const PORT = process.env.PORT || 3001;

async function main() {
  await producer.connect();
  logger.info("Kafka producer connected");

  app.listen(PORT, () => {
    logger.info(`Checkout API listening on port ${PORT}`);
  });
}

main().catch((err) => {
  logger.error("Fatal startup error", err);
  process.exit(1);
});

export { app, prisma };
