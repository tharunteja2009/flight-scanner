import type { SearchParams } from "./types";

const IATA_LIST = /^[A-Z]{3}(,[A-Z]{3})*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate and parse query-string params coming from the browser. */
export function parseSearchParams(sp: URLSearchParams): SearchParams | string {
  const from = (sp.get("from") ?? "").toUpperCase().replace(/\s/g, "");
  const to = (sp.get("to") ?? "").toUpperCase().replace(/\s/g, "");
  const tripType = sp.get("tripType") === "return" ? "return" : "oneway";
  const outboundDate = sp.get("outboundDate") ?? "";
  const returnDate = sp.get("returnDate") ?? undefined;
  const adults = Math.min(9, Math.max(1, Number(sp.get("adults") ?? 1) || 1));
  const cabin = (["economy", "premium", "business", "first"] as const).find((c) => c === sp.get("cabin")) ?? "economy";
  const maxStops = (["any", "0", "1", "2"] as const).find((s) => s === sp.get("maxStops")) ?? "any";
  const currency = sp.get("currency") === "INR" ? "INR" : "SGD";

  if (!IATA_LIST.test(from) || !IATA_LIST.test(to)) return "Please choose valid 3-letter airport codes.";
  if (from === to) return "Origin and destination must differ.";
  if (!DATE.test(outboundDate)) return "Please choose a departure date.";
  if (tripType === "return" && (!returnDate || !DATE.test(returnDate))) return "Please choose a return date.";
  if (tripType === "return" && returnDate! < outboundDate) return "Return date must be after departure.";

  return {
    from,
    to,
    tripType,
    outboundDate,
    returnDate: tripType === "return" ? returnDate : undefined,
    adults,
    cabin,
    maxStops,
    currency,
    departureToken: sp.get("departureToken") ?? undefined,
  };
}

export function toQuery(p: SearchParams): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== "") q.set(k, String(v));
  return q.toString();
}
