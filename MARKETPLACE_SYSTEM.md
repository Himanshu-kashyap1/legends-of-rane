# 🏪 Legends of Rane — Player Marketplace & Atomic Escrow Trading

## 1. System Overview & Architecture
The Player Marketplace is a decentralized order book enabling peer-to-peer exchange of raw and refined resources across the realm. It guarantees **zero item/coin duplication** through atomic MongoDB transactions and full escrow isolation.

```
                      Seller Action
             (/sell <item> <qty> <price>)
                          │
                          ▼
            [1. Immediate Item Escrow]
      - Deducts item quantity from seller inventory
      - Creates MarketOrder (status: 'active', escrowHeld: true)
                          │
                          ▼
             Decentralized Market Order Book
            (Sorted by lowest unit price per item)
                          │
                          ▼
                       Buyer Action
           (Clicks '✅ Buy Now' in Telegram)
                          │
                          ▼
           [Step 3 Middleware & ActionLock]
                          │
                          ▼
              [2. Atomic Trade Execution]
   (findOneAndUpdate({ orderId, status: 'active', escrowHeld: true }))
                          │
      ┌───────────────────┴───────────────────┐
      ▼                                       ▼
[Buyer Settlement]                      [Seller Settlement]
- Deducts total coins from Buyer         - Atomically credits coins to Seller
- Adds escrowed items to Buyer Inventory - Increments seller trade stats
- Increments buyer trade stats           - Works whether seller is ONLINE or OFFLINE!
```

---

## 2. Core Player Features & Commands

### 1. `/market`
Opens the Marketplace Hub with access to:
* **`🛒 Browse Market`**: Filter by category (Raw Lumber, Ores & Minerals, Refined Ingots, All Listings).
* **`📦 My Listings`**: Inspect active orders held in escrow and cancel at will.
* **`🏷️ How to Sell`**: In-game guide on the `/sell` command syntax.
* **`🎒 Backpack`**: Quick inventory shortcut.

### 2. `/sell <itemId> <quantity> <pricePerUnit>`
Lists items directly onto the global order book.
* **Example**: `/sell wood_oak 10 5` lists 10 Oak Wood for 5 coins each (50 coins total).
* **Escrow Guarantee**: The 10 Oak Wood are immediately removed from the seller's inventory and held safely in order escrow until bought or cancelled.

### 3. Listing Cancellation & Escrow Reclamation
* Sellers can cancel their active listings at any time.
* Cancelling marks `status: 'cancelled'`, sets `escrowHeld: false`, and **instantly returns 100% of escrowed items back to the seller's inventory**.
* Strict ownership validation: Players can only cancel their own listings.

---

## 3. Atomic Purchasing & Offline Seller Payouts
* **Race Condition Protection**: Uses atomic Mongoose condition locking (`findOneAndUpdate({ orderId, status: 'active', escrowHeld: true }, ...)`). If two players click buy at the exact same millisecond, exactly one transaction succeeds and the other is safely rejected.
* **Offline Seller Credit**: Uses atomic `$inc` on the seller's User record. The seller receives the full payment instantly, even if they have closed Telegram or are offline for days.
* **Zero Client Trust**: All calculations (item counts, prices, buyer balances, seller IDs) are authoritative server-side values.

---

## 4. Hierarchical Telegram UI & English + Hinglish Dialogue
Strictly follows the **2 buttons per row** layout:
```
/market
      ↓
[🛒 Browse Market]   [📦 My Listings]
[🏷️ How to Sell]     [🎒 View Inventory]
[⬅️ Main Menu]
      ↓ (Screen 2: Category Filter)
[🪵 Raw Lumber]      [🪨 Ores & Minerals]
[🔩 Refined Ingots]  [📦 All Listings]
[⬅️ Market Hub]      [🏠 Main Menu]
      ↓ (Screen 3: Paginated Listing Browse)
[🪵 10x Oak Wood • 50c] [🔩 2x Iron Ingot • 60c]
[◀️ Prev]      [• 1/2 •]    [Next ▶️]
[⬅️ Categories]             [🏠 Main Menu]
      ↓ (Screen 4: Listing Details & Buy Confirmation)
[✅ Buy Now]         [❌ Back]
[⬅️ Browse More]     [🏠 Main Menu]
      ↓ (Screen 5: Purchase Complete)
[🛒 Browse Market]   [📦 My Listings]
[🎒 View Backpack]   [🏠 Main Menu]
```

* **Natural English + Hinglish Dialogue**:
  * *"🎉 Purchased 10x Oak Wood for 50 Coins! Coins have been transferred to the merchant."*
  * *"🪙 Coins kam hain! Required: 50 Coins, Current: 10 Coins."*
  * *"📦 Listing cancelled. 10x Oak Wood have been returned to your backpack."*
