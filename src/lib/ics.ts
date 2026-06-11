export interface ICSEvent {
  title: string;
  start: Date;
  end: Date;
  desc?: string;
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function buildICS(events: ICSEvent[]): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const body = events
    .map(
      (e) =>
        `BEGIN:VEVENT
UID:${uid()}
DTSTAMP:${fmt(new Date())}
DTSTART:${fmt(e.start)}
DTEND:${fmt(e.end)}
SUMMARY:${escapeICS(e.title)}
DESCRIPTION:${escapeICS(e.desc ?? "")}
END:VEVENT`
    )
    .join("\n");
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//KatsudouLog//JP\n${body}\nEND:VCALENDAR`;
}

export function downloadICS(events: ICSEvent[], filename = "katsudoulog.ics") {
  const ics = buildICS(events);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
