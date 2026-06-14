"use client";
import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Package, ShieldCheck, IndianRupee, Leaf, Recycle, Trash2,
  RefreshCw, Coins, Battery, TrendingUp, TrendingDown, AlertTriangle,
} from "lucide-react";
import { AZ, CHANNEL_COLOR } from "@/lib/ui-theme";

interface DashboardStats {
  total_processed: number;
  returns_prevented: number;
  disposition_split: Record<string, number>;
  value_recovered_inr: number;
  green_credits_awarded: number;
  co2_saved_kg: number;
  ewaste_diverted_kg: number;
  products_given_second_life: number;
  landfill_avoided_kg: number;
  refurb_success_rate: number;
  avg_circularity_score: number;
  top_categories: { category: string; items: number }[];
  monthly_trend: { month: string; prevented: number; processed: number; co2_saved: number }[];
  flagged_listings: { product_id: string; flag_count: number }[];
}

const CATEGORY_LABEL: Record<string, string> = {
  electronics: "Electronics", apparel: "Apparel", home_appliances: "Home Appliances",
  home: "Home & Living", accessories: "Accessories", beauty: "Beauty", sports: "Sports",
};

const FLYWHEEL = [
  { label: "Return Prevention", sub: "LightGBM risk score" },
  { label: "AI Vision Grading", sub: "Gemini 2.5 Flash" },
  { label: "Disposition Optimizer", sub: "EV × sustainability × trust" },
  { label: "Marketplace Matching", sub: "Buyer scoring" },
  { label: "Model Retrains", sub: "Flywheel closes" },
];

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-lg px-3 py-2 text-sm font-bold" style={{ background: AZ.card, border: `1px solid ${AZ.border}`, color: CHANNEL_COLOR[name] ?? AZ.ink, fontFamily: "Figtree, sans-serif" }}>
      {name}: {value}
    </div>
  );
};

const LineTooltip = ({ active, payload, label }: any) => {
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

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: AZ.card, border: `1px solid ${AZ.border}`, fontFamily: "Figtree, sans-serif" }}>
      <p className="text-sm font-bold" style={{ color: AZ.ink }}>{CATEGORY_LABEL[label] ?? label}: {payload[0].value}</p>
    </div>
  );
};

// Small delta pill ("↑ +3 vs last month")
function Delta({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const up = value > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const color = up ? AZ.green : AZ.red;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color, fontFamily: "Figtree, sans-serif" }}>
      <Icon size={12} />
      {up ? "+" : ""}{value}{suffix} vs last month
    </span>
  );
}

// Labeled progress meter (refurb success, circularity)
function Meter({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>{label}</span>
        <span className="text-sm font-black" style={{ color, fontFamily: "Syne, sans-serif" }}>{pct}%</span>
      </div>
      <div className="h-2.5 rounded-full" style={{ background: AZ.surfaceAlt }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ background: AZ.page, minHeight: "100%" }}>
        <div className="max-w-5xl mx-auto px-5 py-10 space-y-4">
          <div className="h-8 w-48 rounded-xl skeleton" />
          <div className="h-28 rounded-2xl skeleton" />
          <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl skeleton" />)}</div>
          <div className="grid md:grid-cols-2 gap-4">{[0, 1].map(i => <div key={i} className="h-64 rounded-xl skeleton" />)}</div>
        </div>
      </div>
    );
  }
  if (!stats) return null;

  const dispositionData = Object.entries(stats.disposition_split)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  // Month-over-month deltas from the trend series
  const trend = stats.monthly_trend;
  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2] ?? last;
  const dProcessed = last.processed - prev.processed;
  const dPrevented = last.prevented - prev.prevented;
  const dCo2 = Math.round(last.co2_saved - prev.co2_saved);
  const avgRecoveryPerItem = Math.round(stats.value_recovered_inr / stats.total_processed);

  const KPIS = [
    { key: "total_processed", label: "Items Processed", Icon: Package, value: `${stats.total_processed}`, delta: <Delta value={dProcessed} />, tint: AZ.blue },
    { key: "returns_prevented", label: "Returns Prevented", Icon: ShieldCheck, value: `${stats.returns_prevented}`, delta: <Delta value={dPrevented} />, tint: AZ.green },
    { key: "value_recovered", label: "Value Recovered", Icon: IndianRupee, value: `₹${stats.value_recovered_inr.toLocaleString("en-IN")}`, sub: `avg ₹${avgRecoveryPerItem.toLocaleString("en-IN")}/item`, tint: AZ.priceRed },
    { key: "co2_saved", label: "CO₂ Saved", Icon: Leaf, value: `${stats.co2_saved_kg} kg`, delta: <Delta value={dCo2} suffix=" kg" />, tint: AZ.green },
  ];

  const SUSTAINABILITY = [
    { label: "Products Reused", value: `${stats.products_given_second_life}`, Icon: Recycle },
    { label: "E-Waste Diverted", value: `${stats.ewaste_diverted_kg} kg`, Icon: Battery },
    { label: "Landfill Avoided", value: `${stats.landfill_avoided_kg} kg`, Icon: Trash2 },
    { label: "Green Credits Issued", value: stats.green_credits_awarded.toLocaleString("en-IN"), Icon: Coins },
  ];

  return (
    <div style={{ background: AZ.page, minHeight: "100%" }}>
      <div className="max-w-5xl mx-auto px-5 py-10 space-y-6">

        {/* Header */}
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full mb-3" style={{ background: AZ.greenBg, border: `1px solid ${AZ.green}33` }}>
            <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: AZ.green }} />
            <span className="text-xs font-semibold" style={{ color: AZ.green, fontFamily: "Figtree, sans-serif" }}>Live Pipeline</span>
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Ops Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
            AI returns pipeline — value recovered, waste diverted, flywheel spinning.
          </p>
        </div>

        {/* Hero impact banner */}
        <div className="rounded-2xl p-6 animate-fade-up relative overflow-hidden" style={{ background: `linear-gradient(120deg, ${AZ.header}, ${AZ.headerAlt})` }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 50% 80% at 90% 0%, ${AZ.green}33, transparent 70%)` }} />
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9FB3C8", fontFamily: "Figtree, sans-serif" }}>Total Impact to Date</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
            {[
              { big: `₹${(stats.value_recovered_inr / 1000).toFixed(0)}K`, small: "recovered from returns" },
              { big: `${stats.products_given_second_life}`, small: "products given a second life" },
              { big: `${stats.co2_saved_kg} kg`, small: "CO₂ emissions avoided" },
            ].map((s) => (
              <div key={s.small}>
                <div className="text-3xl font-black" style={{ fontFamily: "Syne, sans-serif", color: "#fff" }}>{s.big}</div>
                <div className="text-sm mt-0.5" style={{ color: "#C7D2DC", fontFamily: "Figtree, sans-serif" }}>{s.small}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 4 KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up delay-1">
          {KPIS.map(({ key, label, Icon, value, delta, sub, tint }) => (
            <div key={key} className="rounded-xl p-5 transition-all hover:-translate-y-0.5" style={{ background: AZ.card, border: `1px solid ${AZ.border}`, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${tint}14` }}>
                <Icon size={18} color={tint} />
              </div>
              <div className="text-2xl font-black" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>{value}</div>
              <div className="text-sm font-semibold mt-0.5" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>{label}</div>
              <div className="mt-1.5 min-h-[16px]">
                {delta ?? <span className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{sub}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Sustainability impact strip */}
        <div className="rounded-xl p-5 animate-fade-up delay-1" style={{ background: AZ.greenBg, border: `1px solid ${AZ.green}26` }}>
          <div className="flex items-center gap-2 mb-4">
            <Leaf size={16} color={AZ.green} />
            <h2 className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Sustainability Impact</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {SUSTAINABILITY.map(({ label, value, Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#fff", border: `1px solid ${AZ.green}33` }}>
                  <Icon size={18} color={AZ.green} />
                </div>
                <div>
                  <div className="text-lg font-black leading-tight" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>{value}</div>
                  <div className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-4 animate-fade-up delay-2">
          {/* Disposition donut with center total */}
          <div className="rounded-xl p-5" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
            <h2 className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Disposition Split</h2>
            <p className="text-xs mt-0.5 mb-4" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
              Multi-objective optimizer output across {stats.total_processed} items
            </p>
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={dispositionData} cx="50%" cy="50%" innerRadius={56} outerRadius={84} dataKey="value" paddingAngle={3}>
                    {dispositionData.map((entry) => (
                      <Cell key={entry.name} fill={CHANNEL_COLOR[entry.name] ?? AZ.border} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend formatter={(v) => <span style={{ color: AZ.ink2, fontSize: "12px", fontFamily: "Figtree, sans-serif" }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
              {/* center total — positioned over the donut hole (chart is 200px tall, legend below) */}
              <div className="absolute inset-x-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: 0, height: 200 }}>
                <span className="text-2xl font-black" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>{stats.total_processed}</span>
                <span className="text-xs" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>items</span>
              </div>
            </div>
          </div>

          {/* Monthly trend with CO2 */}
          <div className="rounded-xl p-5" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
            <h2 className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Monthly Trend</h2>
            <p className="text-xs mt-0.5 mb-4" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
              Processing, prevention & CO₂ saved over time
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <XAxis dataKey="month" tick={{ fill: AZ.ink2, fontSize: 11, fontFamily: "Figtree, sans-serif" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AZ.ink2, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<LineTooltip />} />
                <Legend formatter={(v) => <span style={{ color: AZ.ink2, fontSize: "12px", fontFamily: "Figtree, sans-serif" }}>{v}</span>} />
                <Line type="monotone" dataKey="processed" stroke={AZ.blue} strokeWidth={2} dot={{ fill: AZ.blue, r: 3 }} name="Processed" />
                <Line type="monotone" dataKey="prevented" stroke={AZ.green} strokeWidth={2} dot={{ fill: AZ.green, r: 3 }} name="Prevented" />
                <Line type="monotone" dataKey="co2_saved" stroke={AZ.amber} strokeWidth={2} strokeDasharray="4 2" dot={{ fill: AZ.amber, r: 3 }} name="CO₂ (kg)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown + quality meters */}
        <div className="grid md:grid-cols-2 gap-4 animate-fade-up delay-2">
          <div className="rounded-xl p-5" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
            <h2 className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Items by Category</h2>
            <p className="text-xs mt-0.5 mb-4" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Where returned inventory comes from</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.top_categories} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" tick={{ fill: AZ.ink2, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="category" type="category" width={120}
                  tick={{ fill: AZ.ink2, fontSize: 11, fontFamily: "Figtree, sans-serif" }}
                  tickFormatter={(c) => CATEGORY_LABEL[c] ?? c} axisLine={false} tickLine={false} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: AZ.surfaceAlt }} />
                <Bar dataKey="items" fill={AZ.green} radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl p-5 flex flex-col" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
            <h2 className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Pipeline Quality</h2>
            <p className="text-xs mt-0.5 mb-5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>Refurb yield & average circularity of recovered items</p>
            <div className="space-y-6 flex-1 flex flex-col justify-center">
              <Meter label="Refurbishment Success Rate" pct={Math.round(stats.refurb_success_rate * 100)} color={AZ.blue} />
              <Meter label="Average Circularity Score" pct={stats.avg_circularity_score} color={AZ.green} />
            </div>
          </div>
        </div>

        {/* Flagged listings — feedback loop */}
        {stats.flagged_listings.length > 0 && (
          <div className="rounded-xl p-5 animate-fade-up" style={{ background: AZ.amberBg, border: `1px solid ${AZ.amber}40` }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} color={AZ.amber} />
              <h2 className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Listings Needing Attention</h2>
            </div>
            <p className="text-xs mb-3" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
              Repeated &quot;not as described&quot; returns — the AI flags these listings for description updates.
            </p>
            <div className="space-y-2">
              {stats.flagged_listings.map((f) => (
                <div key={f.product_id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "#fff", border: `1px solid ${AZ.border}` }}>
                  <span className="text-sm font-mono" style={{ color: AZ.ink }}>{f.product_id}</span>
                  <span className="text-sm font-bold" style={{ color: AZ.amber, fontFamily: "Syne, sans-serif" }}>{f.flag_count} flags</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flywheel */}
        <div className="rounded-xl p-6 animate-fade-up delay-3" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
          <h2 className="font-bold mb-0.5" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>The ReLoop Flywheel</h2>
          <p className="text-xs mb-6" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
            Each disposition feeds the prevention model — better predictions, fewer returns, more data.
          </p>
          <div className="flex items-stretch gap-0">
            {FLYWHEEL.map((step, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex-1 rounded-xl px-3 py-4 text-center" style={{ background: AZ.surfaceAlt, border: `1px solid ${AZ.border}` }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black mx-auto mb-2"
                       style={{ background: AZ.green, color: "#fff", fontFamily: "Syne, sans-serif" }}>
                    {i + 1}
                  </div>
                  <div className="text-xs font-semibold leading-snug" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>{step.label}</div>
                  <div className="text-xs mt-1" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{step.sub}</div>
                </div>
                {i < FLYWHEEL.length - 1 && (
                  <div className="px-1 text-sm flex-shrink-0" style={{ color: AZ.ink2 }}>→</div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <span className="text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: AZ.greenBg, border: `1px solid ${AZ.green}26`, color: AZ.green, fontFamily: "Figtree, sans-serif" }}>
              <RefreshCw size={12} /> dispositions retrain prevention model · loop closes
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
