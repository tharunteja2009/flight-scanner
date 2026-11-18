"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/scoring";
import type { BookingOption, Currency } from "@/lib/types";

/** Opens the seller's page. Google booking links are POST requests, so we submit a real form. */
function GoButton({ o }: { o: BookingOption }) {
  if (!o.url) return <span className="text-xs text-slate-500">{o.phone ? `Call ${o.phone}` : "No link"}</span>;
  const label = o.isAirline ? `Book on ${o.seller} ↗` : `Go to ${o.seller} ↗`;
  const cls = o.isAirline ? "btn-primary" : "btn-ghost";
  if (!o.postData)
    return (
      <a className={cls} href={o.url} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  const fields = [...new URLSearchParams(o.postData).entries()];
  return (
    <form method="post" action={o.url} target="_blank" rel="noopener noreferrer">
      {fields.map(([k, v], i) => (
        <input key={i} type="hidden" name={k} value={v} />
      ))}
      <button className={cls}>{label}</button>
    </form>
  );
}

export default function BookingPanel({ query, currency }: { query: string; currency: Currency }) {
  const [state, setState] = useState<{ loading: boolean; error?: string; options?: BookingOption[] }>({ loading: true });

  useEffect(() => {
    let alive = true;
    fetch(`/api/booking?${query}`)
      .then((r) => r.json())
      .then((d) => alive && setState({ loading: false, error: d.error, options: d.options }))
      .catch(() => alive && setState({ loading: false, error: "Could not load booking options." }));
    return () => {
      alive = false;
    };
  }, [query]);

  if (state.loading) return <p className="p-3 text-sm text-slate-500">Finding where to book…</p>;
  if (state.error) return <p className="p-3 text-sm text-red-600">{state.error}</p>;
  if (!state.options?.length) return <p className="p-3 text-sm text-slate-500">No booking links available for this flight.</p>;

  const cheapest = Math.min(...state.options.map((o) => o.price ?? Infinity));

  return (
    <div className="space-y-2 border-t border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">
        Airline-direct is listed first: easier changes/refunds and no agency fees. Final price is confirmed on the seller&apos;s site.
      </p>
      {state.options.map((o, i) => (
        <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-200">
          <div className="min-w-48 flex-1">
            <div className="flex items-center gap-2 font-medium">
              {o.seller}
              {o.isAirline && <span className="chip bg-emerald-100 text-emerald-800">Airline direct</span>}
              {o.separateTickets && <span className="chip bg-amber-100 text-amber-800">Separate tickets</span>}
              {o.price === cheapest && state.options!.length > 1 && <span className="chip bg-sky-100 text-sky-800">Lowest</span>}
            </div>
            {o.title && <div className="text-xs text-slate-500">{o.title}</div>}
            {o.baggage.length > 0 && <div className="mt-1 text-xs text-slate-600">🧳 {o.baggage.join(" · ")}</div>}
          </div>
          <div className="text-right text-lg font-semibold">{o.price ? formatMoney(o.price, currency) : "—"}</div>
          <GoButton o={o} />
        </div>
      ))}
    </div>
  );
}
