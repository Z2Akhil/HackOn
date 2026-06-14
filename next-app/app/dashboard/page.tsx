"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Package, ShieldCheck, IndianRupee, Leaf, Recycle,
  BatteryCharging, Trash2, RefreshCw, Sprout,
  Camera, Calculator, ShoppingCart, TrendingUp,
} from "lucide-react";
import { AZ, CHANNEL_COLOR } from "@/lib/ui-theme";

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

const KPIS = [
  { key: "total_processed",           label: "Items Processed",   Icon: Package,         format: "num"                 },
  { key: "returns_prevented",         label: "Returns Prevented", Icon: ShieldCheck,     format: "num"                 },
  { key: "value_recovered_inr",       label: "Value Recovered",   Icon: IndianRupee,     format: "currency"            },
  { key: "co2_saved_kg",              label: "CO₂ Saved",         Icon: Leaf,            format: "num", suffix: "kg"   },
  { key: "products_given_second_life",label: "Products Reused",   Icon: Recycle,         format: "num"                 },
  { key: "ewaste_diverted_kg",        label: "E-Waste Diverted",  Icon: BatteryCharging, format: "num", suffix: "kg"   },
  { key: "landfill_avoided_kg",       label: "Landfill Avoided",  Icon: Trash2,          format: "num", suffix: "kg"   },
  { key: "avg_circularity_score",     label: "Avg Circularity",   Icon: RefreshCw,       format: "num", suffix: "/100" },
  { key: "green_credits_awarded",     label: "Green Credits",     Icon: Sprout,          format: "num"                 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: AZ.card, border: `1px solid ${AZ.border}`, fontFamily: "Figtree, sans-serif" }}>
      <p className="text-xs font-semibold mb-1" style={{ color: AZ.ink2 }}>{label}</p>
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
    <div className="rounded-lg px-3 py-2" style={{ background: AZ.card, border: `1px solid ${AZ.border}`, fontFamily: "Figtree, sans-serif" }}>
      <p className="text-sm font-bold" style={{ color: CHANNEL_COLOR[name] ?? AZ.ink }}>{name}: {value}</p>
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
      <div style={{ background: AZ.page, minHeight: "100%" }}>
        <div className="max-w-6xl mx-auto px-5 py-10 space-y-4">
          <div className="h-8 w-48 rounded-xl skeleton" />
          <div className="grid grid-cols-5 gap-3">{[...Array(5)].map((_,i)=><div key={i} className="h-24 rounded-xl skeleton"/>)}</div>
          <div className="grid md:grid-cols-2 gap-4">{[0,1].map(i=><div key={i} className="h-64 rounded-xl skeleton"/>)}</div>
        </div>
      </div>
    );
  }
  if (!stats) return null;

  const dispositionData = Object.entries(stats.disposition_split).map(([name, value]) => ({ name, value }));

  return (
    <div style={{ background: AZ.page, minHeight: "100%" }}>
      <div className="max-w-6xl mx-auto px-5 py-10 space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full mb-3" style={{ background: AZ.greenBg, border: `1px solid ${AZ.green}33` }}>
                <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: AZ.green }} />
                <span className="text-xs font-semibold" style={{ color: AZ.green, fontFamily: "Figtree, sans-serif" }}>Live Pipeline</span>
              </div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Ops Dashboard</h1>
              <p className="text-sm mt-1" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
                Real-time view of the ReLoop pipeline — value recovered, waste diverted, flywheel spinning.
              </p>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 animate-fade-up delay-1">
          {KPIS.map(({ key, label, Icon, format, suffix }) => {
            const raw = (stats as any)[key];
            const display = format === "currency"
              ? `₹${Number(raw).toLocaleString("en-IN")}`
              : `${raw}${suffix ?? ""}`;
            return (
              <div key={key} className="rounded-xl p-4 min-w-0" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
                <div className="w-9 h-9 rounded-md flex items-center justify-center mb-2" style={{ background: AZ.greenBg }}>
                  <Icon size={18} color={AZ.green} />
                </div>
                <div className="text-xl font-black truncate" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>{display}</div>
                <div className="text-xs mt-1" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{label}</div>
              </div>
            );
          })}
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-4 animate-fade-up delay-2">
          {/* Disposition pie */}
          <div className="rounded-xl p-5" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
            <h2 className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Disposition Split</h2>
            <p className="text-xs mb-4" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>multi-objective score (EV + sustainability + trust) across {stats.total_processed} items</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dispositionData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                  {dispositionData.map((entry) => (
                    <Cell key={entry.name} fill={CHANNEL_COLOR[entry.name] ?? AZ.border} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend formatter={(v) => <span style={{ color: AZ.ink2, fontSize: "12px", fontFamily: "Figtree, sans-serif" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly trend */}
          <div className="rounded-xl p-5" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
            <h2 className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Prevention · Processing · CO₂ Saved</h2>
            <p className="text-xs mb-4" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>flywheel: prevention model improves as pipeline grows</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.monthly_trend}>
                <XAxis dataKey="month" tick={{ fill: AZ.ink2, fontSize: 11, fontFamily: "Figtree, sans-serif" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AZ.ink2, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span style={{ color: AZ.ink2, fontSize: "12px", fontFamily: "Figtree, sans-serif" }}>{v}</span>} />
                <Line type="monotone" dataKey="processed" stroke={AZ.blue} strokeWidth={2} dot={{ fill: AZ.blue, r: 3 }} name="Processed" />
                <Line type="monotone" dataKey="prevented" stroke={AZ.green} strokeWidth={2} dot={{ fill: AZ.green, r: 3 }} name="Prevented" />
                <Line type="monotone" dataKey="co2_saved" stroke="#1B8E3D" strokeWidth={2} dot={{ fill: "#1B8E3D", r: 3 }} name="CO₂ Saved (kg)" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category bar */}
        <div className="rounded-xl p-5 animate-fade-up delay-3" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
          <h2 className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Items by Category</h2>
          <p className="text-xs mb-4" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>distribution across categories in pipeline</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.top_categories} layout="vertical" margin={{ left: 0 }}>
              <XAxis type="number" tick={{ fill: AZ.ink2, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="category" type="category" tick={{ fill: AZ.ink2, fontSize: 11, fontFamily: "Figtree, sans-serif" }} width={110} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="items" fill={AZ.green} radius={[0, 6, 6, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Flywheel */}
        <div className="rounded-xl p-6 animate-fade-up delay-4" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
          <h2 className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>The ReLoop Flywheel</h2>
          <p className="text-xs mb-6" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
            Prevention model trains on disposition outcomes — better predictions → fewer returns → more data → better model
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { Icon: ShieldCheck, label: "Return Prevention", sub: "LightGBM GBM" },
              { arrow: true },
              { Icon: Camera, label: "AI Grading", sub: "Gemini 2.5 Flash" },
              { arrow: true },
              { Icon: Calculator, label: "Multi-Obj Optimizer", sub: "EV+sustainability+trust" },
              { arrow: true },
              { Icon: ShoppingCart, label: "Marketplace", sub: "Buyer matching" },
              { arrow: true },
              { Icon: TrendingUp, label: "Model Improves", sub: "Flywheel closes" },
            ].map((item, i) =>
              (item as any).arrow ? (
                <div key={i} className="text-xl" style={{ color: AZ.ink2 }}>→</div>
              ) : (
                <div key={i} className="rounded-xl px-4 py-3 text-center min-w-[100px]" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}>
                  <div className="flex justify-center mb-1">
                    {(() => { const FwIcon = (item as any).Icon; return <FwIcon size={22} color={AZ.green} />; })()}
                  </div>
                  <div className="text-xs font-semibold" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>{(item as any).label}</div>
                  <div className="text-xs mt-0.5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{(item as any).sub}</div>
                </div>
              )
            )}
          </div>
          {/* Loop back arrow */}
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg" style={{ background: AZ.greenBg, border: `1px solid ${AZ.green}26`, color: AZ.green, fontFamily: "Figtree, sans-serif" }}>
              ↺ dispositions feed prevention model · loop closes
            </div>
          </div>
        </div>

        {/* Flagged listings */}
        {stats.flagged_listings.length > 0 && (
          <div className="rounded-xl p-5 animate-fade-up delay-5" style={{ background: AZ.amberBg, border: `1px solid ${AZ.border}` }}>
            <h2 className="font-bold mb-1" style={{ fontFamily: "Syne, sans-serif", color: AZ.amber }}>⚠️ Listing-Feedback Flags</h2>
            <p className="text-xs mb-3" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
              Products with multiple &quot;not as described&quot; returns — listing needs updating.
            </p>
            {stats.flagged_listings.map((f) => (
              <div key={f.product_id} className="flex items-center justify-between rounded-lg p-3" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}`, marginBottom: "8px" }}>
                <span className="text-sm font-mono" style={{ color: AZ.ink2 }}>{f.product_id}</span>
                <span className="text-sm font-bold" style={{ color: AZ.amber, fontFamily: "Syne, sans-serif" }}>{f.flag_count} flags</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
