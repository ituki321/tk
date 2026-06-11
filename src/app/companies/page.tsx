"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Star, Trash2, ChevronRight, Building2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/useAuth";
import type { Company, Step } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import { FLOW_TEMPLATES } from "@/lib/flowTemplates";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Spinner,
  inputClass,
} from "@/components/ui";
import ConfigBanner from "@/components/ConfigBanner";
import FlowProgress from "@/components/FlowProgress";

const statusBadge: Record<string, string> = {
  active: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  offer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  done: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export default function CompaniesPage() {
  const { userId, ready, configured } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // 新規企業フォーム
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [priority, setPriority] = useState(3);
  const [templateId, setTemplateId] = useState("shinsotsu");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!configured) return;
    const supabase = getSupabase();
    const [c, s] = await Promise.all([
      supabase.from("companies").select("*").order("created_at", { ascending: false }),
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

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !name.trim()) return;
    setSaving(true);
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("companies")
      .insert({ user_id: userId, name: name.trim(), industry: industry.trim() || null, priority })
      .select()
      .single();
    if (!error && data) {
      const tpl = FLOW_TEMPLATES.find((t) => t.id === templateId);
      if (tpl && tpl.steps.length > 0) {
        const rows = tpl.steps.map((sname, i) => ({
          company_id: data.id,
          user_id: userId,
          name: sname,
          order_index: i,
          status: i === 0 ? "current" : "pending",
        }));
        await supabase.from("steps").insert(rows);
      }
    }
    setSaving(false);
    setOpen(false);
    setName("");
    setIndustry("");
    setPriority(3);
    setTemplateId("shinsotsu");
    load();
  }

  async function remove(id: string) {
    if (!confirm("この企業と関連ステップを削除しますか？")) return;
    await getSupabase().from("companies").delete().eq("id", id);
    load();
  }

  if (!ready || (configured && loading)) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="企業一覧"
        subtitle={`${companies.length} 社を管理中`}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> 企業を追加
          </Button>
        }
      />

      {!configured && <ConfigBanner />}

      {companies.length === 0 ? (
        <EmptyState
          title="まだ企業が登録されていません"
          hint="「企業を追加」から選考フローのテンプレを選んで始めましょう"
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> 企業を追加
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((c) => (
            <Card key={c.id} className="transition hover:scale-[1.01]">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/companies/${c.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl brand-gradient text-white">
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold">{c.name}</div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {c.industry || "業界未設定"}
                      </div>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => remove(c.id)}
                  aria-label="削除"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[c.status]}`}>
                  {STATUS_LABELS[c.status]}
                </span>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < c.priority
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300 dark:text-slate-600"
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <FlowProgress steps={stepsByCompany[c.id] ?? []} />
              </div>

              <Link
                href={`/companies/${c.id}`}
                className="mt-4 flex items-center justify-end gap-1 text-xs font-medium text-brand-sky hover:underline"
              >
                詳細・フロー編集 <ChevronRight size={14} />
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="企業を追加">
        <form onSubmit={createCompany} className="space-y-4">
          <Field label="企業名 *">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="株式会社サンプル"
            />
          </Field>
          <Field label="業界">
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className={inputClass}
              placeholder="IT / メーカー / 金融 など"
            />
          </Field>
          <Field label="志望度">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setPriority(i + 1)}
                  className="p-1"
                  aria-label={`志望度${i + 1}`}
                >
                  <Star
                    size={24}
                    className={
                      i < priority
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300 dark:text-slate-600"
                    }
                  />
                </button>
              ))}
            </div>
          </Field>
          <Field label="選考フローのテンプレート">
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className={inputClass}
            >
              {FLOW_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                  {t.steps.length > 0 ? `（${t.steps.join(" → ")}）` : ""}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "作成中…" : "作成"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
