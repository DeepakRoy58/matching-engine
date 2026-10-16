import { MatchingEngine } from "../src/index.js";

const engine = new MatchingEngine();
engine.addMarket("BTC-USDT");

/* two sellers, alice came first so she gets filled first */
engine.submit("BTC-USDT", { id: "roy", side: "sell", type: "limit", price: 60000, quantity: 2 });
engine.submit("BTC-USDT", { id: "sam", side: "sell", type: "limit", price: 60000, quantity: 3 });
engine.submit("BTC-USDT", { id: "tez", side: "sell", type: "limit", price: 60100, quantity: 5 });

/* a buyer comes & takes 4 */
const result = engine.submit("BTC-USDT", { id: "kirat", side: "buy", type: "limit", price: 60000, quantity: 4 });

console.log("status:", result.status);
console.table(result.trades);
console.log("book after:", JSON.stringify(engine.getDepth("BTC-USDT"), null, 2));
