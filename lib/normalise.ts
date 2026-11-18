import type { BookingOption, FlightOption, Layover, SearchParams, SearchResult, Segment } from "./types";

/* ---------- normalisation ---------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
const SELF_TRANSFER_RE = /self[- ]?transfer|separate tickets/i;

export function normaliseOption(raw: any, idx: number, currency: SearchParams["currency"], googleBest: boolean): FlightOption | null {
  if (typeof raw?.price !== "number" || !Array.isArray(raw.flights)) return null;

  const segments: Segment[] = raw.flights.map((f: any) => ({
    airline: f.airline ?? "Unknown",
    airlineLogo: f.airline_logo,
    flightNumber: f.flight_number,
    from: { id: f.departure_airport?.id, name: f.departure_airport?.name, time: f.departure_airport?.time },
    to: { id: f.arrival_airport?.id, name: f.arrival_airport?.name, time: f.arrival_airport?.time },
    durationMin: f.duration ?? 0,
    airplane: f.airplane,
    legroom: f.legroom,
    extensions: f.extensions ?? [],
    overnight: !!f.overnight,
    oftenDelayed: !!f.often_delayed_by_over_30_min,
  }));

  const layovers: Layover[] = (raw.layovers ?? []).map((l: any, i: number) => {
    const arr = segments[i]?.to.id;
    const dep = segments[i + 1]?.from.id;
    return {
      id: l.id,
      name: l.name,
      durationMin: l.duration ?? 0,
      overnight: !!l.overnight,
      changeAirport: !!(arr && dep && arr !== dep),
    };
  });

  const allText = [
    ...(raw.extensions ?? []),
    ...segments.flatMap((s) => s.extensions),
    ...(raw.layovers ?? []).map((l: any) => JSON.stringify(l)),
  ].join(" | ");

  return {
    id: `${googleBest ? "b" : "o"}${idx}-${segments.map((s) => s.flightNumber).join("-")}`,
    price: raw.price,
    currency,
    totalDurationMin: raw.total_duration ?? segments.reduce((a, s) => a + s.durationMin, 0),
    stops: Math.max(0, segments.length - 1),
    segments,
    layovers,
    airlines: [...new Set(segments.map((s) => s.airline))],
    logo: raw.airline_logo,
    co2: raw.carbon_emissions
      ? {
          thisFlight: raw.carbon_emissions.this_flight,
          typical: raw.carbon_emissions.typical_for_this_route,
          diffPct: raw.carbon_emissions.difference_percent,
        }
      : undefined,
    extensions: raw.extensions ?? [],
    googleBest,
    selfTransfer: SELF_TRANSFER_RE.test(allText),
    departureToken: raw.departure_token,
    bookingToken: raw.booking_token,
  };
}

export function normaliseSearch(data: any, currency: SearchParams["currency"]): SearchResult {
  const best = (data.best_flights ?? []).map((r: any, i: number) => normaliseOption(r, i, currency, true));
  const other = (data.other_flights ?? []).map((r: any, i: number) => normaliseOption(r, i, currency, false));
  const pi = data.price_insights;
  return {
    options: [...best, ...other].filter(Boolean) as FlightOption[],
    insights: pi
      ? { lowest: pi.lowest_price, level: pi.price_level, typicalRange: pi.typical_price_range }
      : undefined,
    mock: false,
  };
}

export function normaliseBooking(data: any): BookingOption[] {
  return (data.booking_options ?? [])
    .map((b: any): BookingOption | null => {
      const t = b.together ?? b.departing; // separate tickets: show the outbound leg's seller
      if (!t) return null;
      const marketing: string[] = t.marketing_airline_names ?? [];
      return {
        seller: t.book_with ?? "Unknown",
        isAirline: t.airline === true || marketing.some((m) => t.book_with?.toLowerCase().includes(m.toLowerCase())),
        price: t.price,
        title: t.option_title,
        url: t.booking_request?.url,
        postData: t.booking_request?.post_data,
        phone: t.booking_phone,
        baggage: t.baggage_prices ?? [],
        extensions: t.extensions ?? [],
        separateTickets: !!b.separate_tickets,
      };
    })
    .filter(Boolean)
    .sort((a: BookingOption, b: BookingOption) => Number(b.isAirline) - Number(a.isAirline) || (a.price ?? 1e12) - (b.price ?? 1e12));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

