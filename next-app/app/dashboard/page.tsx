"use client";
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Package, ShieldCheck, IndianRupee, Leaf } from "lucide-react";
import { AZ, CHANNEL_COLOR } from "@/lib/ui-theme";

interface DashboardStats {
  total_processed: number;
  returns_prevented: number;
  disposition_split: Record<string, number>;
  value_recovered_inr: number;
  co2_saved_kg: number;
  monthly_trend: { month: string; prevented: number; processed: number; co2_saved: number }[];
  flagged_listings: { product_id: string; flag_count: number }[];
}

const KPIS = [
  { key: "total_processed",     label: "Items Processed",   sublabel: "through AI pipeline", Icon: Package,     format: "num"      },
  { key: "returns_prevented",   label: "Returns Prevented", sublabel: "by GBM risk model",   Icon: ShieldCheck, format: "num"      },
  { key: "value_recovered_inr", label: "Value Recovered",   sublabel: "via resell & refurb", Icon: IndianRupee, format: "currency" },
  { key: "co2_saved_kg",        label: "CO₂ Saved",         sublabel: "vs. landfill route",  Icon: Leaf,        format: "num", suffix: " kg" },
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

const FLYWHEEL = [
  { label: "Return Prevention", sub: "LightGBM risk score" },
  { label: "AI Vision Grading", sub: "Gemini 2.5 Flash" },
  { label: "Disposition Optimizer", sub: "EV × sustainability × trust" },
  { label: "Marketplace Matching", sub: "Buyer scoring" },
  { label: "Model Retrains", sub: "Flywheel closes" },
];

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
          <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_,i) => <div key={i} className="h-28 rounded-xl skeleton" />)}</div>
          <div className="grid md:grid-cols-2 gap-4">{[0,1].map(i => <div key={i} className="h-64 rounded-xl skeleton" />)}</div>
        </div>
      </div>
    );
  }
  if (!stats) return null;

  const dispositionData = Object.entries(stats.disposition_split).map(([name, value]) => ({ name, value }));

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

        {/* 4 KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up delay-1">
          {KPIS.map(({ key, label, sublabel, Icon, format, suffix }) => {
            const raw = (stats as any)[key];
            const display = format === "currency"
              ? `₹${Number(raw).toLocaleString("en-IN")}`
              : `${raw}${suffix ?? ""}`;
            return (
              <div key={key} className="rounded-xl p-5" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: AZ.greenBg }}>
                    <Icon size={16} color={AZ.green} />
                  </div>
                </div>
                <div className="text-2xl font-black" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>{display}</div>
                <div className="text-sm font-semibold mt-0.5" style={{ color: AZ.ink, fontFamily: "Figtree, sans-serif" }}>{label}</div>
                <div className="text-xs mt-0.5" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>{sublabel}</div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4 animate-fade-up delay-2">
          {/* Disposition donut */}
          <div className="rounded-xl p-5" style={{ background: AZ.card, border: `1px solid ${AZ.border}` }}>
            <h2 className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Disposition Split</h2>
            <p className="text-xs mt-0.5 mb-4" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
              Multi-objective optimizer output across {stats.total_processed} items
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={dispositionData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} dataKey="value" paddingAngle={3}>
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
            <h2 className="font-bold" style={{ fontFamily: "Syne, sans-serif", color: AZ.ink }}>Monthly Trend</h2>
            <p className="text-xs mt-0.5 mb-4" style={{ color: AZ.ink2, fontFamily: "Figtree, sans-serif" }}>
              Prevention and processing volume over time
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.monthly_trend}>
                <XAxis dataKey="month" tick={{ fill: AZ.ink2, fontSize: 11, fontFamily: "Figtree, sans-serif" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AZ.ink2, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<LineTooltip />} />
                <Legend formatter={(v) => <span style={{ color: AZ.ink2, fontSize: "12px", fontFamily: "Figtree, sans-serif" }}>{v}</span>} />
                <Line type="monotone" dataKey="processed" stroke={AZ.blue} strokeWidth={2} dot={{ fill: AZ.blue, r: 3 }} name="Processed" />
                <Line type="monotone" dataKey="prevented" stroke={AZ.green} strokeWidth={2} dot={{ fill: AZ.green, r: 3 }} name="Prevented" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

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
            <span className="text-xs px-3 py-1.5 rounded-lg" style={{ background: AZ.greenBg, border: `1px solid ${AZ.green}26`, color: AZ.green, fontFamily: "Figtree, sans-serif" }}>
              ↺ dispositions retrain prevention model · loop closes
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
