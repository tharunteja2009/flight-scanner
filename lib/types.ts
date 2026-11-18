export type Currency = "SGD" | "INR";
export type Cabin = "economy" | "premium" | "business" | "first";

export interface SearchParams {
  from: string; // IATA, comma separated allowed (e.g. "SIN" or "MAA,BLR")
  to: string;
  tripType: "oneway" | "return";
  outboundDate: string; // YYYY-MM-DD
  returnDate?: string;
  adults: number;
  cabin: Cabin;
  maxStops: "any" | "0" | "1" | "2";
  currency: Currency;
  departureToken?: string; // set when fetching return flights for a chosen outbound
}

export interface AirportRef {
  id: string;
  name: string;
  time?: string;
}

export interface Segment {
  airline: string;
  airlineLogo?: string;
  flightNumber?: string;
  from: AirportRef;
  to: AirportRef;
  durationMin: number;
  airplane?: string;
  legroom?: string;
  extensions: string[];
  overnight?: boolean;
  oftenDelayed?: boolean;
}

export interface Layover {
  id: string;
  name: string;
  durationMin: number;
  overnight?: boolean;
  changeAirport?: boolean;
}

export interface FlightOption {
  id: string;
  price: number; // total for all passengers, whole trip (as reported by Google)
  currency: Currency;
  totalDurationMin: number;
  stops: number;
  segments: Segment[];
  layovers: Layover[];
  airlines: string[];
  logo?: string;
  co2?: { thisFlight?: number; typical?: number; diffPct?: number };
  extensions: string[];
  googleBest: boolean; // in Google's "best flights" list
  selfTransfer: boolean;
  departureToken?: string;
  bookingToken?: string;
}

export interface PriceInsights {
  lowest?: number;
  level?: string; // low | typical | high
  typicalRange?: [number, number];
}

export interface SearchResult {
  options: FlightOption[];
  insights?: PriceInsights;
  mock: boolean;
}

export interface BookingOption {
  seller: string;
  isAirline: boolean;
  price?: number;
  title?: string;
  url?: string;
  postData?: string;
  phone?: string;
  baggage: string[];
  extensions: string[];
  separateTickets: boolean;
}

export interface TrueCost {
  fare: number;
  bagFee: number;
  paymentFee: number;
  total: number;
  notes: string[];
}

export interface Warning {
  level: "info" | "warn";
  text: string;
}
