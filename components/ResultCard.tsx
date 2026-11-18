"use client";

import { useState } from "react";
import { formatDuration, formatMoney, type Ranked } from "@/lib/scoring";
import { transitWarnings } from "@/lib/transit-visa";
import type { Currency } from "@/lib/types";

function time(t?: string) {
  return t ? t.slice(11, 16) : "--:--";
}
function dayDiff(a?: string, b?: string) {
  if (!a || !b) return 0;
  return Math.round((new Date(b.slice(0, 10)).getTime() - new Date(a.slice(0, 10)).getTime()) / 86400000);
}

export default function ResultCard({
  r,
  currency,
  badges,
  actionLabel,
  onAction,
  children,
}: {
  r: Ranked;
  currency: Currency;
  badges: string[];
  actionLabel: string;
  onAction: () => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { opt, cost } = r;
  const first = opt.segments[0];
  const last = opt.segments[opt.segments.length - 1];
  const plus = dayDiff(first?.from.time, last?.to.time);
  const warnings = transitWarnings(opt);
  const hasExtras = cost.bagFee + cost.paymentFee > 0;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-4 p-4">
        {/* airline */}
        <div className="flex w-44 items-center gap-2">
          {opt.logo || first?.airlineLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={opt.logo ?? first?.airlineLogo} alt="" className="h-8 w-8 object-contain" />
          ) : (
            <div className="grid h-8 w-8 place-items-center rounded bg-slate-100 text-xs font-bold text-slate-500">
              {opt.airlines[0]?.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{opt.airlines.join(" + ")}</div>
            <div className="truncate text-xs text-slate-500">{opt.segments.map((s) => s.flightNumber).join(", ")}</div>
          </div>
        </div>

        {/* times */}
        <div className="flex flex-1 items-center gap-3">
          <div className="text-center">
            <div className="text-lg font-semibold">{time(first?.from.time)}</div>
            <div className="font-mono text-xs text-slate-500">{first?.from.id}</div>
          </div>
          <div className="flex-1 text-center text-xs text-slate-500">
            <div>{formatDuration(opt.totalDurationMin)}</div>
            <div className="relative my-1 h-px bg-slate-300">
              {opt.layovers.map((_, i) => (
                <span
                  key={i}
                  className="absolute -top-1 h-2 w-2 rounded-full bg-slate-400"
                  style={{ left: `${((i + 1) / (opt.layovers.length + 1)) * 100}%` }}
                />
              ))}
            </div>
            <div className={opt.stops === 0 ? "text-emerald-700" : ""}>
              {opt.stops === 0
                ? "Non-stop"
                : `${opt.stops} stop${opt.stops > 1 ? "s" : ""} · ${opt.layovers.map((l) => `${l.id} ${formatDuration(l.durationMin)}`).join(", ")}`}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">
              {time(last?.to.time)}
              {plus > 0 && <sup className="ml-0.5 text-xs text-amber-600">+{plus}</sup>}
            </div>
            <div className="font-mono text-xs text-slate-500">{last?.to.id}</div>
          </div>
        </div>

        {/* price */}
        <div className="w-44 text-right">
          <div className="text-2xl font-bold">{formatMoney(cost.total, currency)}</div>
          <div className="text-xs text-slate-500">
            {hasExtras ? (
              <>
                fare {formatMoney(cost.fare, currency)} + extras {formatMoney(cost.bagFee + cost.paymentFee, currency)}
              </>
            ) : (
              "true total · no known extras"
            )}
          </div>
        </div>

        <button className="btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      </div>

      {/* badges & flags */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
        {badges.map((b) => (
          <span key={b} className="chip bg-sky-100 text-sky-800">
            {b}
          </span>
        ))}
        {opt.googleBest && <span className="chip bg-slate-100 text-slate-600">Google top pick</span>}
        {cost.bagFee > 0 && <span className="chip bg-amber-100 text-amber-800">🧳 Bag not included</span>}
        {opt.selfTransfer && <span className="chip bg-red-100 text-red-800">Self-transfer</span>}
        {opt.layovers.some((l) => l.overnight) && <span className="chip bg-amber-100 text-amber-800">Overnight layover</span>}
        {opt.segments.some((s) => s.oftenDelayed) && <span className="chip bg-amber-100 text-amber-800">Often delayed 30+ min</span>}
        {opt.co2?.diffPct !== undefined && (
          <span className={`chip ${opt.co2.diffPct <= 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            CO₂ {opt.co2.diffPct > 0 ? "+" : ""}
            {opt.co2.diffPct}%
          </span>
        )}
        {warnings.some((w) => w.level === "warn") && <span className="chip bg-red-100 text-red-800">⚠ Visa check</span>}
        <button onClick={() => setOpen(!open)} className="ml-auto text-xs font-medium text-sky-700 hover:underline">
          {open ? "Hide details" : "Details & cost breakdown"}
        </button>
      </div>

      {open && (
        <div className="grid gap-4 border-t border-slate-200 p-4 text-sm md:grid-cols-2">
          <div className="space-y-3">
            {opt.segments.map((s, i) => (
              <div key={i}>
                <div className="font-medium">
                  {time(s.from.time)} {s.from.name} ({s.from.id}) → {time(s.to.time)} {s.to.name} ({s.to.id})
                </div>
                <div className="text-xs text-slate-500">
                  {s.airline} {s.flightNumber} · {formatDuration(s.durationMin)}
                  {s.airplane ? ` · ${s.airplane}` : ""}
                  {s.legroom ? ` · legroom ${s.legroom}` : ""}
                </div>
                {s.extensions.length > 0 && <div className="text-xs text-slate-500">{s.extensions.join(" · ")}</div>}
                {opt.layovers[i] && (
                  <div className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">
                    Layover {formatDuration(opt.layovers[i].durationMin)} at {opt.layovers[i].name}
                    {opt.layovers[i].changeAirport && " · ⚠ change airport"}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-0.5 text-slate-500">Fare (all passengers)</td>
                  <td className="text-right">{formatMoney(cost.fare, currency)}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-500">Checked bag (est.)</td>
                  <td className="text-right">{formatMoney(cost.bagFee, currency)}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-500">Card / convenience fee (est.)</td>
                  <td className="text-right">{formatMoney(cost.paymentFee, currency)}</td>
                </tr>
                <tr className="border-t border-slate-200 font-semibold">
                  <td className="py-1">True total</td>
                  <td className="text-right">{formatMoney(cost.total, currency)}</td>
                </tr>
              </tbody>
            </table>
            {cost.notes.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-600">
                {cost.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
            {warnings.length > 0 && (
              <ul className="space-y-1 text-xs">
                {warnings.map((w, i) => (
                  <li key={i} className={`rounded px-2 py-1 ${w.level === "warn" ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-600"}`}>
                    {w.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
