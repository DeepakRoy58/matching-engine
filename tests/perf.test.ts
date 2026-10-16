import { expect, it } from "vitest";
import { OrderBook } from "../src/index.js";

/* not a real benchmark, just a normal check that nothing is slow */
it("handles 200k orders quickly", () => {
  const book = new OrderBook();
  const start = performance.now();
  for (let i = 0; i < 200_000; i++) {
    const side = i % 2 === 0 ? "buy" : "sell";
    const price = 10_000 + ((i * 7919) % 200) - 100;
    book.submit({ id: `o${i}`, side, type: "limit", price, quantity: 1 + (i % 5) });
  }
  const ms = performance.now() - start;
  console.log(`200k orders in ${ms.toFixed(0)}ms`);
  expect(ms).toBeLessThan(5000);
});
