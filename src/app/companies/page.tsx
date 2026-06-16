"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Star,
  Trash2,
  ChevronRight,
  Building2,
  Search,
  Pencil,
  X,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/useAuth";
import type { Company, CompanyStatus, Step } from "@/lib/types";
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

// ステータス絞り込み用（"all" は全件）
const STATUS_FILTERS: { value: "all" | CompanyStatus; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "active", label: STATUS_LABELS.active },
  { value: "offer", label: STATUS_LABELS.offer },
  { value: "rejected", label: STATUS_LABELS.rejected },
  { value: "done", label: STATUS_LABELS.done },
];

export default function CompaniesPage() {
  const { userId, ready, configured } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  // 検索・フィルタ
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CompanyStatus>("all");

  // 追加 / 編集フォーム（editingId が null なら新規作成）
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [priority, setPriority] = useState(3);
  const [status, setStatus] = useState<CompanyStatus>("active");
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

  // 検索＋ステータスで絞り込み
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.industry ?? "").toLowerCase().includes(q)
      );
    });
  }, [companies, query, statusFilter]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setIndustry("");
    setPriority(3);
    setStatus("active");
    setTemplateId("shinsotsu");
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(c: Company) {
    setEditingId(c.id);
    setName(c.name);
    setIndustry(c.industry ?? "");
    setPriority(c.priority);
    setStatus(c.status);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    resetForm();
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !name.trim()) return;
    setSaving(true);
    const supabase = getSupabase();

    if (editingId) {
      // ---- 更新 ----
      await supabase
        .from("companies")
        .update({
          name: name.trim(),
          industry: industry.trim() || null,
          priority,
          status,
        })
        .eq("id", editingId);
    } else {
      // ---- 新規作成 ----
      const { data, error } = await supabase
        .from("companies")
        .insert({
          user_id: userId,
          name: name.trim(),
          industry: industry.trim() || null,
          priority,
        })
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
    }

    setSaving(false);
    closeModal();
    load();
  }

  async function remove(id: string) {
    if (!confirm("この企業と関連ステップを削除しますか？")) return;
    await getSupabase().from("companies").delete().eq("id", id);
    load();
  }

  if (!ready || (configured && loading)) return <Spinner />;

  const hasCompanies = companies.length > 0;

  return (
    <div>
      <PageHeader
        title="企業一覧"
        subtitle={`${companies.length} 社を管理中`}
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> 企業を追加
          </Button>
        }
      />

      {!configured && <ConfigBanner />}

      {/* 検索 ＆ フィルタ ツールバー（企業0件・シークレットモード等でも常に表示） */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${inputClass} pl-9 pr-9`}
            placeholder="企業名・業界で検索"
            aria-label="企業を検索"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="検索をクリア"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                statusFilter === f.value
                  ? "brand-gradient text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!hasCompanies ? (
        <EmptyState
          title="まだ企業が登録されていません"
          hint="「企業を追加」から選考フローのテンプレを選んで始めましょう"
          action={
            <Button onClick={openCreate}>
              <Plus size={16} /> 企業を追加
            </Button>
          }
        />
      ) : (
        <>
          {filtered.length === 0 ? (
            <EmptyState
              title="該当する企業が見つかりません"
              hint="検索キーワードやフィルタを変更してみてください"
            />
          ) : (
            <>
              <p className="mb-3 text-xs text-slate-400">{filtered.length} 件を表示中</p>
              <div className="grid gap-4 md:grid-cols-2">
                {filtered.map((c) => (
                  <Card key={c.id} className="flex flex-col transition hover:scale-[1.01]">
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
                      <div className="flex shrink-0 items-center">
                        <button
                          onClick={() => openEdit(c)}
                          aria-label="編集"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-sky dark:hover:bg-slate-700"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => remove(c.id)}
                          aria-label="削除"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[c.status]}`}
                      >
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
            </>
          )}
        </>
      )}

      <Modal open={open} onClose={closeModal} title={editingId ? "企業を編集" : "企業を追加"}>
        <form onSubmit={submitForm} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
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
            {editingId && (
              <Field label="ステータス">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CompanyStatus)}
                  className={inputClass}
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          {!editingId && (
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
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              キャンセル
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "保存中…" : editingId ? "更新" : "作成"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
