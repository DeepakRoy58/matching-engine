import { beforeEach, describe, expect, it } from "vitest";
import { OrderBook } from "../src/index.js";

let book: OrderBook;
beforeEach(() => {
  book = new OrderBook();
});

const limit = (id: string, side: "buy" | "sell", price: number, quantity: number) =>
  ({ id, side, type: "limit", price, quantity }) as const;

describe("price-time priority", () => {
  it("rests an order when nothing crosses", () => {
    const r = book.submit(limit("b1", "buy", 99, 5));
    expect(r.status).toBe("open");
    expect(book.bestBid()).toBe(99);
  });

  it("matches the best price first", () => {
    book.submit(limit("s1", "sell", 102, 1));
    book.submit(limit("s2", "sell", 100, 1));
    book.submit(limit("s3", "sell", 101, 1));
    const r = book.submit(limit("b1", "buy", 102, 2));
    expect(r.trades.map((t) => t.makerOrderId)).toEqual(["s2", "s3"]);
  });

  it("matches oldest order first at same price (FIFO)", () => {
    book.submit(limit("s1", "sell", 100, 2));
    book.submit(limit("s2", "sell", 100, 2));
    const r = book.submit(limit("b1", "buy", 100, 3));
    expect(r.trades).toHaveLength(2);
    expect(r.trades[0]).toMatchObject({ makerOrderId: "s1", quantity: 2 });
    expect(r.trades[1]).toMatchObject({ makerOrderId: "s2", quantity: 1 });
  });

  it("trades at the maker price", () => {
    book.submit(limit("s1", "sell", 100, 1));
    const r = book.submit(limit("b1", "buy", 105, 1));
    expect(r.trades[0]!.price).toBe(100);
  });

  it("keeps partial fill leftover in the book", () => {
    book.submit(limit("s1", "sell", 100, 2));
    const r = book.submit(limit("b1", "buy", 100, 5));
    expect(r.status).toBe("partially_filled");
    expect(r.remainingQuantity).toBe(3);
    expect(book.bestBid()).toBe(100);
    expect(book.bestAsk()).toBeUndefined();
  });

  it("partially filled maker keeps its place in the queue", () => {
    book.submit(limit("s1", "sell", 100, 5));
    book.submit(limit("s2", "sell", 100, 5));
    book.submit(limit("b1", "buy", 100, 2));
    const r = book.submit(limit("b2", "buy", 100, 4));
    expect(r.trades[0]).toMatchObject({ makerOrderId: "s1", quantity: 3 });
    expect(r.trades[1]).toMatchObject({ makerOrderId: "s2", quantity: 1 });
  });
});

describe("market orders", () => {
  it("fills across levels and drops the leftover", () => {
    book.submit(limit("s1", "sell", 100, 1));
    book.submit(limit("s2", "sell", 101, 1));
    const r = book.submit({ id: "m1", side: "buy", type: "market", quantity: 5 });
    expect(r.filledQuantity).toBe(2);
    expect(r.status).toBe("cancelled");
    expect(book.hasOrder("m1")).toBe(false);
  });
});

describe("cancel", () => {
  it("removes a resting order", () => {
    book.submit(limit("b1", "buy", 99, 1));
    expect(book.cancel("b1")).toBe(true);
    expect(book.bestBid()).toBeUndefined();
    expect(book.cancel("b1")).toBe(false);
  });

  it("cancel in the middle of a queue keeps the order of the others", () => {
    book.submit(limit("s1", "sell", 100, 1));
    book.submit(limit("s2", "sell", 100, 1));
    book.submit(limit("s3", "sell", 100, 1));
    book.cancel("s2");
    const r = book.submit(limit("b1", "buy", 100, 2));
    expect(r.trades.map((t) => t.makerOrderId)).toEqual(["s1", "s3"]);
  });
});

describe("validation and depth", () => {
  it("rejects bad input", () => {
    expect(book.submit(limit("x", "buy", 0, 1)).status).toBe("rejected");
    expect(book.submit(limit("x", "buy", 10, 1.5)).status).toBe("rejected");
    book.submit(limit("dup", "buy", 10, 1));
    expect(book.submit(limit("dup", "buy", 10, 1)).reason).toBe("duplicate order id");
  });

  it("returns aggregated depth, best first", () => {
    book.submit(limit("b1", "buy", 99, 1));
    book.submit(limit("b2", "buy", 99, 2));
    book.submit(limit("b3", "buy", 98, 4));
    expect(book.getDepth().bids).toEqual([
      { price: 99, quantity: 3, orders: 2 },
      { price: 98, quantity: 4, orders: 1 },
    ]);
  });
});
