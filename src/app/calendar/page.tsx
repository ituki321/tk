"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui";

// react-big-calendar はブラウザ専用のため SSR を無効化して読み込む
const CalendarView = dynamic(() => import("@/components/CalendarView"), {
  ssr: false,
  loading: () => <Spinner />,
});

export default function CalendarPage() {
  return <CalendarView />;
}
