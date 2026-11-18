"use client";

import { useEffect, useState } from "react";
import { AIRPORTS, airportLabel } from "@/lib/airports";
import type { SearchParams } from "@/lib/types";

export interface FormState extends SearchParams {
  needBag: boolean;
  flexDays: number; // 0..3
}

const RECENT_KEY = "fs_recent_searches";

function isoPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const DEFAULT_FORM: FormState = {
  from: "SIN",
  to: "MAA",
  tripType: "return",
  outboundDate: isoPlus(21),
  returnDate: isoPlus(28),
  adults: 1,
  cabin: "economy",
  maxStops: "any",
  currency: "SGD",
  needBag: true,
  flexDays: 0,
};

export function loadRecent(): FormState[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveRecent(f: FormState) {
  const key = (x: FormState) => `${x.from}-${x.to}-${x.tripType}-${x.outboundDate}-${x.returnDate}`;
  const list = [f, ...loadRecent().filter((x) => key(x) !== key(f))].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

function AirportInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input font-mono uppercase"
        list="airports"
        value={value}
        placeholder="SIN"
        onChange={(e) => {
          // datalist picks fill in "CODE — City"; keep only the code(s)
          const v = e.target.value.toUpperCase();
          const m = v.match(/^([A-Z]{3}) — /);
          onChange(m ? m[1] : v.replace(/[^A-Z,]/g, ""));
        }}
      />
      <p className="mt-1 truncate text-xs text-slate-500">
        {value
          .split(",")
          .filter((c) => c.length === 3)
          .map(airportLabel)
          .join(" or ") || "Type a code or city"}
      </p>
    </div>
  );
}

export default function SearchForm({ loading, onSearch }: { loading: boolean; onSearch: (f: FormState) => void }) {
  const [f, setF] = useState<FormState>(DEFAULT_FORM);
  const [recent, setRecent] = useState<FormState[]>([]);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => setRecent(loadRecent()), []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    saveRecent(f);
    setRecent(loadRecent());
    onSearch(f);
  };

  const favourites = AIRPORTS.filter((a) => a.favourite);

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <datalist id="airports">
        {AIRPORTS.map((a) => (
          <option key={a.code} value={`${a.code} — ${a.city}, ${a.name}`} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center gap-2">
        {(["return", "oneway"] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => set("tripType", t)}
            className={`chip px-3 py-1 text-sm ${f.tripType === t ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {t === "return" ? "Return" : "One-way"}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 text-xs text-slate-500">
          Quick:
          {favourites.map((a) => (
            <button
              type="button"
              key={a.code}
              title={`${a.city} — click for From, shift-click for To`}
              onClick={(e) => (e.shiftKey ? set("to", a.code) : set("from", a.code))}
              className="chip bg-slate-100 font-mono text-slate-600 hover:bg-sky-100"
            >
              {a.code}
            </button>
          ))}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr_1fr_1fr]">
        <AirportInput label="From" value={f.from} onChange={(v) => set("from", v)} />
        <button
          type="button"
          aria-label="Swap"
          onClick={() => setF((s) => ({ ...s, from: s.to, to: s.from }))}
          className="btn-ghost h-9 self-start md:mt-5"
        >
          ⇄
        </button>
        <AirportInput label="To" value={f.to} onChange={(v) => set("to", v)} />
        <div>
          <label className="label">Depart</label>
          <input type="date" className="input" value={f.outboundDate} onChange={(e) => set("outboundDate", e.target.value)} />
        </div>
        <div>
          <label className="label">Return</label>
          <input
            type="date"
            className="input"
            disabled={f.tripType === "oneway"}
            value={f.tripType === "oneway" ? "" : f.returnDate ?? ""}
            min={f.outboundDate}
            onChange={(e) => set("returnDate", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <div>
          <label className="label">Adults</label>
          <input type="number" min={1} max={9} className="input" value={f.adults} onChange={(e) => set("adults", Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Cabin</label>
          <select className="input" value={f.cabin} onChange={(e) => set("cabin", e.target.value as FormState["cabin"])}>
            <option value="economy">Economy</option>
            <option value="premium">Premium economy</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </select>
        </div>
        <div>
          <label className="label">Stops</label>
          <select className="input" value={f.maxStops} onChange={(e) => set("maxStops", e.target.value as FormState["maxStops"])}>
            <option value="any">Any</option>
            <option value="0">Non-stop only</option>
            <option value="1">Max 1 stop</option>
            <option value="2">Max 2 stops</option>
          </select>
        </div>
        <div>
          <label className="label">Flexible dates</label>
          <select className="input" value={f.flexDays} onChange={(e) => set("flexDays", Number(e.target.value))}>
            <option value={0}>Exact dates</option>
            <option value={1}>± 1 day</option>
            <option value={2}>± 2 days</option>
            <option value={3}>± 3 days</option>
          </select>
        </div>
        <div>
          <label className="label">Currency</label>
          <select className="input" value={f.currency} onChange={(e) => set("currency", e.target.value as FormState["currency"])}>
            <option value="SGD">SGD</option>
            <option value="INR">INR</option>
          </select>
        </div>
        <div>
          <label className="label">Checked bag</label>
          <label className="input flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={f.needBag} onChange={(e) => set("needBag", e.target.checked)} />
            I need one
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary px-6" disabled={loading}>
          {loading ? "Searching…" : "Search flights"}
        </button>
        {f.flexDays > 0 && (
          <span className="text-xs text-amber-700">Flexible dates use {f.flexDays * 2} extra searches from your API quota.</span>
        )}
        {recent.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-1 text-xs text-slate-500">
            Recent:
            {recent.map((r, i) => (
              <button
                type="button"
                key={i}
                className="chip bg-slate-100 text-slate-700 hover:bg-sky-100"
                onClick={() => setF(r)}
              >
                {r.from}→{r.to} {r.outboundDate.slice(5)}
                {r.tripType === "return" && r.returnDate ? `–${r.returnDate.slice(5)}` : ""}
              </button>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}
