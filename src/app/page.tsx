"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Trophy,
  Percent,
  CalendarClock,
  AlarmClock,
  ListChecks,
  ChevronRight,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/useAuth";
import type { Company, Step } from "@/lib/types";
import {
  countdownLabel,
  daysUntil,
  deadlineTone,
  TONE_CLASSES,
} from "@/lib/dates";
import { Card, EmptyState, PageHeader, Spinner } from "@/components/ui";
import ConfigBanner from "@/components/ConfigBanner";
import FlowProgress from "@/components/FlowProgress";
import { isSameWeek } from "date-fns";

interface DeadlineItem {
  key: string;
  label: string;
  companyId: string;
  days: number;
}

export default function DashboardPage() {
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

  const stepsByCompany = useMemo(() => {
    const map: Record<string, Step[]> = {};
    for (const s of steps) (map[s.company_id] ??= []).push(s);
    return map;
  }, [steps]);

  const activeCount = companies.filter((c) => c.status === "active").length;
  const offerCount = companies.filter((c) => c.status === "offer").length;

  const passRate = useMemo(() => {
    const done = steps.filter((s) => s.status === "done").length;
    const failed = steps.filter((s) => s.status === "failed").length;
    const total = done + failed;
    return total === 0 ? null : Math.round((done / total) * 100);
  }, [steps]);

  const thisWeekCount = useMemo(
    () =>
      steps.filter(
        (s) => s.date && isSameWeek(new Date(s.date), new Date(), { weekStartsOn: 1 })
      ).length,
    [steps]
  );

  const deadlines = useMemo<DeadlineItem[]>(() => {
    const items: DeadlineItem[] = [];
    for (const s of steps) {
      if (s.deadline && s.status !== "done" && s.status !== "failed") {
        const d = daysUntil(s.deadline);
        if (d !== null && d >= 0) {
          const c = companies.find((x) => x.id === s.company_id);
          items.push({
            key: `s-${s.id}`,
            label: `${c?.name ?? "企業"}：${s.name} 締切`,
            companyId: s.company_id,
            days: d,
          });
        }
      }
    }
    for (const c of companies) {
      if (c.webtest_deadline && !c.webtest_done) {
        const d = daysUntil(c.webtest_deadline);
        if (d !== null && d >= 0) {
          items.push({
            key: `wt-${c.id}`,
            label: `${c.name}：Webテスト締切`,
            companyId: c.id,
            days: d,
          });
        }
      }
    }
    return items.sort((a, b) => a.days - b.days);
  }, [steps, companies]);

  const todos = useMemo(() => {
    const list: { key: string; label: string; companyId: string }[] = [];
    for (const s of steps) {
      if (s.status === "current") {
        const c = companies.find((x) => x.id === s.company_id);
        list.push({ key: `cur-${s.id}`, label: `${c?.name ?? "企業"}：${s.name}（進行中）`, companyId: s.company_id });
      }
      const d = daysUntil(s.deadline);
      if (d !== null && d >= 0 && d <= 2 && s.status !== "done" && s.status !== "failed") {
        const c = companies.find((x) => x.id === s.company_id);
        list.push({ key: `due-${s.id}`, label: `${c?.name ?? "企業"}：${s.name} が${countdownLabel(d)}`, companyId: s.company_id });
      }
    }
    return list.slice(0, 8);
  }, [steps, companies]);

  if (!ready || (configured && loading)) return <Spinner />;

  const summary = [
    { label: "選考中", value: activeCount, icon: Briefcase, color: "from-sky-500 to-blue-600" },
    { label: "内定", value: offerCount, icon: Trophy, color: "from-emerald-500 to-teal-600" },
    {
      label: "通過率",
      value: passRate === null ? "—" : `${passRate}%`,
      icon: Percent,
      color: "from-violet-500 to-purple-600",
    },
    { label: "今週の予定", value: thisWeekCount, icon: CalendarClock, color: "from-amber-500 to-orange-600" },
  ];

  return (
    <div>
      <PageHeader title="ダッシュボード" subtitle="就活の全体像をひと目で。" />

      {!configured && <ConfigBanner />}

      {/* サマリーカード */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="relative overflow-hidden">
            <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${color} opacity-20`} />
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white`}>
                <Icon size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {companies.length === 0 ? (
        <EmptyState
          title="まだデータがありません"
          hint="まずは企業を登録して選考フローを作りましょう"
          action={
            <Link href="/companies" className="text-sm font-medium text-brand-sky hover:underline">
              企業一覧へ →
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 締切カウントダウン */}
          <Card className="lg:col-span-1">
            <div className="mb-3 flex items-center gap-2 font-bold">
              <AlarmClock size={18} className="text-red-500" /> 締切カウントダウン
            </div>
            {deadlines.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">直近の締切はありません</p>
            ) : (
              <ul className="space-y-2">
                {deadlines.slice(0, 8).map((d) => (
                  <li key={d.key}>
                    <Link
                      href={`/companies/${d.companyId}`}
                      className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    >
                      <span className="min-w-0 truncate text-sm">{d.label}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TONE_CLASSES[deadlineTone(d.days)]}`}>
                        {countdownLabel(d.days)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 今日やること */}
          <Card className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-2 font-bold">
              <ListChecks size={18} className="text-brand-sky" /> 今日やること
            </div>
            {todos.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">差し迫ったタスクはありません 🎉</p>
            ) : (
              <ul className="space-y-2">
                {todos.map((t) => (
                  <li key={t.key}>
                    <Link
                      href={`/companies/${t.companyId}`}
                      className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-brand-sky" />
                      <span className="min-w-0 truncate text-sm">{t.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 各企業のフロー進捗 */}
          <Card className="lg:col-span-3">
            <div className="mb-4 font-bold">各社の選考フロー</div>
            <div className="space-y-5">
              {companies.map((c) => (
                <div key={c.id}>
                  <Link
                    href={`/companies/${c.id}`}
                    className="mb-2 flex items-center justify-between text-sm font-medium hover:text-brand-sky"
                  >
                    <span className="truncate">{c.name}</span>
                    <ChevronRight size={15} className="shrink-0" />
                  </Link>
                  <FlowProgress steps={stepsByCompany[c.id] ?? []} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
