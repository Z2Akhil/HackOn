"use client";
import { Star, StarHalf } from "lucide-react";

// Amazon-style orange star rating. Renders 5 stars with half-star precision.
export default function StarRating({
  rating,
  size = 14,
  showValue = false,
}: {
  rating: number;
  size?: number;
  showValue?: boolean;
}) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  const STAR = "#FFA41C";

  return (
    <span className="inline-flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      <span className="inline-flex items-center">
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < full) {
            return <Star key={i} width={size} height={size} fill={STAR} stroke={STAR} />;
          }
          if (i === full && hasHalf) {
            return (
              <span key={i} className="relative inline-flex" style={{ width: size, height: size }}>
                <Star width={size} height={size} fill="none" stroke="#E0E0E0" className="absolute inset-0" />
                <StarHalf width={size} height={size} fill={STAR} stroke={STAR} className="absolute inset-0" />
              </span>
            );
          }
          return <Star key={i} width={size} height={size} fill="none" stroke="#E0E0E0" />;
        })}
      </span>
      {showValue && (
        <span className="text-sm font-medium" style={{ color: "#0F1111" }}>{rating.toFixed(1)}</span>
      )}
    </span>
  );
}
