"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/useAuth";
import type { Company, Step } from "@/lib/types";
import { Card, EmptyState, PageHeader, Spinner } from "@/components/ui";
import ConfigBanner from "@/components/ConfigBanner";
import { format } from "date-fns";

const PIE_COLORS = ["#1a2980", "#26d0ce", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#0ea5e9", "#ec4899"];

export default function StatsPage() {
  const { ready, configured } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!configured) return;
    const supabase = getSupabase();
    const [c, s] = await Promise.all([
      supabase.from("companies").select("*"),
      supabase.from("steps").select("*"),
    ]);
    setCompanies((c.data as Company[]) ?? []);
    setSteps((s.data as Step[]) ?? []);
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    // データ取得（外部システム＝Supabase との同期）。fetch 後の setState は本ルールの対象外運用とする。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready) load();
  }, [ready, load]);

  // 通過率（企業別）
  const passData = useMemo(
    () =>
      companies
        .map((c) => {
          const cs = steps.filter((s) => s.company_id === c.id);
          const done = cs.filter((s) => s.status === "done").length;
          const failed = cs.filter((s) => s.status === "failed").length;
          const total = done + failed;
          return {
            name: c.name.length > 6 ? c.name.slice(0, 6) + "…" : c.name,
            通過率: total === 0 ? 0 : Math.round((done / total) * 100),
          };
        })
        .filter((d) => d.通過率 > 0 || true),
    [companies, steps]
  );

  // 業界別
  const industryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of companies) {
      const key = c.industry?.trim() || "未設定";
      map[key] = (map[key] ?? 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [companies]);

  // 月別応募
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of companies) {
      const key = format(new Date(c.created_at), "yyyy/MM");
      map[key] = (map[key] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, 応募数: count }));
  }, [companies]);

  // ステージ別ファネル（ステータス分布）
  const funnelData = useMemo(() => {
    const total = steps.length;
    const reached = steps.filter((s) => s.status !== "pending").length;
    const current = steps.filter((s) => s.status === "current" || s.status === "done").length;
    const done = steps.filter((s) => s.status === "done").length;
    return [
      { name: "全ステップ", value: Math.max(total, 1), fill: "#1a2980" },
      { name: "着手済", value: reached, fill: "#26d0ce" },
      { name: "進行/通過", value: current, fill: "#f59e0b" },
      { name: "通過", value: done, fill: "#10b981" },
    ];
  }, [steps]);

  if (!ready || (configured && loading)) return <Spinner />;

  const hasData = companies.length > 0;

  return (
    <div>
      <PageHeader title="統計" subtitle="選考の進み具合をデータで振り返る。" />

      {!configured && <ConfigBanner />}

      {!hasData ? (
        <EmptyState title="統計を表示するデータがありません" hint="企業と選考ステップを登録すると、ここにグラフが表示されます" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-bold">通過率（企業別）</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={passData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="通過率" fill="#26d0ce" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold">業界別の割合</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={industryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(props) => `${props.name}`}
                >
                  {industryData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold">月別の応募数</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="応募数" stroke="#1a2980" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold">ステージ別ファネル</h2>
            <ResponsiveContainer width="100%" height={260}>
              <FunnelChart>
                <Tooltip />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" />
                  <LabelList position="left" fill="#64748b" stroke="none" dataKey="value" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}
