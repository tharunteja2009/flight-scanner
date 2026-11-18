import type { FlightOption, Warning } from "./types";
import { AIRPORT_COUNTRY } from "./airports";

/**
 * Transit hints for INDIAN passport holders. Rules change often — always verify on the
 * official embassy / IATA Timatic source before booking. This is only a reminder.
 */
const COUNTRY_HINTS: Record<string, string> = {
  "United Kingdom": "UK may require a Direct Airside Transit Visa (DATV) for Indian passports unless you hold certain visas (e.g. valid US/Canada/Schengen).",
  "United States": "US has no airside transit — a C-1/B visa is required even to connect.",
  Canada: "Canada requires a transit visa or eTA-eligible status — Indian passports generally need a visa.",
  Australia: "Australia requires a transit visa (subclass 771) for most Indian passports.",
  Germany: "Schengen airport transit rules may apply — check if an Airport Transit Visa is needed.",
  France: "Schengen airport transit rules may apply — check if an Airport Transit Visa is needed.",
  Netherlands: "Schengen airport transit rules may apply — check if an Airport Transit Visa is needed.",
  China: "Airside transit in China is usually fine within 24h, but check if you must change terminals or stay overnight.",
};

export function transitWarnings(opt: FlightOption): Warning[] {
  const out: Warning[] = [];
  const seen = new Set<string>();

  for (const l of opt.layovers) {
    const country = AIRPORT_COUNTRY[l.id];
    if (country && COUNTRY_HINTS[country] && !seen.has(country)) {
      seen.add(country);
      out.push({ level: "warn", text: `Layover in ${country} (${l.id}): ${COUNTRY_HINTS[country]}` });
    }
    if (l.changeAirport) {
      out.push({ level: "warn", text: `Airport change at ${l.name} — you must clear immigration, so an entry visa may be needed.` });
    }
    if (l.durationMin >= 12 * 60) {
      out.push({ level: "info", text: `Long layover at ${l.id} (${Math.round(l.durationMin / 60)}h) — check if you need a visa to leave the airport/hotel.` });
    }
  }

  if (opt.selfTransfer) {
    out.push({
      level: "warn",
      text: "Self-transfer / separate tickets: you collect bags and re-check in, which usually means entering the layover country (visa needed) and no protection if you miss the connection.",
    });
  }
  return out;
}
