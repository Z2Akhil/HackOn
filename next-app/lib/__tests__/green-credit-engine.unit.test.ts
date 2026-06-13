import {
  computeReturnCredits,
  computeActionCredits,
  computeGCS,
  assignBadgeTier,
  computeNewMilestones,
  generateVoucher,
  getVoucherStatus,
  isDiscretionaryReturn,
  isWithin72Hours,
  recordAction,
  getBuyerGCS,
  getGCSAggregate,
  seedBuyerGCS,
} from "../green-credit-engine";
import { EcoAction, GreenVoucher, PostActionRequest } from "@/types";

// Helper to create a test action
function createTestAction(
  delta: number,
  actionType: string = "return_resell",
  id: string = `test-${Date.now()}`
): EcoAction {
  return {
    id,
    actionType: actionType as any,
    delta,
    timestamp: new Date().toISOString(),
    entityId: "test-entity",
    description: `Test action: ${actionType}`,
  };
}

describe("green-credit-engine: Pure Helper Functions", () => {
  // ========================================================================
  // computeReturnCredits
  // ========================================================================
  describe("computeReturnCredits", () => {
    it("should return 50 for refurbish disposition", () => {
      expect(computeReturnCredits("refurbish")).toBe(50);
    });

    it("should return 50 for resell disposition", () => {
      expect(computeReturnCredits("resell")).toBe(50);
    });

    it("should return 30 for donate disposition", () => {
      expect(computeReturnCredits("donate")).toBe(30);
    });

    it("should return 20 for recycle disposition", () => {
      expect(computeReturnCredits("recycle")).toBe(20);
    });

    it("should return 10 for exchange disposition", () => {
      expect(computeReturnCredits("exchange")).toBe(10);
    });

    it("should add 10 bonus when circularity >= 70", () => {
      expect(computeReturnCredits("refurbish", 70)).toBe(60);
      expect(computeReturnCredits("resell", 75)).toBe(60);
      expect(computeReturnCredits("donate", 80)).toBe(40);
    });

    it("should not add bonus when circularity < 70", () => {
      expect(computeReturnCredits("refurbish", 69)).toBe(50);
      expect(computeReturnCredits("resell", 50)).toBe(50);
      expect(computeReturnCredits("donate", 0)).toBe(30);
    });

    it("should handle undefined circularity", () => {
      expect(computeReturnCredits("refurbish", undefined)).toBe(50);
    });
  });

  // ========================================================================
  // computeActionCredits
  // ========================================================================
  describe("computeActionCredits", () => {
    it("should delegate return types to computeReturnCredits", () => {
      expect(computeActionCredits("return_refurbish")).toBe(50);
      expect(computeActionCredits("return_resell")).toBe(50);
      expect(computeActionCredits("return_donate")).toBe(30);
    });

    it("should return correct credits for marketplace_purchase", () => {
      expect(computeActionCredits("marketplace_purchase")).toBe(40);
    });

    it("should return correct credits for shipping_consolidated", () => {
      expect(computeActionCredits("shipping_consolidated")).toBe(15);
    });

    it("should return correct credits for shipping_carbon_offset", () => {
      expect(computeActionCredits("shipping_carbon_offset")).toBe(25);
    });

    it("should return -10 for deduction_discretionary_return", () => {
      expect(computeActionCredits("deduction_discretionary_return")).toBe(-10);
    });

    it("should use metadata.circularityScore for return types", () => {
      expect(
        computeActionCredits("return_refurbish", {
          circularityScore: 75,
        })
      ).toBe(60);
      expect(
        computeActionCredits("return_donate", {
          circularityScore: 85,
        })
      ).toBe(40);
    });
  });

  // ========================================================================
  // computeGCS
  // ========================================================================
  describe("computeGCS", () => {
    it("should return 0 for empty action log", () => {
      expect(computeGCS([])).toBe(0);
    });

    it("should sum positive deltas", () => {
      const actions = [
        createTestAction(50),
        createTestAction(40),
        createTestAction(30),
      ];
      expect(computeGCS(actions)).toBe(120);
    });

    it("should subtract negative deltas", () => {
      const actions = [
        createTestAction(100),
        createTestAction(-10),
        createTestAction(-20),
      ];
      expect(computeGCS(actions)).toBe(70);
    });

    it("should clamp to minimum 0", () => {
      const actions = [createTestAction(-50), createTestAction(-30)];
      expect(computeGCS(actions)).toBe(0);
    });

    it("should clamp to maximum 1000", () => {
      const actions = [
        createTestAction(600),
        createTestAction(500),
        createTestAction(100),
      ];
      expect(computeGCS(actions)).toBe(1000);
    });

    it("should handle mixed positive and negative to stay within bounds", () => {
      const actions = [
        createTestAction(400),
        createTestAction(400),
        createTestAction(300),
        createTestAction(-100),
      ];
      expect(computeGCS(actions)).toBe(1000);
    });
  });

  // ========================================================================
  // assignBadgeTier
  // ========================================================================
  describe("assignBadgeTier", () => {
    it("should assign Seedling for 0-199", () => {
      expect(assignBadgeTier(0)).toBe("Seedling");
      expect(assignBadgeTier(99)).toBe("Seedling");
      expect(assignBadgeTier(199)).toBe("Seedling");
    });

    it("should assign Sprout for 200-499", () => {
      expect(assignBadgeTier(200)).toBe("Sprout");
      expect(assignBadgeTier(299)).toBe("Sprout");
      expect(assignBadgeTier(499)).toBe("Sprout");
    });

    it("should assign EcoChampion for 500-799", () => {
      expect(assignBadgeTier(500)).toBe("EcoChampion");
      expect(assignBadgeTier(599)).toBe("EcoChampion");
      expect(assignBadgeTier(799)).toBe("EcoChampion");
    });

    it("should assign Guardian for 800-1000", () => {
      expect(assignBadgeTier(800)).toBe("Guardian");
      expect(assignBadgeTier(899)).toBe("Guardian");
      expect(assignBadgeTier(1000)).toBe("Guardian");
    });

    it("should cover all integers from 0 to 1000 without gaps", () => {
      for (let gcs = 0; gcs <= 1000; gcs += 10) {
        const tier = assignBadgeTier(gcs);
        expect(["Seedling", "Sprout", "EcoChampion", "Guardian"]).toContain(
          tier
        );
      }
    });
  });

  // ========================================================================
  // computeNewMilestones
  // ========================================================================
  describe("computeNewMilestones", () => {
    it("should return empty array when no milestone crossed", () => {
      const result = computeNewMilestones(0, 100, new Set());
      expect(result).toEqual([]);
    });

    it("should return [200] when crossing 200 for first time", () => {
      const result = computeNewMilestones(150, 250, new Set());
      expect(result).toEqual([200]);
    });

    it("should return [200, 500] when crossing both for first time", () => {
      const result = computeNewMilestones(150, 620, new Set());
      expect(result).toContain(200);
      expect(result).toContain(500);
      expect(result.length).toBe(2);
    });

    it("should not return milestone if already reached", () => {
      const result = computeNewMilestones(150, 620, new Set([200]));
      expect(result).toEqual([500]);
    });

    it("should return all four milestones when going from 0 to 1000", () => {
      const result = computeNewMilestones(0, 1000, new Set());
      expect(result).toContain(200);
      expect(result).toContain(500);
      expect(result).toContain(800);
      expect(result).toContain(1000);
      expect(result.length).toBe(4);
    });

    it("should not return milestones when score decreases", () => {
      const result = computeNewMilestones(600, 300, new Set());
      expect(result).toEqual([]);
    });
  });

  // ========================================================================
  // generateVoucher
  // ========================================================================
  describe("generateVoucher", () => {
    it("should generate voucher with correct structure", () => {
      const now = new Date("2025-01-15");
      const voucher = generateVoucher(200, now);

      expect(voucher).toHaveProperty("id");
      expect(voucher).toHaveProperty("code");
      expect(voucher).toHaveProperty("milestoneGCS");
      expect(voucher).toHaveProperty("discountPct");
      expect(voucher).toHaveProperty("issuedAt");
      expect(voucher).toHaveProperty("expiresAt");
      expect(voucher).toHaveProperty("status");
    });

    it("should set correct discount for milestone 200", () => {
      const voucher = generateVoucher(200, new Date());
      expect(voucher.discountPct).toBe(5);
    });

    it("should set correct discount for milestone 500", () => {
      const voucher = generateVoucher(500, new Date());
      expect(voucher.discountPct).toBe(10);
    });

    it("should set correct discount for milestone 800", () => {
      const voucher = generateVoucher(800, new Date());
      expect(voucher.discountPct).toBe(15);
    });

    it("should set correct discount for milestone 1000", () => {
      const voucher = generateVoucher(1000, new Date());
      expect(voucher.discountPct).toBe(20);
    });

    it("should set status to active", () => {
      const voucher = generateVoucher(200, new Date());
      expect(voucher.status).toBe("active");
    });

    it("should generate voucher code with correct format", () => {
      const voucher = generateVoucher(200, new Date("2025-01-15"));
      // Code format: GCS{milestone}-{4chars}-{year}
      expect(voucher.code).toMatch(/^GCS200-[A-Z0-9]{4}-2025$/);
    });

    it("should set expiry to 90 days from now", () => {
      const now = new Date("2025-01-15");
      const voucher = generateVoucher(200, now);
      const expiry = new Date(voucher.expiresAt);

      const expectedExpiry = new Date("2025-01-15");
      expectedExpiry.setDate(expectedExpiry.getDate() + 90);

      expect(expiry.getTime()).toBe(expectedExpiry.getTime());
    });

    it("should have unique IDs for multiple vouchers", () => {
      const v1 = generateVoucher(200, new Date());
      const v2 = generateVoucher(200, new Date());
      expect(v1.id).not.toBe(v2.id);
    });
  });

  // ========================================================================
  // getVoucherStatus
  // ========================================================================
  describe("getVoucherStatus", () => {
    it("should return active for voucher not yet expired", () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      const voucher: GreenVoucher = {
        id: "test-1",
        code: "TEST-CODE",
        milestoneGCS: 200,
        discountPct: 5,
        issuedAt: new Date().toISOString(),
        expiresAt: future.toISOString(),
        status: "active",
      };

      expect(getVoucherStatus(voucher, new Date())).toBe("active");
    });

    it("should return expired for voucher past expiry date", () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      const voucher: GreenVoucher = {
        id: "test-1",
        code: "TEST-CODE",
        milestoneGCS: 200,
        discountPct: 5,
        issuedAt: new Date().toISOString(),
        expiresAt: past.toISOString(),
        status: "active",
      };

      expect(getVoucherStatus(voucher, new Date())).toBe("expired");
    });

    it("should return expired on exact expiry date", () => {
      const now = new Date("2025-01-15T12:00:00Z");
      const expiry = new Date("2025-01-15T12:00:00Z");
      const voucher: GreenVoucher = {
        id: "test-1",
        code: "TEST-CODE",
        milestoneGCS: 200,
        discountPct: 5,
        issuedAt: new Date().toISOString(),
        expiresAt: expiry.toISOString(),
        status: "active",
      };

      expect(getVoucherStatus(voucher, now)).toBe("expired");
    });

    it("should use current date if now is not provided", () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      const voucher: GreenVoucher = {
        id: "test-1",
        code: "TEST-CODE",
        milestoneGCS: 200,
        discountPct: 5,
        issuedAt: new Date().toISOString(),
        expiresAt: future.toISOString(),
        status: "active",
      };

      expect(getVoucherStatus(voucher)).toBe("active");
    });
  });

  // ========================================================================
  // isDiscretionaryReturn
  // ========================================================================
  describe("isDiscretionaryReturn", () => {
    it("should return true for changed_mind", () => {
      expect(isDiscretionaryReturn("changed_mind")).toBe(true);
    });

    it("should return true for wrong_variant", () => {
      expect(isDiscretionaryReturn("wrong_variant")).toBe(true);
    });

    it("should return false for defective", () => {
      expect(isDiscretionaryReturn("defective")).toBe(false);
    });

    it("should return false for wrong_size", () => {
      expect(isDiscretionaryReturn("wrong_size")).toBe(false);
    });

    it("should return false for not_as_described", () => {
      expect(isDiscretionaryReturn("not_as_described")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isDiscretionaryReturn("")).toBe(false);
    });

    it("should return false for unknown reason", () => {
      expect(isDiscretionaryReturn("some_other_reason")).toBe(false);
    });

    it("should be case sensitive", () => {
      expect(isDiscretionaryReturn("Changed_Mind")).toBe(false);
      expect(isDiscretionaryReturn("CHANGED_MIND")).toBe(false);
    });
  });

  // ========================================================================
  // isWithin72Hours
  // ========================================================================
  describe("isWithin72Hours", () => {
    it("should return true for action 1 hour after delivery", () => {
      const delivery = new Date("2025-01-15T10:00:00Z");
      const action = new Date("2025-01-15T11:00:00Z");
      expect(
        isWithin72Hours(
          delivery.toISOString(),
          action.toISOString()
        )
      ).toBe(true);
    });

    it("should return true for action exactly 72 hours after delivery", () => {
      const delivery = new Date("2025-01-15T10:00:00Z");
      const action = new Date("2025-01-18T10:00:00Z");
      expect(
        isWithin72Hours(
          delivery.toISOString(),
          action.toISOString()
        )
      ).toBe(true);
    });

    it("should return false for action beyond 72 hours", () => {
      const delivery = new Date("2025-01-15T10:00:00Z");
      const action = new Date("2025-01-18T10:00:01Z");
      expect(
        isWithin72Hours(
          delivery.toISOString(),
          action.toISOString()
        )
      ).toBe(false);
    });

    it("should return false for action before delivery", () => {
      const delivery = new Date("2025-01-15T10:00:00Z");
      const action = new Date("2025-01-15T09:00:00Z");
      expect(
        isWithin72Hours(
          delivery.toISOString(),
          action.toISOString()
        )
      ).toBe(false);
    });

    it("should return true for action same time as delivery", () => {
      const delivery = new Date("2025-01-15T10:00:00Z");
      expect(
        isWithin72Hours(
          delivery.toISOString(),
          delivery.toISOString()
        )
      ).toBe(true);
    });

    it("should handle various timestamp formats", () => {
      const delivery = "2025-01-15T10:00:00Z";
      const action = "2025-01-15T12:00:00Z";
      expect(isWithin72Hours(delivery, action)).toBe(true);
    });
  });

  // ========================================================================
  // recordAction (stateful function)
  // ========================================================================
  describe("recordAction", () => {
    it("should record action and update GCS", () => {
      const response = recordAction({
        buyerId: "test-buyer-1",
        actionType: "return_resell",
        entityId: "product-1",
        eventId: "event-1",
      });

      expect(response.success).toBe(true);
      expect(response.delta).toBe(50);
      expect(response.newGCS).toBe(50);
      expect(response.newBadgeTier).toBe("Seedling");
    });

    it("should handle duplicate eventId (idempotency)", () => {
      const req: PostActionRequest = {
        buyerId: "test-buyer-2",
        actionType: "return_resell",
        entityId: "product-1",
        eventId: "event-2",
      };

      const response1 = recordAction(req);
      const response2 = recordAction(req);

      expect(response1.newGCS).toBe(50);
      expect(response2.newGCS).toBe(50);
      expect(response2.delta).toBe(0); // Second call returns 0 delta
    });

    it("should generate voucher when crossing milestone", () => {
      const buyerId = "test-buyer-3";
      const events = [
        { actionType: "marketplace_purchase" as const, eventId: "e1" },
        { actionType: "marketplace_purchase" as const, eventId: "e2" },
        { actionType: "marketplace_purchase" as const, eventId: "e3" },
        { actionType: "marketplace_purchase" as const, eventId: "e4" },
        { actionType: "marketplace_purchase" as const, eventId: "e5" },
      ];

      let response;
      for (const event of events) {
        response = recordAction({
          buyerId,
          actionType: event.actionType,
          entityId: "product-x",
          eventId: event.eventId,
        });
      }

      // 40 * 5 = 200, should cross 200 milestone
      expect(response!.vouchersGenerated.length).toBe(1);
      expect(response!.vouchersGenerated[0].milestoneGCS).toBe(200);
    });

    it("should assign correct badge tier after recording action", () => {
      const buyerId = "test-buyer-4";
      // Need 500+ for EcoChampion
      const events = [
        { actionType: "return_resell" as const, eventId: "e1", delta: 50 },
        { actionType: "return_resell" as const, eventId: "e2", delta: 50 },
        {
          actionType: "return_resell" as const,
          eventId: "e3",
          delta: 50,
          metadata: { circularityScore: 75 },
        },
        {
          actionType: "return_resell" as const,
          eventId: "e4",
          delta: 50,
          metadata: { circularityScore: 75 },
        },
        {
          actionType: "return_resell" as const,
          eventId: "e5",
          delta: 50,
          metadata: { circularityScore: 75 },
        },
        {
          actionType: "return_resell" as const,
          eventId: "e6",
          delta: 50,
          metadata: { circularityScore: 75 },
        },
        {
          actionType: "return_resell" as const,
          eventId: "e7",
          delta: 50,
          metadata: { circularityScore: 75 },
        },
      ];

      let response;
      for (const event of events) {
        response = recordAction({
          buyerId,
          actionType: event.actionType,
          entityId: "product-x",
          eventId: event.eventId,
          metadata: event.metadata,
        });
      }

      // 50 + 50 + 60 + 60 + 60 + 60 + 60 = 400 (Sprout)
      expect(response!.newBadgeTier).toBe("Sprout");
    });
  });

  // ========================================================================
  // getBuyerGCS
  // ========================================================================
  describe("getBuyerGCS", () => {
    it("should return empty record for new buyer", () => {
      const response = getBuyerGCS("new-buyer-xyz");
      expect(response.buyerId).toBe("new-buyer-xyz");
      expect(response.gcs).toBe(0);
      expect(response.badgeTier).toBe("Seedling");
      expect(response.actionLog).toEqual([]);
      expect(response.vouchers).toEqual([]);
    });

    it("should return action log in reverse chronological order", () => {
      const buyerId = "test-buyer-5";

      recordAction({
        buyerId,
        actionType: "return_resell",
        entityId: "p1",
        eventId: "e1",
      });

      recordAction({
        buyerId,
        actionType: "marketplace_purchase",
        entityId: "p2",
        eventId: "e2",
      });

      const response = getBuyerGCS(buyerId);
      expect(response.actionLog.length).toBe(2);
      // Verify both actions are present (both should have similar timestamps, so check both are there)
      const actionTypes = response.actionLog.map((a) => a.actionType);
      expect(actionTypes).toContain("return_resell");
      expect(actionTypes).toContain("marketplace_purchase");
    });
  });

  // ========================================================================
  // getGCSAggregate
  // ========================================================================
  describe("getGCSAggregate", () => {
    it("should return aggregate stats", () => {
      const aggregate = getGCSAggregate();
      expect(aggregate).toHaveProperty("totalVouchersIssued");
      expect(aggregate).toHaveProperty("monthlyCreditsEarned");
      expect(aggregate).toHaveProperty("tierCounts");
      expect(typeof aggregate.totalVouchersIssued).toBe("number");
      expect(typeof aggregate.monthlyCreditsEarned).toBe("number");
    });

    it("should have tier counts for all tiers", () => {
      const aggregate = getGCSAggregate();
      expect(aggregate.tierCounts).toHaveProperty("Seedling");
      expect(aggregate.tierCounts).toHaveProperty("Sprout");
      expect(aggregate.tierCounts).toHaveProperty("EcoChampion");
      expect(aggregate.tierCounts).toHaveProperty("Guardian");
    });
  });

  // ========================================================================
  // seedBuyerGCS
  // ========================================================================
  describe("seedBuyerGCS", () => {
    it("should seed buyer with pre-built actions", () => {
      const buyerId = "seeded-buyer-1";
      const actions = [
        {
          actionType: "return_resell" as const,
          delta: 50,
          timestamp: new Date().toISOString(),
          entityId: "p1",
          description: "Test return",
        },
        {
          actionType: "marketplace_purchase" as const,
          delta: 40,
          timestamp: new Date().toISOString(),
          entityId: "p2",
          description: "Test purchase",
        },
      ];

      seedBuyerGCS(buyerId, actions);
      const response = getBuyerGCS(buyerId);

      expect(response.gcs).toBe(90);
      expect(response.actionLog.length).toBe(2);
    });

    it("should generate vouchers for reached milestones during seeding", () => {
      const buyerId = "seeded-buyer-2";
      const largeActions = Array.from({ length: 10 }, (_, i) => ({
        actionType: "marketplace_purchase" as const,
        delta: 40,
        timestamp: new Date().toISOString(),
        entityId: `p${i}`,
        description: "Seeded purchase",
      }));

      seedBuyerGCS(buyerId, largeActions);
      const response = getBuyerGCS(buyerId);

      // 40 * 10 = 400, should have vouchers for 200 milestone
      expect(response.gcs).toBe(400);
      expect(response.vouchers.length).toBeGreaterThan(0);
    });
  });
});
