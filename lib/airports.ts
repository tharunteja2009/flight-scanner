export interface Airport {
  code: string;
  city: string;
  name: string;
  country: string;
  favourite?: boolean;
}

export const AIRPORTS: Airport[] = [
  // Favourites (Singapore ⇄ India and nearby)
  { code: "SIN", city: "Singapore", name: "Changi", country: "Singapore", favourite: true },
  { code: "MAA", city: "Chennai", name: "Chennai Intl", country: "India", favourite: true },
  { code: "HYD", city: "Hyderabad", name: "Rajiv Gandhi Intl", country: "India", favourite: true },
  { code: "BLR", city: "Bengaluru", name: "Kempegowda Intl", country: "India", favourite: true },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Maharaj Intl", country: "India", favourite: true },
  { code: "DEL", city: "Delhi", name: "Indira Gandhi Intl", country: "India", favourite: true },
  { code: "CCU", city: "Kolkata", name: "Netaji Subhas Chandra Bose Intl", country: "India", favourite: true },
  { code: "KUL", city: "Kuala Lumpur", name: "KLIA", country: "Malaysia", favourite: true },
  { code: "BKK", city: "Bangkok", name: "Suvarnabhumi", country: "Thailand", favourite: true },
  { code: "DPS", city: "Bali", name: "Ngurah Rai", country: "Indonesia", favourite: true },
  { code: "CGK", city: "Jakarta", name: "Soekarno-Hatta", country: "Indonesia", favourite: true },
  // India
  { code: "COK", city: "Kochi", name: "Cochin Intl", country: "India" },
  { code: "TRV", city: "Thiruvananthapuram", name: "Trivandrum Intl", country: "India" },
  { code: "TRZ", city: "Tiruchirappalli", name: "Tiruchirappalli Intl", country: "India" },
  { code: "CJB", city: "Coimbatore", name: "Coimbatore Intl", country: "India" },
  { code: "VTZ", city: "Visakhapatnam", name: "Visakhapatnam", country: "India" },
  { code: "VGA", city: "Vijayawada", name: "Vijayawada", country: "India" },
  { code: "TIR", city: "Tirupati", name: "Tirupati", country: "India" },
  { code: "AMD", city: "Ahmedabad", name: "Sardar Vallabhbhai Patel Intl", country: "India" },
  { code: "PNQ", city: "Pune", name: "Pune", country: "India" },
  { code: "GOI", city: "Goa", name: "Dabolim", country: "India" },
  { code: "GOX", city: "Goa", name: "Manohar Intl (Mopa)", country: "India" },
  { code: "IXM", city: "Madurai", name: "Madurai", country: "India" },
  { code: "LKO", city: "Lucknow", name: "Chaudhary Charan Singh Intl", country: "India" },
  { code: "JAI", city: "Jaipur", name: "Jaipur Intl", country: "India" },
  { code: "ATQ", city: "Amritsar", name: "Sri Guru Ram Dass Jee Intl", country: "India" },
  { code: "CCJ", city: "Kozhikode", name: "Calicut Intl", country: "India" },
  { code: "IXE", city: "Mangaluru", name: "Mangalore Intl", country: "India" },
  // South-East Asia
  { code: "PEN", city: "Penang", name: "Penang Intl", country: "Malaysia" },
  { code: "LGK", city: "Langkawi", name: "Langkawi Intl", country: "Malaysia" },
  { code: "BKI", city: "Kota Kinabalu", name: "Kota Kinabalu Intl", country: "Malaysia" },
  { code: "DMK", city: "Bangkok", name: "Don Mueang", country: "Thailand" },
  { code: "HKT", city: "Phuket", name: "Phuket Intl", country: "Thailand" },
  { code: "CNX", city: "Chiang Mai", name: "Chiang Mai Intl", country: "Thailand" },
  { code: "SGN", city: "Ho Chi Minh City", name: "Tan Son Nhat", country: "Vietnam" },
  { code: "HAN", city: "Hanoi", name: "Noi Bai", country: "Vietnam" },
  { code: "DAD", city: "Da Nang", name: "Da Nang Intl", country: "Vietnam" },
  { code: "MNL", city: "Manila", name: "Ninoy Aquino Intl", country: "Philippines" },
  { code: "CEB", city: "Cebu", name: "Mactan-Cebu Intl", country: "Philippines" },
  { code: "REP", city: "Siem Reap", name: "Siem Reap-Angkor Intl", country: "Cambodia" },
  { code: "PNH", city: "Phnom Penh", name: "Techo Intl", country: "Cambodia" },
  { code: "RGN", city: "Yangon", name: "Yangon Intl", country: "Myanmar" },
  { code: "BWN", city: "Bandar Seri Begawan", name: "Brunei Intl", country: "Brunei" },
  // South Asia
  { code: "CMB", city: "Colombo", name: "Bandaranaike Intl", country: "Sri Lanka" },
  { code: "MLE", city: "Malé", name: "Velana Intl", country: "Maldives" },
  { code: "KTM", city: "Kathmandu", name: "Tribhuvan Intl", country: "Nepal" },
  { code: "DAC", city: "Dhaka", name: "Hazrat Shahjalal Intl", country: "Bangladesh" },
  // East Asia
  { code: "HKG", city: "Hong Kong", name: "Hong Kong Intl", country: "Hong Kong" },
  { code: "TPE", city: "Taipei", name: "Taoyuan Intl", country: "Taiwan" },
  { code: "NRT", city: "Tokyo", name: "Narita", country: "Japan" },
  { code: "HND", city: "Tokyo", name: "Haneda", country: "Japan" },
  { code: "KIX", city: "Osaka", name: "Kansai", country: "Japan" },
  { code: "ICN", city: "Seoul", name: "Incheon", country: "South Korea" },
  { code: "PVG", city: "Shanghai", name: "Pudong", country: "China" },
  { code: "PEK", city: "Beijing", name: "Capital", country: "China" },
  { code: "CAN", city: "Guangzhou", name: "Baiyun", country: "China" },
  // Middle East / long-haul hubs
  { code: "DXB", city: "Dubai", name: "Dubai Intl", country: "UAE" },
  { code: "AUH", city: "Abu Dhabi", name: "Zayed Intl", country: "UAE" },
  { code: "DOH", city: "Doha", name: "Hamad Intl", country: "Qatar" },
  { code: "LHR", city: "London", name: "Heathrow", country: "United Kingdom" },
  { code: "FRA", city: "Frankfurt", name: "Frankfurt", country: "Germany" },
  { code: "MUC", city: "Munich", name: "Munich", country: "Germany" },
  { code: "CDG", city: "Paris", name: "Charles de Gaulle", country: "France" },
  { code: "AMS", city: "Amsterdam", name: "Schiphol", country: "Netherlands" },
  { code: "SYD", city: "Sydney", name: "Kingsford Smith", country: "Australia" },
  { code: "MEL", city: "Melbourne", name: "Tullamarine", country: "Australia" },
  { code: "PER", city: "Perth", name: "Perth", country: "Australia" },
];

export const AIRPORT_COUNTRY: Record<string, string> = Object.fromEntries(
  AIRPORTS.map((a) => [a.code, a.country]),
);

export function airportLabel(code: string): string {
  const a = AIRPORTS.find((x) => x.code === code);
  return a ? `${a.city} (${a.code})` : code;
}
