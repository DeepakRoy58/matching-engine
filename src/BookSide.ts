import { PriceLevel } from "./PriceLevel.js";
import type { DepthLevel, Order, Side } from "./types.js";

/*
  One side of the book (bids or asks).
  Prices are kept sorted from WORST to BEST, so the best price is always
  the last item. Reading or removing the best is O(1), and adding a new
  price level is O(log n) search + small array shift.
*/
export class BookSide {
  private levels = new Map<number, PriceLevel>();
  private prices: number[] = [];

  constructor(private readonly side: Side) {}

  /* buy: low -> high, sell: high -> low */
  private compare(a: number, b: number): number {
    return this.side === "buy" ? a - b : b - a;
  }

  best(): PriceLevel | undefined {
    const price = this.prices[this.prices.length - 1];
    return price === undefined ? undefined : this.levels.get(price);
  }

  add(order: Order): void {
    let level = this.levels.get(order.price);
    if (!level) {
      level = new PriceLevel(order.price);
      this.levels.set(order.price, level);
      this.prices.splice(this.lowerBound(order.price), 0, order.price);
    }
    level.push(order);
  }

  remove(order: Order): void {
    const level = this.levels.get(order.price);
    if (!level) return;
    level.remove(order);
    if (level.isEmpty) this.dropLevel(order.price);
  }

  /* used by the matcher after a level is totally eaten */
  dropLevel(price: number): void {
    this.levels.delete(price);
    const index = this.lowerBound(price);
    if (this.prices[index] === price) this.prices.splice(index, 1);
  }

  depth(maxLevels: number): DepthLevel[] {
    const result: DepthLevel[] = [];
    for (let i = this.prices.length - 1; i >= 0 && result.length < maxLevels; i--) {
      const level = this.levels.get(this.prices[i]!)!;
      result.push({ price: level.price, quantity: level.totalQuantity, orders: level.count });
    }
    return result;
  }

  /* binary search, first index where price is not "worse" than the given one */
  private lowerBound(price: number): number {
    let lo = 0;
    let hi = this.prices.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.compare(this.prices[mid]!, price) < 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}
