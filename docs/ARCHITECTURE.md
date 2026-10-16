# my architecture plan

```
MatchingEngine
  └── OrderBook (one per symbol)
        ├── BookSide "buy"   (bids)
        ├── BookSide "sell"  (asks)
        └── orders Map<id, Order>   (for O(1) cancel)

BookSide
  ├── prices: number[]              sorted worst -> best
  └── levels: Map<price, PriceLevel>

PriceLevel
  └── doubly linked list of Orders  (head = oldest)
```

## Why these choices

- **Linked list per price**: removing an order from the middle is O(1), arrays would be O(n).
- **Map by id**: cancel finds the order without scanning.
- **Sorted array, best at the end**: reading and popping the best price is O(1).
  Binary search finds the spot for new prices. In real markets the number of price levels is small, so this beats a fancy tree in practice.
- **Sequence number instead of timestamp**: no clock problems, fully replayable.

## Matching loop

```
while taker has quantity left:
    level = best price level on the opposite side
    stop if no level, or limit price does not cross
    for each maker in level (oldest first):
        fill = min(taker.remaining, maker.remaining)
        record trade at maker price
        remove maker if fully filled
    drop level if empty
rest leftover (limit only)
```
