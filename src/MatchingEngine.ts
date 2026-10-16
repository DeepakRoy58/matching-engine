import { OrderBook } from "./OrderBook.js";
import type { Depth, OrderInput, SubmitResult } from "./types.js";

/*
  Holds many order books, one for each trading pair.
  This is the class you usually talk to from your API / websocket layer.
*/
export class MatchingEngine {
  private books = new Map<string, OrderBook>();

  addMarket(symbol: string): void {
    if (this.books.has(symbol)) throw new Error(`market ${symbol} already exist`);
    this.books.set(symbol, new OrderBook());
  }

  submit(symbol: string, input: OrderInput): SubmitResult {
    return this.getBook(symbol).submit(input);
  }

  cancel(symbol: string, orderId: string): boolean {
    return this.getBook(symbol).cancel(orderId);
  }

  getDepth(symbol: string, levels?: number): Depth {
    return this.getBook(symbol).getDepth(levels);
  }

  private getBook(symbol: string): OrderBook {
    const book = this.books.get(symbol);
    if (!book) throw new Error(`unknown market ${symbol}`);
    return book;
  }
}
