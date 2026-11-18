"use client";

import { useEffect, useMemo, useState } from "react";
import SearchForm, { type FormState } from "@/components/SearchForm";
import ResultCard from "@/components/ResultCard";
import BookingPanel from "@/components/BookingPanel";
import DateStrip, { type DayPrice } from "@/components/DateStrip";
import { toQuery } from "@/lib/params";
import { airportLabel } from "@/lib/airports";
import { formatMoney, rank, type Ranked, type SortMode } from "@/lib/scoring";
import type { FlightOption, SearchParams, SearchResult } from "@/lib/types";

function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function toParams(f: FormState, overrides: Partial<SearchParams> = {}): SearchParams {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { needBag, flexDays, ...p } = f;
  return { ...p, ...overrides };
}

async function fetchSearch(p: SearchParams): Promise<SearchResult> {
  const res = await fetch(`/api/search?${toQuery(p)}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? "Search failed");
  return data;
}

const SORTS: { id: SortMode; label: string; hint: string }[] = [
  { id: "best", label: "Best value", hint: "true cost + value of your time + risk penalties" },
  { id: "cheapest", label: "Cheapest", hint: "lowest true total (fare + bag + fees)" },
  { id: "fastest", label: "Fastest", hint: "shortest total travel time" },
];

export default function Home() {
  const [form, setForm] = useState<FormState | null>(null);
  const [params, setParams] = useState<SearchParams | null>(null); // current outbound search
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [outbound, setOutbound] = useState<SearchResult>();
  const [chosenOut, setChosenOut] = useState<FlightOption>();
  const [returns, setReturns] = useState<SearchResult>();
  const [sort, setSort] = useState<SortMode>("best");
  const [valuePerHour, setValuePerHour] = useState(15);
  const [days, setDays] = useState<DayPrice[]>([]);
  const [bookingFor, setBookingFor] = useState<string>();
  const [account, setAccount] = useState<{ mock: boolean; searchesLeft?: number }>();

  const refreshAccount = () =>
    fetch("/api/account")
      .then((r) => r.json())
      .then(setAccount)
      .catch(() => {});
  useEffect(() => {
    refreshAccount();
  }, []);

  const currency = params?.currency ?? "SGD";

  async function runSearch(f: FormState, outboundDate: string) {
    const tripLen = f.tripType === "return" && f.returnDate ? daysBetween(f.outboundDate, f.returnDate) : 0;
    const p = toParams(f, {
      outboundDate,
      returnDate: f.tripType === "return" ? shiftDate(outboundDate, tripLen) : undefined,
      departureToken: undefined,
    });
    setParams(p);
    setLoading(true);
    setError(undefined);
    setOutbound(undefined);
    setChosenOut(undefined);
    setReturns(undefined);
    setBookingFor(undefined);
    try {
      const r = await fetchSearch(p);
      setOutbound(r);
      const cheapest = r.options.length ? Math.min(...r.options.map((o) => o.price)) : undefined;
      setDays((ds) => ds.map((d) => (d.date === outboundDate ? { ...d, price: cheapest, loading: false } : d)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      refreshAccount();
    }
  }

  async function onSearch(f: FormState) {
    setForm(f);
    setValuePerHour(f.currency === "INR" ? 1000 : 15);
    const tripLen = f.tripType === "return" && f.returnDate ? daysBetween(f.outboundDate, f.returnDate) : 0;
    const dates =
      f.flexDays > 0
        ? Array.from({ length: f.flexDays * 2 + 1 }, (_, i) => shiftDate(f.outboundDate, i - f.flexDays))
        : [];
    setDays(dates.map((date) => ({ date, loading: true })));
    runSearch(f, f.outboundDate);

    // Other dates in the background for the price strip
    for (const date of dates.filter((d) => d !== f.outboundDate)) {
      const p = toParams(f, { outboundDate: date, returnDate: f.tripType === "return" ? shiftDate(date, tripLen) : undefined });
      fetchSearch(p)
        .then((r) => (r.options.length ? Math.min(...r.options.map((o) => o.price)) : undefined))
        .catch(() => undefined)
        .then((price) => setDays((ds) => ds.map((d) => (d.date === date ? { ...d, price, loading: false } : d))));
    }
  }

  async function chooseOutbound(o: FlightOption) {
    if (!params || !o.departureToken) return;
    setChosenOut(o);
    setReturns(undefined);
    setBookingFor(undefined);
    setLoading(true);
    setError(undefined);
    try {
      setReturns(await fetchSearch({ ...params, departureToken: o.departureToken }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      refreshAccount();
    }
  }

  const stage: "outbound" | "return" = chosenOut ? "return" : "outbound";
  const list = stage === "return" ? returns : outbound;

  const ranked: Ranked[] = useMemo(() => {
    if (!list || !form || !params) return [];
    const ctx = {
      needBag: form.needBag,
      passengers: params.adults,
      directions: (params.tripType === "return" ? 2 : 1) as 1 | 2,
      currency: params.currency,
    };
    if (stage === "return" && chosenOut) {
      // Cost the whole trip: outbound + return segments together.
      const merged = list.options.map((o) => ({ ...o, segments: [...chosenOut.segments, ...o.segments] }));
      const byId = new Map(list.options.map((o) => [o.id, o]));
      return rank(merged, ctx, sort, valuePerHour).map((r) => ({ ...r, opt: byId.get(r.opt.id)! }));
    }
    return rank(list.options, ctx, sort, valuePerHour);
  }, [list, form, params, sort, valuePerHour, stage, chosenOut]);

  const badgeMap = useMemo(() => {
    const m = new Map<string, string[]>();
    if (ranked.length < 2) return m;
    const add = (id: string, b: string) => m.set(id, [...(m.get(id) ?? []), b]);
    add([...ranked].sort((a, b) => a.cost.total - b.cost.total)[0].opt.id, "💰 Cheapest");
    add([...ranked].sort((a, b) => a.opt.totalDurationMin - b.opt.totalDurationMin)[0].opt.id, "⚡ Fastest");
    add([...ranked].sort((a, b) => a.score - b.score)[0].opt.id, "⭐ Best value");
    return m;
  }, [ranked]);

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">✈️ Flight Scanner</h1>
          <p className="text-sm text-slate-500">True total cost, no surprises at checkout. Book directly on the airline site.</p>
        </div>
        {account &&
          (account.mock ? (
            <span className="chip bg-amber-100 px-3 py-1 text-amber-800">Demo mode: sample data (add SERPAPI_KEY for real fares)</span>
          ) : account.searchesLeft !== undefined ? (
            <span className="chip bg-slate-200 px-3 py-1 text-slate-700">{account.searchesLeft} API searches left</span>
          ) : null)}
      </header>

      <SearchForm loading={loading} onSearch={onSearch} />

      {days.length > 0 && form && (
        <DateStrip days={days} selected={params?.outboundDate ?? ""} currency={currency} onPick={(d) => runSearch(form, d)} />
      )}

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">{error}</div>}

      {params && list && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">
              {stage === "outbound" ? (
                <>
                  {params.tripType === "return" ? "1. Choose departing flight" : "Flights"}: {airportLabel(params.from)} →{" "}
                  {airportLabel(params.to)} · {params.outboundDate}
                </>
              ) : (
                <>
                  2. Choose return flight: {airportLabel(params.to)} → {airportLabel(params.from)} · {params.returnDate}
                </>
              )}
            </h2>
            {stage === "return" && (
              <button className="text-sm text-sky-700 hover:underline" onClick={() => setChosenOut(undefined)}>
                ← change departing flight
              </button>
            )}
          </div>

          {stage === "return" && chosenOut && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
              Departing: {chosenOut.airlines.join(" + ")} {chosenOut.segments[0]?.from.time?.slice(11)} →{" "}
              {chosenOut.segments.at(-1)?.to.time?.slice(11)}. Prices below are the round-trip total.
            </p>
          )}

          {list.insights?.level && (
            <p className="text-sm text-slate-600">
              Prices are currently <b className={list.insights.level === "low" ? "text-emerald-700" : list.insights.level === "high" ? "text-red-700" : ""}>{list.insights.level}</b>
              {list.insights.typicalRange &&
                ` for this route (usually ${formatMoney(list.insights.typicalRange[0], currency)}–${formatMoney(list.insights.typicalRange[1], currency)}).`}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {SORTS.map((s) => (
              <button
                key={s.id}
                title={s.hint}
                onClick={() => setSort(s.id)}
                className={`chip px-3 py-1 text-sm ${sort === s.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-300"}`}
              >
                {s.label}
              </button>
            ))}
            {sort === "best" && (
              <label className="ml-2 flex items-center gap-1 text-xs text-slate-600">
                My time is worth
                <input
                  type="number"
                  min={0}
                  className="input w-20 py-1"
                  value={valuePerHour}
                  onChange={(e) => setValuePerHour(Number(e.target.value))}
                />
                {currency}/hour
              </label>
            )}
            <span className="ml-auto text-xs text-slate-500">{ranked.length} options</span>
          </div>

          {ranked.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-slate-500">No flights found. Try other dates or allow more stops.</p>}

          {ranked.map((r) => {
            const isBookable = !!r.opt.bookingToken;
            return (
              <ResultCard
                key={r.opt.id}
                r={r}
                currency={currency}
                badges={badgeMap.get(r.opt.id) ?? []}
                actionLabel={isBookable ? (bookingFor === r.opt.id ? "Hide" : "Book →") : "Choose →"}
                onAction={() =>
                  isBookable ? setBookingFor(bookingFor === r.opt.id ? undefined : r.opt.id) : chooseOutbound(r.opt)
                }
              >
                {bookingFor === r.opt.id && (
                  <BookingPanel query={`${toQuery({ ...params, departureToken: undefined })}&bookingToken=${encodeURIComponent(r.opt.bookingToken!)}`} currency={currency} />
                )}
              </ResultCard>
            );
          })}
        </section>
      )}

      {loading && !list && <p className="text-center text-slate-500">Searching all airlines… (deep search can take 10–30s)</p>}

      <footer className="pt-4 text-center text-xs text-slate-400">
        Prices from Google Flights via SerpApi. Bag/fee amounts are estimates. Always confirm the final price and visa rules before paying.
      </footer>
    </main>
  );
}
