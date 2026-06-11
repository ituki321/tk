"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface AuthState {
  userId: string | null;
  ready: boolean;
  configured: boolean;
}

/**
 * 認証状態を取得。未ログインなら /login へリダイレクト。
 * Supabase 未設定（プレースホルダ）の場合は configured=false を返す。
 */
export function useAuth(redirect = true): AuthState {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [userId, setUserId] = useState<string | null>(null);
  // 未設定なら認証待ちが不要なので最初から ready=true
  const [ready, setReady] = useState(!configured);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const id = data.user?.id ?? null;
      setUserId(id);
      setReady(true);
      if (!id && redirect) router.replace("/login");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [configured, redirect, router]);

  return { userId, ready, configured };
}
