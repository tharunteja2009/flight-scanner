"use client";

import { formatMoney } from "@/lib/scoring";
import type { Currency } from "@/lib/types";

export interface DayPrice {
  date: string;
  price?: number;
  loading: boolean;
}

export default function DateStrip({
  days,
  selected,
  currency,
  onPick,
}: {
  days: DayPrice[];
  selected: string;
  currency: Currency;
  onPick: (date: string) => void;
}) {
  const prices = days.map((d) => d.price).filter((p): p is number => p !== undefined);
  const min = Math.min(...prices);
  return (
    <div>
    <p className="mb-1 text-xs text-slate-500">Lowest base fare per departure date (same trip length) — click a day to load it.</p>
    <div style={{ gridTemplateColumns: `repeat(${days.length}, minmax(5rem, 1fr))` }} className="grid gap-1 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
      {days.map((d) => {
        const dt = new Date(`${d.date}T00:00:00`);
        const isSel = d.date === selected;
        const isMin = d.price !== undefined && d.price === min;
        return (
          <button
            key={d.date}
            onClick={() => onPick(d.date)}
            className={`rounded-lg px-2 py-2 text-center text-xs transition ${
              isSel ? "bg-sky-600 text-white" : isMin ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300" : "hover:bg-slate-100"
            }`}
          >
            <div className="font-medium">{dt.toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short" })}</div>
            <div className="mt-0.5 font-semibold">
              {d.loading ? "…" : d.price !== undefined ? formatMoney(d.price, currency) : "—"}
            </div>
          </button>
        );
      })}
    </div>
    </div>
  );
}
