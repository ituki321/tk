"use client";

import { AlertTriangle } from "lucide-react";

export default function ConfigBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-200">
      <AlertTriangle size={20} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">Supabase が未設定です</p>
        <p className="mt-1 text-amber-700 dark:text-amber-300/90">
          <code>.env.local</code> に <code>NEXT_PUBLIC_SUPABASE_URL</code> と{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> を設定すると、データの保存・同期が有効になります。
          設定するまでログインやデータ保存はできません。
        </p>
      </div>
    </div>
  );
}
