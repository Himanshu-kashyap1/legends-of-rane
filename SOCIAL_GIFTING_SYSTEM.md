# 🎁 Legends of Rane — Social Gifting & Player-to-Player Transfers

## 1. System Overview & Architecture
The Social Gifting System allows high-level players to transfer raw or refined materials, potions, and supplies to their friends and guildmates. It includes stringent level gating, daily quotas, anti-duplication transaction locks, and full audit logging.

```
                      Sender Action
             (/gift @username <item> <qty>)
                          │
                          ▼
            [Step 3 Middleware Pipeline]
         (ErrorBoundary → UserLoader → ActionLock)
                          │
                          ▼
                    Gifting Engine
          (src/engine/social/giftingEngine.js)
                          │
      ┌───────────────────┼───────────────────┐
      ▼                   ▼                   ▼
[Level Check (Lv 3+)] [Daily Quota (≤5)] [Inventory & Self Check]
      └───────────────────┬───────────────────┘
                          │
                          ▼
              [Atomic State Transfer]
      - Deducts quantity from Sender inventory
      - Increments Sender dailySentCount & giftsSent stats
      - Adds quantity to Recipient inventory (online or offline!)
      - Increments Recipient giftsReceived stats
      - Creates GiftRecord audit document
                          │
                          ▼
                Telegram View Render
          (src/telegram/views/giftingView.js)
```

---

## 2. Business Rules & Gifting Restrictions

1. **Level Requirement**: Sender must be at least **Level 3+** (`user.level >= 3`). Low-level players cannot send gifts.
2. **Daily Gifting Cap**: Players can send a maximum of **5 gifts per UTC day**.
3. **Daily Automatic Reset**: When the calendar date changes in UTC, the daily sent counter automatically resets to `0`.
4. **Recipient Resolution**: Resolves players by exact `@username` or numerical `telegramId`. Recipient must have initialized their account with `/start`.
5. **Self-Gift Protection**: Players cannot send gifts to their own account.
6. **Positive Integers Only**: Quantity must be an integer $\ge 1$.
7. **Inventory Guarantee**: Items are verified and deducted in an atomic transaction; players cannot gift items they do not possess.

---

## 3. Command Syntax & Examples

### `/gift`
* Sent without arguments: displays your current level status, daily quota progress (e.g. `1/5 gifts sent today`), and command usage instructions.

### `/gift @username <itemId> <quantity>`
* Transfers `<quantity>` of `<itemId>` to `@username`.
* **Example**: `/gift @friend wood_oak 10` transfers 10 Oak Wood to `@friend`.
* **Example**: `/gift @ally ingot_iron 2` transfers 2 Iron Ingots to `@ally`.

---

## 4. Audit Trail & GiftRecord Schema
Every gift creates a permanent record in MongoDB (`GiftRecord` collection) storing:
* `giftId`: Unique identifier (`gift_xxxxxxxxxx`)
* `senderId` & `senderUsername`
* `recipientId` & `recipientUsername`
* `itemId` & `quantity`
* `sentAt`: Timestamp of the transaction

---

## 5. Telegram UI & Natural English + Hinglish Dialogue
* **Success Report**:
  * *"🎉 GIFT SENT SUCCESSFULLY! 10x 🪵 Oak Wood successfully @friend ko gift kar diya! Remaining daily quota: 4/5 gifts left today."*
* **Error Notifications**:
  * *"⭐ Level Kam Hai! Gifting unlock karne ke liye Level 3+ required hai (Aapka Level: 1)."*
  * *"📅 Daily Quota Exceeded! Aaj ka daily gift quota (5/5 gifts) complete ho chuka hai. UTC midnight par reset hoga."*
  * *"📦 Inventory Kam Hai! Required: 10, Owned: 2."*
  * *"⚠️ Recipient Player Nahi Mila! Make sure unka username correct hai aur unhone bot ko /start kiya hua hai."*
