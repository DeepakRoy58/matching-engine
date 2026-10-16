import { BookSide } from "./BookSide.js";
import type { Depth, Order, OrderInput, SubmitResult, Trade } from "./types.js";

/*
  The order book for ONE market (example BTC-USDT).
  Rules: best price first, and if price is same, oldest order first.
*/
export class OrderBook {
  private bids = new BookSide("buy");
  private asks = new BookSide("sell");
  private orders = new Map<string, Order>(); /* only resting orders, for fast cancel */
  private sequence = 0;
  private tradeCounter = 0;

  submit(input: OrderInput): SubmitResult {
    const error = this.validate(input);
    if (error) return this.reject(input.id, error);

    const taker: Order = {
      id: input.id,
      side: input.side,
      price: input.type === "limit" ? input.price! : 0,
      quantity: input.quantity,
      remaining: input.quantity,
      sequence: ++this.sequence,
      prev: null,
      next: null,
    };

    const trades = this.match(taker, input.type === "limit");

    /* leftover of a limit order waits in the book, market leftover is dropped */
    let rested = false;
    if (taker.remaining > 0 && input.type === "limit") {
      (taker.side === "buy" ? this.bids : this.asks).add(taker);
      this.orders.set(taker.id, taker);
      rested = true;
    }

    const filled = taker.quantity - taker.remaining;
    let status: SubmitResult["status"];
    if (taker.remaining === 0) status = "filled";
    else if (!rested) status = "cancelled";
    else status = filled > 0 ? "partially_filled" : "open";

    return {
      orderId: taker.id,
      status,
      filledQuantity: filled,
      remainingQuantity: taker.remaining,
      trades,
    };
  }

  cancel(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;
    (order.side === "buy" ? this.bids : this.asks).remove(order);
    this.orders.delete(orderId);
    return true;
  }

  getDepth(levels = 10): Depth {
    return { bids: this.bids.depth(levels), asks: this.asks.depth(levels) };
  }

  bestBid(): number | undefined {
    return this.bids.best()?.price;
  }

  bestAsk(): number | undefined {
    return this.asks.best()?.price;
  }

  hasOrder(orderId: string): boolean {
    return this.orders.has(orderId);
  }

  /*  private stuff */

  private match(taker: Order, isLimit: boolean): Trade[] {
    const trades: Trade[] = [];
    const book = taker.side === "buy" ? this.asks : this.bids;

    while (taker.remaining > 0) {
      const level = book.best();
      if (!level) break;

      /* limit order cant trade at a worse price than its own */
      if (isLimit) {
        const crosses = taker.side === "buy" ? level.price <= taker.price : level.price >= taker.price;
        if (!crosses) break;
      }

      /* walk the queue from oldest to newest */
      let maker = level.head;
      while (maker && taker.remaining > 0) {
        const qty = Math.min(taker.remaining, maker.remaining);
        taker.remaining -= qty;
        level.reduce(maker, qty);

        trades.push({
          tradeId: ++this.tradeCounter,
          sequence: taker.sequence,
          makerOrderId: maker.id,
          takerOrderId: taker.id,
          price: maker.price, /* trade happens at maker price */
          quantity: qty,
          takerSide: taker.side,
        });

        if (maker.remaining === 0) {
          level.remove(maker);
          this.orders.delete(maker.id);
        }
        maker = level.head;
      }

      if (level.isEmpty) book.dropLevel(level.price);
    }
    return trades;
  }

  private validate(input: OrderInput): string | null {
    if (!input.id) return "order id is required";
    if (this.orders.has(input.id)) return "duplicate order id";
    if (input.side !== "buy" && input.side !== "sell") return "side must be buy or sell";
    if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
      return "quantity must be a positive integer";
    }
    if (input.type === "limit") {
      if (input.price === undefined || !Number.isSafeInteger(input.price) || input.price <= 0) {
        return "limit order needs a positive integer price";
      }
    } else if (input.type !== "market") {
      return "type must be limit or market";
    }
    return null;
  }

  private reject(orderId: string, reason: string): SubmitResult {
    return {
      orderId,
      status: "rejected",
      filledQuantity: 0,
      remainingQuantity: 0,
      trades: [],
      reason,
    };
  }
}
