import type { Order } from "./types.js";

/*
  One price level = a queue of orders with the same price.
  Doubly linked list so add and remove are both O(1).
*/
export class PriceLevel {
  head: Order | null = null;
  tail: Order | null = null;
  totalQuantity = 0;
  count = 0;

  constructor(readonly price: number) {}

  get isEmpty(): boolean {
    return this.count === 0;
  }

  /* new orders always go to the back, thats the FIFO part */
  push(order: Order): void {
    order.prev = this.tail;
    order.next = null;
    if (this.tail) this.tail.next = order;
    else this.head = order;
    this.tail = order;
    this.totalQuantity += order.remaining;
    this.count++;
  }

  remove(order: Order): void {
    if (order.prev) order.prev.next = order.next;
    else this.head = order.next;
    if (order.next) order.next.prev = order.prev;
    else this.tail = order.prev;
    order.prev = null;
    order.next = null;
    this.totalQuantity -= order.remaining;
    this.count--;
  }

  /* called when an order is partially filled */
  reduce(order: Order, qty: number): void {
    order.remaining -= qty;
    this.totalQuantity -= qty;
  }
}
