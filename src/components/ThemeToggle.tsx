"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // マウント時に現在のテーマ（外部状態：DOM/localStorage 由来）を一度だけ同期する
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("katsudou-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="テーマ切替"
      className="rounded-xl p-2 text-white/90 transition hover:scale-110 hover:bg-white/15"
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
