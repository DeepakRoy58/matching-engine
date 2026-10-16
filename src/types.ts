/* all the shared types live here */

export type Side = "buy" | "sell";
export type OrderType = "limit" | "market";

export type OrderStatus =
  | "open" /* sitting in the book */
  | "partially_filled"
  | "filled"
  | "cancelled"
  | "rejected";

/* what the user sends in. price and quantity are integers (ticks / lots) */
export interface OrderInput {
  id: string;
  side: Side;
  type: OrderType;
  price?: number; /* only needed for limit orders */
  quantity: number;
}

/* internal order, it is also a node of the linked list inside a price level */
export interface Order {
  id: string;
  side: Side;
  price: number;
  quantity: number;
  remaining: number;
  sequence: number; /* lower sequence = came first */
  prev: Order | null;
  next: Order | null;
}

export interface Trade {
  tradeId: number;
  sequence: number;
  makerOrderId: string;
  takerOrderId: string;
  price: number; /* always the maker price */
  quantity: number;
  takerSide: Side;
}

export interface SubmitResult {
  orderId: string;
  status: OrderStatus;
  filledQuantity: number;
  remainingQuantity: number;
  trades: Trade[];
  reason?: string;
}

export interface DepthLevel {
  price: number;
  quantity: number;
  orders: number;
}

export interface Depth {
  bids: DepthLevel[]; /* best first */
  asks: DepthLevel[]; /* best first */
}
