import { describe, expect, it } from "vitest";
import { rank, trueCost, valueScore } from "@/lib/scoring";
import { normaliseBooking, normaliseOption } from "@/lib/normalise";
import { transitWarnings } from "@/lib/transit-visa";
import { parseSearchParams } from "@/lib/params";
import type { FlightOption } from "@/lib/types";

function opt(over: Partial<FlightOption> & { airline?: string; ext?: string[] } = {}): FlightOption {
  const { airline = "Singapore Airlines", ext = [], ...rest } = over;
  return {
    id: Math.random().toString(),
    price: 300,
    currency: "SGD",
    totalDurationMin: 240,
    stops: 0,
    segments: [
      {
        airline,
        from: { id: "SIN", name: "Changi" },
        to: { id: "MAA", name: "Chennai" },
        durationMin: 240,
        extensions: ext,
      },
    ],
    layovers: [],
    airlines: [airline],
    extensions: [],
    googleBest: false,
    selfTransfer: false,
    ...rest,
  };
}

const ctx = { needBag: true, passengers: 1, directions: 1 as const, currency: "SGD" as const };

describe("trueCost", () => {
  it("adds no extras for full-service carriers", () => {
    const c = trueCost(opt(), ctx);
    expect(c.total).toBe(300);
    expect(c.bagFee).toBe(0);
  });

  it("adds Scoot bag + fee when Google says bag is extra", () => {
    const c = trueCost(opt({ airline: "Scoot", ext: ["Checked baggage for a fee"] }), ctx);
    expect(c.bagFee).toBe(50);
    expect(c.total).toBe(350);
  });

  it("assumes unbundled budget carriers exclude bags when Google gives no info", () => {
    expect(trueCost(opt({ airline: "AirAsia" }), ctx).bagFee).toBe(45);
  });

  it("does not add a bag for Indian carriers that usually include one, unless Google says so", () => {
    expect(trueCost(opt({ airline: "Air India Express" }), ctx).bagFee).toBe(0);
    expect(trueCost(opt({ airline: "Air India Express", ext: ["Checked baggage for a fee"] }), ctx).bagFee).toBe(40);
  });

  it("trusts Google when it says a bag is included", () => {
    expect(trueCost(opt({ airline: "IndiGo", ext: ["1 free checked bag"] }), ctx).bagFee).toBe(0);
  });

  it("skips bag fee when user has no checked bag", () => {
    expect(trueCost(opt({ airline: "Scoot", ext: ["Checked baggage for a fee"] }), { ...ctx, needBag: false }).bagFee).toBe(0);
  });

  it("scales by passengers, directions and currency", () => {
    const c = trueCost(opt({ airline: "Scoot", ext: ["Checked baggage for a fee"] }), {
      ...ctx,
      passengers: 2,
      directions: 2,
      currency: "INR",
    });
    expect(c.bagFee).toBe(50 * 66 * 4);
  });
});

describe("rank", () => {
  const cheapSlow = opt({ price: 200, totalDurationMin: 900 });
  const pricyFast = opt({ price: 260, totalDurationMin: 240 });
  const budgetWithBag = opt({ price: 190, totalDurationMin: 240, airline: "Scoot", ext: ["Checked baggage for a fee"] });

  it("cheapest uses true total, not headline fare", () => {
    const r = rank([cheapSlow, pricyFast, budgetWithBag], ctx, "cheapest", 15);
    expect(r[0].opt).toBe(cheapSlow); // 200 < 240 (190+50) < 260
  });

  it("fastest sorts by duration", () => {
    expect(rank([cheapSlow, pricyFast], ctx, "fastest", 15)[0].opt).toBe(pricyFast);
  });

  it("best value trades money for time", () => {
    // cheapSlow: 200 + 15h*15 = 425 ; pricyFast: 260 + 4h*15 = 320
    expect(rank([cheapSlow, pricyFast], ctx, "best", 15)[0].opt).toBe(pricyFast);
    // with time worth 0, cheaper wins
    expect(rank([cheapSlow, pricyFast], ctx, "best", 0)[0].opt).toBe(cheapSlow);
  });

  it("penalises self-transfer", () => {
    const o = opt({ selfTransfer: true });
    const c = trueCost(o, ctx);
    expect(valueScore(o, c, 0, "SGD")).toBe(c.total + 40);
  });
});

describe("normalise", () => {
  it("parses a SerpApi flight and detects airport change + self transfer", () => {
    const o = normaliseOption(
      {
        price: 250,
        total_duration: 600,
        extensions: ["Self transfer"],
        flights: [
          { airline: "AirAsia", flight_number: "AK 1", duration: 60, departure_airport: { id: "SIN" }, arrival_airport: { id: "KUL" } },
          { airline: "AirAsia", flight_number: "AK 2", duration: 240, departure_airport: { id: "SZB" }, arrival_airport: { id: "MAA" } },
        ],
        layovers: [{ id: "KUL", name: "KLIA", duration: 300 }],
        booking_token: "tok",
      },
      0,
      "SGD",
      true,
    )!;
    expect(o.stops).toBe(1);
    expect(o.selfTransfer).toBe(true);
    expect(o.layovers[0].changeAirport).toBe(true);
    expect(o.bookingToken).toBe("tok");
  });

  it("drops options without a price", () => {
    expect(normaliseOption({ flights: [] }, 0, "SGD", false)).toBeNull();
  });

  it("lists airline-direct booking first", () => {
    const b = normaliseBooking({
      booking_options: [
        { together: { book_with: "Trip.com", price: 100, marketing_airline_names: ["Scoot"] } },
        { together: { book_with: "Scoot", price: 110, marketing_airline_names: ["Scoot"] } },
      ],
    });
    expect(b[0].seller).toBe("Scoot");
    expect(b[0].isAirline).toBe(true);
  });
});

describe("transit warnings", () => {
  it("warns on UK layover for Indian passports", () => {
    const w = transitWarnings(opt({ layovers: [{ id: "LHR", name: "Heathrow", durationMin: 120 }] }));
    expect(w.some((x) => x.text.includes("United Kingdom"))).toBe(true);
  });
  it("no warning for KUL airside connection", () => {
    expect(transitWarnings(opt({ layovers: [{ id: "KUL", name: "KLIA", durationMin: 120 }] }))).toHaveLength(0);
  });
});

describe("parseSearchParams", () => {
  it("validates input", () => {
    expect(parseSearchParams(new URLSearchParams("from=SIN&to=SIN&outboundDate=2026-12-01"))).toMatch(/differ/);
    expect(parseSearchParams(new URLSearchParams("from=SIN&to=MAA&tripType=return&outboundDate=2026-12-01"))).toMatch(/return date/);
    const ok = parseSearchParams(new URLSearchParams("from=sin&to=maa&outboundDate=2026-12-01&adults=2"));
    expect(ok).toMatchObject({ from: "SIN", to: "MAA", adults: 2, tripType: "oneway" });
  });
});
