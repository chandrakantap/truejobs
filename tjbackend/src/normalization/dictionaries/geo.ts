// Static geography dictionaries for the location parser. No network, no geocoding.
// Keys are lowercase and diacritic-free; the parser normalizes input the same way.

export type Region = "GLOBAL" | "US" | "EUROPE" | "INDIA" | "OTHER";

/** Countries in geographic Europe (includes the UK, CH, NO, IS, UA, RS, the Balkans, and RU/TR/CY). */
export const EUROPE_COUNTRY_CODES: ReadonlySet<string> = new Set([
  "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IS", "IE", "IT", "XK", "LV", "LI", "LT", "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO",
  "PL", "PT", "RO", "RU", "SM", "RS", "SK", "SI", "ES", "SE", "CH", "UA", "GB", "VA", "TR",
]);

export function regionForCountry(code: string): Region {
  if (code === "US") return "US";
  if (code === "IN") return "INDIA";
  return EUROPE_COUNTRY_CODES.has(code) ? "EUROPE" : "OTHER";
}

const code = (c: string, ...names: string[]): Array<[string, string]> => names.map((n) => [n, c]);

/** Country names and aliases. "georgia" is deliberately absent (ambiguous with the US state). */
export const COUNTRY_NAMES: ReadonlyMap<string, string> = new Map([
  ...code("US", "united states of america", "united states", "usa", "u.s.a.", "u.s.a", "u.s.", "u.s"),
  ...code("GB", "united kingdom", "uk", "u.k.", "u.k", "great britain", "britain", "england", "scotland", "wales", "northern ireland"),
  ...code("IN", "india"),
  ...code("DE", "germany", "deutschland"),
  ...code("NL", "netherlands", "the netherlands", "holland"),
  ...code("FR", "france"),
  ...code("ES", "spain", "espana"),
  ...code("PT", "portugal"),
  ...code("IE", "ireland", "republic of ireland"),
  ...code("IT", "italy", "italia"),
  ...code("CH", "switzerland"),
  ...code("AT", "austria"),
  ...code("BE", "belgium"),
  ...code("LU", "luxembourg"),
  ...code("SE", "sweden"),
  ...code("NO", "norway"),
  ...code("DK", "denmark"),
  ...code("FI", "finland"),
  ...code("IS", "iceland"),
  ...code("PL", "poland"),
  ...code("CZ", "czech republic", "czechia"),
  ...code("SK", "slovakia"),
  ...code("HU", "hungary"),
  ...code("RO", "romania"),
  ...code("BG", "bulgaria"),
  ...code("GR", "greece"),
  ...code("HR", "croatia"),
  ...code("SI", "slovenia"),
  ...code("RS", "serbia"),
  ...code("BA", "bosnia and herzegovina", "bosnia"),
  ...code("ME", "montenegro"),
  ...code("MK", "north macedonia", "macedonia"),
  ...code("AL", "albania"),
  ...code("XK", "kosovo"),
  ...code("EE", "estonia"),
  ...code("LV", "latvia"),
  ...code("LT", "lithuania"),
  ...code("UA", "ukraine"),
  ...code("BY", "belarus"),
  ...code("MD", "moldova"),
  ...code("MT", "malta"),
  ...code("CY", "cyprus"),
  ...code("RU", "russia"),
  ...code("TR", "turkey", "turkiye"),
  ...code("CA", "canada"),
  ...code("MX", "mexico"),
  ...code("BR", "brazil", "brasil"),
  ...code("AR", "argentina"),
  ...code("CL", "chile"),
  ...code("CO", "colombia"),
  ...code("PE", "peru"),
  ...code("UY", "uruguay"),
  ...code("CR", "costa rica"),
  ...code("AU", "australia"),
  ...code("NZ", "new zealand"),
  ...code("JP", "japan"),
  ...code("CN", "china"),
  ...code("HK", "hong kong"),
  ...code("TW", "taiwan"),
  ...code("KR", "south korea", "korea"),
  ...code("SG", "singapore"),
  ...code("MY", "malaysia"),
  ...code("ID", "indonesia"),
  ...code("TH", "thailand"),
  ...code("VN", "vietnam"),
  ...code("PH", "philippines"),
  ...code("PK", "pakistan"),
  ...code("BD", "bangladesh"),
  ...code("LK", "sri lanka"),
  ...code("NP", "nepal"),
  ...code("IL", "israel"),
  ...code("AE", "united arab emirates", "uae"),
  ...code("SA", "saudi arabia"),
  ...code("QA", "qatar"),
  ...code("EG", "egypt"),
  ...code("ZA", "south africa"),
  ...code("NG", "nigeria"),
  ...code("KE", "kenya"),
  ...code("GH", "ghana"),
  ...code("MA", "morocco"),
]);

/** Two-letter codes accepted when a location segment is exactly that code, e.g. "Remote - US". */
export const ISO_CODES: ReadonlyMap<string, string> = new Map([
  ...[...new Set(COUNTRY_NAMES.values())].map((c): [string, string] => [c, c]),
  ["UK", "GB"],
]);

export const US_STATE_NAMES: readonly string[] = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut", "delaware",
  "florida", "hawaii", "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
  "maine", "maryland", "massachusetts", "michigan", "minnesota", "mississippi", "missouri",
  "montana", "nebraska", "nevada", "new hampshire", "new jersey", "new mexico", "new york",
  "north carolina", "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania", "rhode island",
  "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont", "virginia",
  "washington", "west virginia", "wisconsin", "wyoming", "district of columbia", "d.c.",
];

/** "georgia" is handled separately: US only with a US context (see location.ts). */
export const GEORGIA = "georgia";

export const US_STATE_ABBREVIATIONS: ReadonlySet<string> = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "DC",
]);

/** Non-US states/provinces that disambiguate a location (e.g. "London, Ontario"). */
export const OTHER_SUBDIVISIONS: ReadonlyMap<string, string> = new Map([
  ...code("CA", "ontario", "british columbia", "quebec", "alberta", "nova scotia", "manitoba"),
  ...code("IN", "karnataka", "maharashtra", "telangana", "tamil nadu", "haryana", "uttar pradesh",
    "kerala", "west bengal", "gujarat", "rajasthan", "andhra pradesh", "punjab", "madhya pradesh"),
]);

const cities = (c: string, names: string[]): Array<[string, string]> => names.map((n) => [n, c]);

export const US_CITIES: readonly string[] = [
  "new york city", "new york", "nyc", "brooklyn", "manhattan", "jersey city", "san francisco", "los angeles", "seattle",
  "austin", "boston", "chicago", "denver", "atlanta", "washington", "dallas", "houston", "san diego",
  "san jose", "mountain view", "palo alto", "sunnyvale", "menlo park", "redwood city", "santa clara",
  "cupertino", "oakland", "fremont", "san mateo", "south san francisco", "portland", "miami",
  "philadelphia", "pittsburgh", "phoenix", "salt lake city", "minneapolis", "detroit", "nashville",
  "raleigh", "durham", "charlotte", "boulder", "las vegas", "orlando", "tampa", "baltimore",
  "columbus", "cleveland", "cincinnati", "indianapolis", "kansas city", "st. louis", "saint louis",
  "san antonio", "irvine", "santa monica", "culver city", "sacramento", "madison", "ann arbor",
  "boise", "honolulu", "albuquerque", "omaha", "milwaukee", "plano", "bellevue", "redmond", "kirkland",
  "provo", "pasadena", "santa barbara",
];

export const INDIA_CITIES: readonly string[] = [
  "bengaluru", "bangalore", "hyderabad", "pune", "chennai", "mumbai", "new delhi", "delhi",
  "gurgaon", "gurugram", "noida", "kolkata", "ahmedabad", "kochi", "jaipur", "chandigarh", "indore",
  "coimbatore", "thiruvananthapuram",
];

export const EUROPE_CITIES: ReadonlyMap<string, string> = new Map([
  ...cities("GB", ["london", "manchester", "birmingham", "edinburgh", "glasgow", "bristol", "leeds", "oxford", "belfast", "cardiff"]),
  ...cities("IE", ["dublin", "cork", "galway"]),
  ...cities("DE", ["berlin", "munich", "hamburg", "frankfurt", "cologne", "stuttgart", "dusseldorf", "leipzig", "dresden"]),
  ...cities("NL", ["amsterdam", "rotterdam", "the hague", "utrecht", "eindhoven"]),
  ...cities("FR", ["paris", "lyon", "marseille", "toulouse", "nantes"]),
  ...cities("ES", ["madrid", "barcelona", "valencia", "seville", "malaga"]),
  ...cities("PT", ["lisbon", "porto"]),
  ...cities("SE", ["stockholm", "gothenburg", "malmo"]),
  ...cities("DK", ["copenhagen", "aarhus"]),
  ...cities("NO", ["oslo", "bergen"]),
  ...cities("FI", ["helsinki", "tampere", "espoo"]),
  ...cities("PL", ["warsaw", "krakow", "wroclaw", "gdansk", "poznan"]),
  ...cities("CZ", ["prague", "brno"]),
  ...cities("AT", ["vienna"]),
  ...cities("CH", ["zurich", "geneva", "basel", "lausanne"]),
  ...cities("IT", ["milan", "rome", "turin"]),
  ...cities("BE", ["brussels", "antwerp", "ghent"]),
  ...cities("EE", ["tallinn", "tartu"]),
  ...cities("LV", ["riga"]),
  ...cities("LT", ["vilnius", "kaunas"]),
  ...cities("RO", ["bucharest", "cluj-napoca"]),
  ...cities("HU", ["budapest"]),
  ...cities("GR", ["athens", "thessaloniki"]),
  ...cities("BG", ["sofia"]),
  ...cities("RS", ["belgrade"]),
  ...cities("HR", ["zagreb"]),
  ...cities("SI", ["ljubljana"]),
  ...cities("SK", ["bratislava"]),
  ...cities("UA", ["kyiv", "kiev"]),
  ...cities("TR", ["istanbul"]),
  ...cities("IS", ["reykjavik"]),
  ...cities("MT", ["valletta"]),
]);

export const OTHER_CITIES: ReadonlyMap<string, string> = new Map([
  ...cities("CA", ["toronto", "vancouver", "montreal", "ottawa", "calgary"]),
  ...cities("AU", ["sydney", "melbourne", "brisbane"]),
  ...cities("NZ", ["auckland"]),
  ...cities("JP", ["tokyo"]),
  ...cities("KR", ["seoul"]),
  ...cities("CN", ["shanghai", "beijing", "shenzhen"]),
  ...cities("TW", ["taipei"]),
  ...cities("IL", ["tel aviv"]),
  ...cities("AE", ["dubai"]),
  ...cities("BR", ["sao paulo"]),
  ...cities("MX", ["mexico city"]),
  ...cities("AR", ["buenos aires"]),
  ...cities("CO", ["bogota"]),
  ...cities("GE", ["tbilisi"]),
  ...cities("NG", ["lagos"]),
  ...cities("KE", ["nairobi"]),
  ...cities("ZA", ["cape town"]),
  ...cities("PH", ["manila"]),
  ...cities("ID", ["jakarta"]),
  ...cities("TH", ["bangkok"]),
  ...cities("MY", ["kuala lumpur"]),
  ...cities("VN", ["hanoi", "ho chi minh city"]),
  ...cities("PK", ["karachi", "lahore"]),
  ...cities("BD", ["dhaka"]),
]);

export const CITIES: ReadonlyMap<string, string> = new Map([
  ...cities("US", [...US_CITIES]),
  ...cities("IN", [...INDIA_CITIES]),
  ...EUROPE_CITIES,
  ...OTHER_CITIES,
]);

/** Region words that carry no country. */
export const REGION_WORDS: ReadonlyMap<string, readonly Region[]> = new Map<string, readonly Region[]>([
  ["europe", ["EUROPE"]],
  ["european union", ["EUROPE"]],
  ["eu", ["EUROPE"]],
  ["emea", ["EUROPE"]],
  ["cet timezone", ["EUROPE"]],
  ["cet", ["EUROPE"]],
  ["north america", ["US", "OTHER"]],
  ["americas", ["US", "OTHER"]],
  ["apac", ["OTHER"]],
  ["asia", ["OTHER"]],
]);
