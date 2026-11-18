/**
 * Rough add-on cost estimates for carriers whose basic fares often EXCLUDE checked baggage.
 * Values are in SGD, per passenger, per direction, for ~20kg bought online in advance.
 * They are ESTIMATES — update them when you see real prices at checkout.
 *
 * We charge the bag estimate when Google says "Checked baggage for a fee", or when Google gives
 * no baggage info and the airline usually sells bags separately (bagUsuallyIncluded not set).
 */
export interface AirlineFee {
  bagSGD: number; // checked bag, per pax per direction
  paymentSGD: number; // card / convenience / processing fee, per pax per direction
  /** True when the carrier's international fares normally include a checked bag. Then we only
   *  charge a bag if Google explicitly says "Checked baggage for a fee". */
  bagUsuallyIncluded?: boolean;
}

export const BUDGET_AIRLINE_FEES: Record<string, AirlineFee> = {
  Scoot: { bagSGD: 50, paymentSGD: 0 },
  AirAsia: { bagSGD: 45, paymentSGD: 8 },
  "AirAsia X": { bagSGD: 55, paymentSGD: 8 },
  "Thai AirAsia": { bagSGD: 45, paymentSGD: 8 },
  "Indonesia AirAsia": { bagSGD: 45, paymentSGD: 8 },
  IndiGo: { bagSGD: 40, paymentSGD: 5, bagUsuallyIncluded: true },
  "Air India Express": { bagSGD: 40, paymentSGD: 5, bagUsuallyIncluded: true },
  SpiceJet: { bagSGD: 40, paymentSGD: 5, bagUsuallyIncluded: true },
  "Akasa Air": { bagSGD: 40, paymentSGD: 5, bagUsuallyIncluded: true },
  Jetstar: { bagSGD: 50, paymentSGD: 5 },
  VietJet: { bagSGD: 40, paymentSGD: 5 },
  "Cebu Pacific": { bagSGD: 45, paymentSGD: 5 },
  "Nok Air": { bagSGD: 35, paymentSGD: 5 },
  "Thai Lion Air": { bagSGD: 35, paymentSGD: 5 },
};

export const DEFAULT_BUDGET_FEE: AirlineFee = { bagSGD: 50, paymentSGD: 5 };

/** Approximate SGD → INR rate used only for converting the fee estimates above. */
export const SGD_TO_INR = Number(process.env.NEXT_PUBLIC_SGD_TO_INR ?? 66);

export function findBudgetFee(airline: string): AirlineFee | undefined {
  const exact = BUDGET_AIRLINE_FEES[airline];
  if (exact) return exact;
  const key = Object.keys(BUDGET_AIRLINE_FEES)
    .sort((a, b) => b.length - a.length)
    .find((k) => airline.toLowerCase().includes(k.toLowerCase()));
  return key ? BUDGET_AIRLINE_FEES[key] : undefined;
}
