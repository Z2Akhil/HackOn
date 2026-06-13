I'll walk you through the complete flow step-by-step, from starting the app to seeing the Green Credit Score system in action.

## **COMPLETE FLOW - START TO FINISH**

---

### **STEP 1: SETUP (One-time)**

Open your terminal and navigate to the Next.js app:

```bash
cd c:\Users\HP\HackOn\next-app
```

Install dependencies (if not already done):

```bash
npm install
```

This installs all required packages including Jest, TypeScript, React, etc.

---

### **STEP 2: VERIFY EVERYTHING WORKS (Run Tests)**

Run the test suite to confirm all 68 tests pass:

```bash
npm run test:run
```

**Expected output:**
```
PASS  lib/__tests__/green-credit-engine.unit.test.ts
  ✓ 68 tests passed
```

If you see all green checkmarks, the core engine is working correctly.

---

### **STEP 3: START THE DEV SERVER**

Start the development server:

```bash
npm run dev
```

**Expected output:**
```
  ▲ Next.js 15.x.x
  - Ready in 1.2s
  - http://localhost:3000
```

Open your browser and go to: **http://localhost:3000**

---

### **STEP 4: EXPLORE THE GREEN CREDIT SCORE SYSTEM**

Now you have 3 demo buyers already loaded with credit data:
- **b001**: ~355 points (🌿 Sprout tier)
- **b002**: ~535 points (🏆 EcoChampion tier)
- **b003**: ~85 points (🌱 Seedling tier)

#### **A) View Score in Navigation Bar**
1. Look at the top navigation bar
2. You'll see: **"🌿 355 pts · Sprout"** (this is for b001)
3. This is the **ScoreWidget** - it polls every 5 seconds for updates

#### **B) Visit the Green Credit Profile Page**
1. Click on the score widget (🌿 355 pts · Sprout)
2. You'll be taken to: **http://localhost:3000/profile/green-score**
3. Here you'll see:
   - **Hero circular progress ring** showing current points (355/1000)
   - **Current tier card** (🌿 Sprout - 200-499 pts)
   - **Milestone progress** (how close to next tier)
   - **Earned vouchers** grid (5%, 10%, 15%, 20% off vouchers - click to see details)
   - **Action log** showing all actions that earned/deducted credits (reverse chronological)

#### **C) Test a Return Action (See Discretionary Return Deduction)**
1. Go to: **http://localhost:3000/return**
2. Select a product to return
3. Choose reason: **"Changed my mind"** (this is a discretionary return)
4. **Amber banner appears**: ⚠️ *"Heads up: confirming this return will deduct 10 green credits"*
5. Confirm the return
6. Points drop from 355 → 345 (−10 credit deduction)
7. Go back to `/profile/green-score` and refresh
8. You'll see the new action in the action log with −10 points

#### **D) View Dashboard Analytics**
1. Go to: **http://localhost:3000/dashboard**
2. Scroll down to see **3 new Green Credit KPIs**:
   - 🎟️ **Green Vouchers Issued**: Total vouchers earned across all buyers
   - 🌿 **Credits This Month**: Credits earned by this buyer this month
   - 🌿 **Green Credits**: Current total points for this buyer
3. Also see **Badge Tier Breakdown** card showing all 4 tiers:
   - 🌱 Seedling (0-199 pts)
   - 🌿 Sprout (200-499 pts)
   - 🏆 EcoChampion (500-799 pts)
   - 🛡️ Guardian (800-1000 pts)

---

### **STEP 5: UNDERSTAND THE CREDIT SYSTEM**

**How credits are earned:**

| Action | Points |
|--------|--------|
| Return & Refurbish/Resell | +50 |
| Return & Donate | +30 |
| Return & Recycle | +20 |
| Return & Exchange | +10 |
| Marketplace Purchase | +40 |
| Consolidated Shipping | +15 |
| Carbon Offset Shipping | +25 |
| High Circularity Bonus | +10 (if circularity ≥ 70) |
| **Discretionary Return** | **−10** |

**How vouchers work:**

Reach these milestones to unlock vouchers:
- 200 pts → 5% discount voucher (expires 90 days)
- 500 pts → 10% discount voucher (expires 90 days)
- 800 pts → 15% discount voucher (expires 90 days)
- 1000 pts → 20% discount voucher (expires 90 days)

---

### **STEP 6: TECHNICAL DETAILS (Behind the Scenes)**

**Where the code lives:**

```
lib/green-credit-engine.ts          ← All logic (pure functions + state)
lib/__tests__/green-credit-engine.unit.test.ts  ← 68 unit tests
types/index.ts                      ← 9 new GCS types (BadgeTier, EcoAction, etc.)

API Routes:
app/api/green-credit/[buyerId]/route.ts      ← GET buyer's current score
app/api/green-credit/action/route.ts         ← POST new action (earn/deduct credits)
app/api/disposition/route.ts                 ← Updated to record return actions
app/api/dashboard/route.ts                   ← Updated with GCS analytics

UI Components:
components/ScoreWidget.tsx                   ← Nav bar score pill + inline card
components/ReturnNudgeBanner.tsx             ← Amber warning banner
app/profile/green-score/page.tsx             ← Full profile page with hero, tier, vouchers, log
app/dashboard/page.tsx                       ← Extended with 3 GCS KPIs + tier breakdown
components/Nav.tsx                           ← Integrated ScoreWidget
app/return/page.tsx                          ← Injected ReturnNudgeBanner
```

**Data flow when you return a product:**

1. User goes to `/return`
2. Selects item → chooses reason (e.g., "Changed my mind")
3. **ReturnNudgeBanner** checks: is this discretionary? → Shows ⚠️ warning
4. User confirms
5. API calls `POST /api/disposition` 
6. Disposition route calls `recordAction()` from engine
7. Engine:
   - Checks if action is discretionary → deduct −10 pts
   - Deducts −10 from buyer's GCS
   - Records action in action log
8. Returns updated score
9. **ScoreWidget** polls every 5s and refreshes the display
10. User sees updated score and action in log

---

### **STEP 7: HOW DATA PERSISTS (Important!)**

⚠️ **All data is in-memory** (resets on server restart)

- The system uses a module-level `Map` to store buyer data (same pattern as existing `listingFlags`)
- At server startup, `static-data.ts` seeds 3 demo buyers with initial data
- Perfect for development/demo
- For production, you'd connect to a database

**To reset data:** Just restart the dev server (`npm run dev`)

---

### **STEP 8: OPTIONAL - RUN REMAINING PROPERTY-BASED TESTS**

If you want to run the 4 optional advanced tests (these test correctness properties with randomized inputs):

I can execute these for you. Just say **"run optional tasks"** and I'll dispatch them to complete.

These test:
- Pure function correctness
- Stateful operation invariants
- API round-trip integrity
- Edge cases with random data

---

## **QUICK REFERENCE - URLS TO TEST**

| Page | URL | What to See |
|------|-----|-------------|
| **Home** | http://localhost:3000 | ScoreWidget in nav bar |
| **Profile** | http://localhost:3000/profile/green-score | Hero ring, tier, vouchers, action log |
| **Return Flow** | http://localhost:3000/return | Discretionary return warning banner |
| **Dashboard** | http://localhost:3000/dashboard | 3 new GCS KPIs + tier breakdown |
| **Marketplace** | http://localhost:3000/marketplace | Purchase actions (earn +40 pts) |

---
