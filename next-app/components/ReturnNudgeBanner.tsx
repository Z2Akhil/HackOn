"use client";

import { isDiscretionaryReturn } from "@/lib/green-credit-engine";

export interface ReturnNudgeBannerProps {
  reason: string;
  deductionAmount?: number;
}

const RETURN_REASON_NOTES: Record<string, { headline: string; detail: string }> = {
  defective: {
    headline: "Defective items require documentation",
    detail: "Make sure the damage is clearly visible in your photos. Include the OTP code for verification.",
  },
  wrong_size: {
    headline: "Size mismatch is a common return reason",
    detail: "Provide clear photos showing the fit issue. The AI will assess if the item is genuinely the wrong size.",
  },
  not_as_described: {
    headline: "Document the difference from listing",
    detail: "Highlight specific areas where the product differs from the photos or description in your photos.",
  },
  changed_mind: {
    headline: "Returns due to second thoughts need clear documentation",
    detail: "Show the item's condition clearly. Items in good condition are prioritized for resale.",
  },
  wrong_variant: {
    headline: "Wrong variant — ensure clarity in your photos",
    detail: "Show the actual variant received and compare with what you ordered if possible.",
  },
};

export default function ReturnNudgeBanner({ reason, deductionAmount = 10 }: ReturnNudgeBannerProps) {
  // Check if this is a discretionary return (changed_mind or wrong_variant)
  if (!isDiscretionaryReturn(reason)) {
    return null;
  }

  // For discretionary returns, show the green credit deduction warning
  return (
    <div
      className="rounded-xl p-4 mb-4 animate-fade-in"
      style={{
        background: "rgba(245,158,11,0.06)",
        border: "1px solid rgba(245,158,11,0.2)",
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "#d97706", fontFamily: "Figtree, sans-serif" }}>
            Heads up: confirming this return will deduct {deductionAmount} green credits from your score.
          </p>
          <p className="text-xs leading-relaxed mt-1" style={{ color: "#92400e", fontFamily: "Figtree, sans-serif" }}>
            Early returns of items in good condition are incentivised to reduce unnecessary shipping and waste. Consider if this is truly necessary.
          </p>
        </div>
      </div>
    </div>
  );
}
