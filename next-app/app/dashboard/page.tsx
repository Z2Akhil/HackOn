"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface DashboardStats {
  total_processed: number;
  returns_prevented: number;
  disposition_split: Record<string, number>;
  value_recovered_inr: number;
  ewaste_diverted_kg: number;
  green_credits_awarded: number;
  co2_saved_kg: number;
  products_given_second_life: number;
  landfill_avoided_kg: number;
  refurb_success_rate: number;
  avg_circularity_score: number;
  top_categories: { category: string; items: number }[];
  monthly_trend: { month: string; prevented: number; processed: number; co2_saved: number }[];
  flagged_listings: { product_id: string; flag_count: number }[];
}

const DISPOSITION_COLORS: Record<string, string> = {
  resell: "#10b981", refurbish: "#3b82f6", donate: "#8b5cf6", recycle: "#22c55e", exchange: "#f59e0b",
};

const KPIS = [
  { key: "total_processed",           label: "Items Processed",        icon: "📦", format: "num"                },
  { key: "returns_prevented",         label: "Returns Prevented",      icon: "🛡️", format: "num"               },
  { key: "value_recovered_inr",       label: "Value Recovered",        icon: "💰", format: "currency"           },
  { key: "co2_saved_kg",              label: "CO₂ Saved",              icon: "🌱", format: "num", suffix: "kg"  },
  { key: "products_given_second_life",label: "Products Reused",        icon: "♻️", format: "num"               },
  { key: "ewaste_diverted_kg",        label: "E-Waste Diverted",       icon: "🔋", format: "num", suffix: "kg"  },
  { key: "landfill_avoided_kg",       label: "Landfill Avoided",       icon: "🗑️", format: "num", suffix: "kg" },
  { key: "avg_circularity_score",     label: "Avg Circularity",        icon: "🔄", format: "num", suffix: "/100"},
  { key: "green_credits_awarded",     label: "Green Credits",          icon: "🌿", format: "num"               },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: "#18181b", border: "1px solid #27272a", fontFamily: "Figtree, sans-serif" }}>
      <p className="text-xs font-semibold mb-1" style={{ color: "#52525b" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-sm font-bold" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: "#18181b", border: "1px solid #27272a", fontFamily: "Figtree, sans-serif" }}>
      <p className="text-sm font-bold" style={{ color: DISPOSITION_COLORS[name] ?? "#fafafa" }}>{name}: {value}</p>
    </div>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-10 space-y-4">
        <div className="h-8 w-48 rounded-xl skeleton" />
        <div className="grid grid-cols-5 gap-3">{[...Array(5)].map((_,i)=><div key={i} className="h-24 rounded-xl skeleton"/>)}</div>
        <div className="grid md:grid-cols-2 gap-4">{[0,1].map(i=><div key={i} className="h-64 rounded-xl skeleton"/>)}</div>
      </div>
    );
  }
  if (!stats) return null;

  const dispositionData = Object.entries(stats.disposition_split).map(([name, value]) => ({ name, value }));

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full mb-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "#10b981" }} />
              <span className="text-xs font-semibold" style={{ color: "#10b981", fontFamily: "Figtree, sans-serif" }}>Live Pipeline</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Ops Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
              Real-time view of the ReLoop pipeline — value recovered, waste diverted, flywheel spinning.
            </p>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 animate-fade-up delay-1">
        {KPIS.map(({ key, label, icon, format, suffix }) => {
          const raw = (stats as any)[key];
          const display = format === "currency"
            ? `₹${Number(raw).toLocaleString("en-IN")}`
            : `${raw}${suffix ?? ""}`;
          return (
            <div key={key} className="rounded-xl p-4 min-w-0" style={{ background: "#111113", border: "1px solid #27272a" }}>
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-xl font-black truncate" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>{display}</div>
              <div className="text-xs mt-1" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>{label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4 animate-fade-up delay-2">
        {/* Disposition pie */}
        <div className="rounded-xl p-5" style={{ background: "#111113", border: "1px solid #27272a" }}>
          <h2 className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Disposition Split</h2>
          <p className="text-xs mb-4" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>multi-objective score (EV + sustainability + trust) across {stats.total_processed} items</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={dispositionData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                {dispositionData.map((entry) => (
                  <Cell key={entry.name} fill={DISPOSITION_COLORS[entry.name] ?? "#27272a"} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend formatter={(v) => <span style={{ color: "#71717a", fontSize: "12px", fontFamily: "Figtree, sans-serif" }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly trend */}
        <div className="rounded-xl p-5" style={{ background: "#111113", border: "1px solid #27272a" }}>
          <h2 className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Prevention · Processing · CO₂ Saved</h2>
          <p className="text-xs mb-4" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>flywheel: prevention model improves as pipeline grows</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.monthly_trend}>
              <XAxis dataKey="month" tick={{ fill: "#52525b", fontSize: 11, fontFamily: "Figtree, sans-serif" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => <span style={{ color: "#71717a", fontSize: "12px", fontFamily: "Figtree, sans-serif" }}>{v}</span>} />
              <Line type="monotone" dataKey="processed" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} name="Processed" />
              <Line type="monotone" dataKey="prevented" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} name="Prevented" />
              <Line type="monotone" dataKey="co2_saved" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} name="CO₂ Saved (kg)" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category bar */}
      <div className="rounded-xl p-5 animate-fade-up delay-3" style={{ background: "#111113", border: "1px solid #27272a" }}>
        <h2 className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>Items by Category</h2>
        <p className="text-xs mb-4" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>distribution across categories in pipeline</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats.top_categories} layout="vertical" margin={{ left: 0 }}>
            <XAxis type="number" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="category" type="category" tick={{ fill: "#71717a", fontSize: 11, fontFamily: "Figtree, sans-serif" }} width={110} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="items" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Flywheel */}
      <div className="rounded-xl p-6 animate-fade-up delay-4" style={{ background: "#111113", border: "1px solid #27272a" }}>
        <h2 className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: "#fafafa" }}>The ReLoop Flywheel</h2>
        <p className="text-xs mb-6" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
          Prevention model trains on disposition outcomes — better predictions → fewer returns → more data → better model
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { icon: "🛡️", label: "Return Prevention", sub: "LightGBM GBM" },
            { arrow: true },
            { icon: "📷", label: "AI Grading", sub: "Gemini 2.5 Flash" },
            { arrow: true },
            { icon: "🧮", label: "Multi-Obj Optimizer", sub: "EV+sustainability+trust" },
            { arrow: true },
            { icon: "🛒", label: "Marketplace", sub: "Buyer matching" },
            { arrow: true },
            { icon: "📈", label: "Model Improves", sub: "Flywheel closes" },
          ].map((item, i) =>
            (item as any).arrow ? (
              <div key={i} className="text-xl" style={{ color: "#27272a" }}>→</div>
            ) : (
              <div key={i} className="rounded-xl px-4 py-3 text-center min-w-[100px]" style={{ background: "#18181b", border: "1px solid #27272a" }}>
                <div className="text-2xl mb-1">{(item as any).icon}</div>
                <div className="text-xs font-semibold" style={{ color: "#fafafa", fontFamily: "Figtree, sans-serif" }}>{(item as any).label}</div>
                <div className="text-xs mt-0.5" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>{(item as any).sub}</div>
              </div>
            )
          )}
        </div>
        {/* Loop back arrow */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", color: "#10b981", fontFamily: "Figtree, sans-serif" }}>
            ↺ dispositions feed prevention model · loop closes
          </div>
        </div>
      </div>

      {/* Flagged listings */}
      {stats.flagged_listings.length > 0 && (
        <div className="rounded-xl p-5 animate-fade-up delay-5" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <h2 className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: "#f59e0b" }}>⚠️ Listing-Feedback Flags</h2>
          <p className="text-xs mb-3" style={{ color: "#52525b", fontFamily: "Figtree, sans-serif" }}>
            Products with multiple "not as described" returns — listing needs updating.
          </p>
          {stats.flagged_listings.map((f) => (
            <div key={f.product_id} className="flex items-center justify-between rounded-lg p-3" style={{ background: "#18181b", border: "1px solid #27272a", marginBottom: "8px" }}>
              <span className="text-sm font-mono" style={{ color: "#a1a1aa" }}>{f.product_id}</span>
              <span className="text-sm font-bold" style={{ color: "#f59e0b", fontFamily: "Syne, sans-serif" }}>{f.flag_count} flags</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
