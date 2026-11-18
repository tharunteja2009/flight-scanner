/**
 * Fake SerpApi-shaped data so the UI can be used without an API key (MOCK=1 or no SERPAPI_KEY).
 * Prices vary by date so the flexible-date strip looks realistic.
 */
import type { BookingOption, SearchParams, SearchResult } from "./types";
import { normaliseBooking, normaliseSearch } from "./normalise";

interface Tmpl {
  airline: string;
  code: string;
  site: string;
  base: number; // SGD one-way
  via?: string;
  legMin: [number, number];
  layoverMin?: number;
  bagFee?: boolean;
  dep: string;
  selfTransfer?: boolean;
}

const TEMPLATES: Tmpl[] = [
  { airline: "Singapore Airlines", code: "SQ", site: "https://www.singaporeair.com", base: 420, legMin: [255, 0], dep: "09:05" },
  { airline: "Scoot", code: "TR", site: "https://www.flyscoot.com", base: 165, legMin: [250, 0], bagFee: true, dep: "21:40" },
  { airline: "IndiGo", code: "6E", site: "https://www.goindigo.in", base: 190, legMin: [260, 0], bagFee: true, dep: "23:15" },
  { airline: "Air India", code: "AI", site: "https://www.airindia.com", base: 285, legMin: [260, 0], dep: "13:30" },
  { airline: "Air India Express", code: "IX", site: "https://www.airindiaexpress.com", base: 175, legMin: [265, 0], bagFee: true, dep: "06:10" },
  { airline: "AirAsia", code: "AK", site: "https://www.airasia.com", base: 135, via: "KUL", legMin: [60, 230], layoverMin: 180, bagFee: true, dep: "07:00", selfTransfer: true },
  { airline: "Malaysia Airlines", code: "MH", site: "https://www.malaysiaairlines.com", base: 260, via: "KUL", legMin: [60, 235], layoverMin: 125, dep: "11:20" },
  { airline: "SriLankan Airlines", code: "UL", site: "https://www.srilankan.com", base: 230, via: "CMB", legMin: [215, 75], layoverMin: 590, dep: "15:50" },
];

function seedFrom(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function addMin(date: string, hhmm: string, minutes: number): string {
  const d = new Date(`${date}T${hhmm}:00`);
  d.setMinutes(d.getMinutes() + minutes);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function buildRaw(from: string, to: string, date: string, p: SearchParams, stage: "out" | "ret" | "oneway") {
  const fx = p.currency === "INR" ? 66 : 1;
  const mult = p.tripType === "return" ? 1.85 : 1;
  const cabin = { economy: 1, premium: 1.8, business: 3.5, first: 6 }[p.cabin];
  const seed = seedFrom(`${from}${to}${date}`);

  const flights = TEMPLATES.filter((t) => p.maxStops === "any" || (t.via ? 1 : 0) <= Number(p.maxStops)).map((t, i) => {
    const dayFactor = 0.85 + (seedFrom(date) % 40) / 100;
    const wobble = (0.8 + (((seed >> i) & 0xff) / 255) * 0.5) * dayFactor;
    const price = Math.round(t.base * wobble * mult * cabin * p.adults * fx);
    const segs = t.via
      ? [
          { from, to: t.via, start: t.dep, dur: t.legMin[0] },
          { from: t.via, to, start: null as string | null, dur: t.legMin[1] },
        ]
      : [{ from, to, start: t.dep, dur: t.legMin[0] }];
    let clock = `${date} ${t.dep}`;
    const flightsRaw = segs.map((s, k) => {
      const depTime = k === 0 ? clock : addMin(clock.slice(0, 10), clock.slice(11), t.layoverMin ?? 0);
      const arrTime = addMin(depTime.slice(0, 10), depTime.slice(11), s.dur);
      clock = arrTime;
      return {
        departure_airport: { id: s.from, name: `${s.from} Airport`, time: depTime },
        arrival_airport: { id: s.to, name: `${s.to} Airport`, time: arrTime },
        duration: s.dur,
        airline: t.airline,
        flight_number: `${t.code} ${100 + ((seed + i * 7 + k) % 800)}`,
        airplane: k === 0 ? "Airbus A320neo" : "Boeing 737",
        legroom: "29 in",
        extensions: t.bagFee ? ["Checked baggage for a fee", "Average legroom (29 in)"] : ["Average legroom (30 in)", "In-seat USB outlet"],
      };
    });
    const total = t.legMin[0] + t.legMin[1] + (t.layoverMin ?? 0);
    return {
      flights: flightsRaw,
      layovers: t.via
        ? [{ id: t.via, name: `${t.via} Airport`, duration: t.layoverMin, overnight: (t.layoverMin ?? 0) > 480 }]
        : undefined,
      total_duration: total,
      carbon_emissions: { this_flight: 180000 + i * 9000, typical_for_this_route: 200000, difference_percent: -10 + i * 4 },
      price,
      type: p.tripType === "return" ? "Round trip" : "One way",
      airline_logo: undefined,
      extensions: t.selfTransfer ? ["Self transfer"] : [],
      departure_token: stage === "out" ? `mock-dep|${t.code}` : undefined,
      booking_token: stage !== "out" ? `mock-book|${t.code}` : undefined,
    };
  });

  const best = flights.slice(0, 3);
  const other = flights.slice(3);
  const lows = flights.map((f) => f.price);
  return {
    best_flights: best,
    other_flights: other,
    price_insights: {
      lowest_price: Math.min(...lows),
      price_level: "typical",
      typical_price_range: [Math.round(Math.min(...lows) * 1.05), Math.round(Math.min(...lows) * 1.6)],
    },
  };
}

export function mockSearch(p: SearchParams): SearchResult {
  const from = p.from.split(",")[0];
  const to = p.to.split(",")[0];
  let raw;
  if (p.tripType === "oneway") raw = buildRaw(from, to, p.outboundDate, p, "oneway");
  else if (!p.departureToken) raw = buildRaw(from, to, p.outboundDate, p, "out");
  else {
    // return leg for chosen outbound: keep the same price (Google shows total round-trip price)
    const code = p.departureToken.split("|")[1];
    raw = buildRaw(to, from, p.returnDate ?? p.outboundDate, p, "ret");
    const outRaw = buildRaw(from, to, p.outboundDate, p, "out");
    const chosen = [...outRaw.best_flights, ...outRaw.other_flights].find((f) => f.departure_token?.endsWith(code));
    for (const f of [...raw.best_flights, ...raw.other_flights]) {
      f.price = chosen ? chosen.price + Math.round((f.price - chosen.price) * 0.15) : f.price;
    }
  }
  return { ...normaliseSearch(raw, p.currency), mock: true };
}

export function mockBooking(p: SearchParams, token: string): BookingOption[] {
  const code = token.split("|")[1];
  const t = TEMPLATES.find((x) => x.code === code) ?? TEMPLATES[0];
  const fx = p.currency === "INR" ? 66 : 1;
  const base = Math.round(t.base * (p.tripType === "return" ? 1.85 : 1) * p.adults * fx);
  return normaliseBooking({
    booking_options: [
      {
        together: {
          book_with: t.airline,
          airline: true,
          marketing_airline_names: [t.airline],
          price: base,
          booking_request: { url: t.site },
          baggage_prices: t.bagFee ? ["1 free carry-on", `1st checked bag: ${p.currency} ${45 * fx}`] : ["1 free carry-on", "1 free checked bag"],
        },
      },
      {
        together: {
          book_with: "Trip.com",
          marketing_airline_names: [t.airline],
          price: Math.round(base * 0.97),
          booking_request: { url: "https://www.trip.com" },
          baggage_prices: [],
        },
      },
      {
        together: {
          book_with: "MakeMyTrip",
          marketing_airline_names: [t.airline],
          price: Math.round(base * 0.99),
          booking_request: { url: "https://www.makemytrip.com" },
          baggage_prices: [],
        },
      },
    ],
  });
}
