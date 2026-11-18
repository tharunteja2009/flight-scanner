import { DEFAULT_BUDGET_FEE, findBudgetFee, SGD_TO_INR } from "./airline-fees";
import type { Currency, FlightOption, TrueCost } from "./types";

export type SortMode = "cheapest" | "fastest" | "best";

export interface CostContext {
  needBag: boolean;
  passengers: number;
  directions: 1 | 2; // 2 for a return trip priced as a whole
  currency: Currency;
}

const BAG_FEE_RE = /checked baggage for a fee|checked bag(gage)? (is )?not included/i;
const BAG_FREE_RE = /(1|2|one|two) (free )?checked bag|checked bag(gage)? included|free checked/i;

function rate(currency: Currency) {
  return currency === "INR" ? SGD_TO_INR : 1;
}

/** Fare + estimated extras you would otherwise only discover at checkout. */
export function trueCost(opt: FlightOption, ctx: CostContext): TrueCost {
  const fx = rate(ctx.currency);
  const notes: string[] = [];
  let bagFee = 0;
  let paymentFee = 0;
  const units = ctx.passengers * ctx.directions;

  // Bag fee is decided per operating airline (worst case across segments).
  let worstBag = 0;
  let worstPayment = 0;
  let bagFeeAirline: string | undefined;
  for (const seg of opt.segments) {
    const ext = seg.extensions.join(" | ");
    const budget = findBudgetFee(seg.airline);
    const saysFee = BAG_FEE_RE.test(ext);
    const saysFree = BAG_FREE_RE.test(ext);
    if (budget) worstPayment = Math.max(worstPayment, budget.paymentSGD);
    if (ctx.needBag && (saysFee || (!saysFree && budget && !budget.bagUsuallyIncluded))) {
      const fee = (budget ?? DEFAULT_BUDGET_FEE).bagSGD;
      if (fee > worstBag) {
        worstBag = fee;
        bagFeeAirline = seg.airline;
      }
    }
  }

  if (worstBag > 0) {
    bagFee = Math.round(worstBag * fx * units);
    notes.push(`Checked bag not included on ${bagFeeAirline} — est. ${ctx.currency} ${Math.round(worstBag * fx)} per person per way`);
  }
  if (worstPayment > 0) {
    paymentFee = Math.round(worstPayment * fx * units);
    notes.push("Budget carrier card / convenience fee (est.)");
  }
  if (opt.selfTransfer) notes.push("Separate tickets — missed connections are not protected");

  return { fare: opt.price, bagFee, paymentFee, total: opt.price + bagFee + paymentFee, notes };
}

/**
 * Best value = true cost + (hours × value of your time) + small risk penalties.
 * valuePerHour is in the chosen currency.
 */
export function valueScore(opt: FlightOption, cost: TrueCost, valuePerHour: number, currency: Currency): number {
  const hours = opt.totalDurationMin / 60;
  let penalty = 0;
  if (opt.selfTransfer) penalty += 40 * rate(currency);
  for (const l of opt.layovers) {
    if (l.overnight) penalty += 20 * rate(currency);
    if (l.changeAirport) penalty += 30 * rate(currency);
  }
  return cost.total + hours * valuePerHour + penalty;
}

export interface Ranked {
  opt: FlightOption;
  cost: TrueCost;
  score: number;
}

export function rank(options: FlightOption[], ctx: CostContext, mode: SortMode, valuePerHour: number): Ranked[] {
  const ranked = options.map((opt) => {
    const cost = trueCost(opt, ctx);
    return { opt, cost, score: valueScore(opt, cost, valuePerHour, ctx.currency) };
  });
  const key = (r: Ranked) =>
    mode === "cheapest" ? r.cost.total : mode === "fastest" ? r.opt.totalDurationMin : r.score;
  return ranked.sort((a, b) => key(a) - key(b) || a.cost.total - b.cost.total);
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatMoney(amount: number, currency: Currency): string {
  const n = Math.round(amount).toLocaleString(currency === "INR" ? "en-IN" : "en-SG");
  return currency === "INR" ? `₹${n}` : `S$${n}`;
}
