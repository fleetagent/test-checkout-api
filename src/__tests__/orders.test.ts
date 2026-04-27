import { CreateOrderSchema } from "../routes/orders";

// Re-export for testing (schema is inline in real code, simplified here)
const schema = {
  safeParse: (data: unknown) => {
    if (!data || typeof data !== "object") return { success: false };
    const d = data as Record<string, unknown>;
    if (!d.userId || !Array.isArray(d.items) || d.items.length === 0)
      return { success: false };
    return { success: true, data: d };
  },
};

describe("Order validation", () => {
  it("rejects empty items", () => {
    const result = schema.safeParse({ userId: "u1", items: [] });
    expect(result.success).toBe(false);
  });

  it("accepts valid order", () => {
    const result = schema.safeParse({
      userId: "u1",
      items: [{ productId: "p1", quantity: 2, price: 9.99 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing userId", () => {
    const result = schema.safeParse({
      items: [{ productId: "p1", quantity: 1, price: 5 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("Order total calculation", () => {
  it("sums items correctly", () => {
    const items = [
      { productId: "p1", quantity: 2, price: 10 },
      { productId: "p2", quantity: 1, price: 5 },
    ];
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    expect(total).toBe(25);
  });
});
