import { describe, expect, it } from "vitest";
import { parseLocations, type ParseLocationsInput } from "../src/normalization/index.js";

interface Case {
  name: string;
  input: ParseLocationsInput;
  workplaceType: string;
  countryCodes: string[];
  regions: string[];
}

const c = (
  locations: string[],
  workplaceType: string,
  countryCodes: string[],
  regions: string[],
  extra: Partial<ParseLocationsInput> = {},
): Case => ({ name: `${JSON.stringify(locations)} ${JSON.stringify(extra)}`, input: { locations, ...extra }, workplaceType, countryCodes, regions });

const cases: Case[] = [
  c(["Remote"], "REMOTE", [], ["GLOBAL"]),
  c(["Remote - US"], "REMOTE", ["US"], ["US"]),
  c(["Remote (Europe)"], "REMOTE", [], ["EUROPE"]),
  c(["Remote, US"], "REMOTE", ["US"], ["US"]),
  c(["Remote US"], "REMOTE", ["US"], ["US"]),
  c(["Remote - India"], "REMOTE", ["IN"], ["INDIA"]),
  c(["Remote - EU"], "REMOTE", [], ["EUROPE"]),
  c(["Remote - North America"], "REMOTE", [], ["US", "OTHER"]),
  c(["Anywhere in the world"], "REMOTE", [], ["GLOBAL"]),
  c(["Worldwide"], "REMOTE", [], ["GLOBAL"]),
  c(["Work from home"], "REMOTE", [], ["GLOBAL"]),
  c(["Remote - Anywhere"], "REMOTE", [], ["GLOBAL"]),
  c(["Remote (Global)"], "REMOTE", [], ["GLOBAL"]),
  c(["San Francisco, CA"], "ONSITE", ["US"], ["US"]),
  c(["New York, NY, United States"], "ONSITE", ["US"], ["US"]),
  c(["Austin, TX"], "ONSITE", ["US"], ["US"]),
  c(["Washington, DC"], "ONSITE", ["US"], ["US"]),
  c(["Seattle"], "ONSITE", ["US"], ["US"]),
  c(["Portland, Oregon"], "ONSITE", ["US"], ["US"]),
  c(["Dublin, Ohio"], "ONSITE", ["US"], ["US"]),
  c(["Sunnyvale, CA, USA"], "ONSITE", ["US"], ["US"]),
  c(["Boston, MA, U.S."], "ONSITE", ["US"], ["US"]),
  c(["Bengaluru, Karnataka, India"], "ONSITE", ["IN"], ["INDIA"]),
  c(["Bangalore"], "ONSITE", ["IN"], ["INDIA"]),
  c(["Gurugram"], "ONSITE", ["IN"], ["INDIA"]),
  c(["Pune, IN"], "ONSITE", ["IN"], ["INDIA"]),
  c(["Hyderabad, Telangana"], "ONSITE", ["IN"], ["INDIA"]),
  c(["London, UK"], "ONSITE", ["GB"], ["EUROPE"]),
  c(["London, England, United Kingdom"], "ONSITE", ["GB"], ["EUROPE"]),
  c(["Berlin, Deutschland"], "ONSITE", ["DE"], ["EUROPE"]),
  c(["Amsterdam, Holland"], "ONSITE", ["NL"], ["EUROPE"]),
  c(["Zürich"], "ONSITE", ["CH"], ["EUROPE"]),
  c(["Kraków, Poland"], "ONSITE", ["PL"], ["EUROPE"]),
  c(["Belgrade, Serbia"], "ONSITE", ["RS"], ["EUROPE"]),
  c(["London, UK; Dublin, Ireland"], "ONSITE", ["GB", "IE"], ["EUROPE"]),
  c(["Berlin, Germany | Remote"], "REMOTE", ["DE"], ["EUROPE"]),
  c(["Berlin, Germany", "Remote"], "REMOTE", ["DE"], ["EUROPE"]),
  c(["Hybrid - Amsterdam"], "HYBRID", ["NL"], ["EUROPE"]),
  c(["Hybrid - Berlin", "Munich"], "HYBRID", ["DE"], ["EUROPE"]),
  c(["EMEA"], "UNKNOWN", [], ["EUROPE"]),
  c(["Europe"], "UNKNOWN", [], ["EUROPE"]),
  c(["APAC"], "UNKNOWN", [], ["OTHER"]),
  c(["Americas"], "UNKNOWN", [], ["US", "OTHER"]),
  c(["Toronto, Canada"], "ONSITE", ["CA"], ["OTHER"]),
  c(["Toronto, CA"], "ONSITE", ["CA"], ["OTHER"]),
  c(["London, Ontario"], "ONSITE", ["CA"], ["OTHER"]),
  c(["Singapore"], "ONSITE", ["SG"], ["OTHER"]),
  c(["Sydney, Australia"], "ONSITE", ["AU"], ["OTHER"]),
  c([""], "UNKNOWN", [], []),
  c([], "UNKNOWN", [], []),
  c(["   "], "UNKNOWN", [], []),
  c(["Remote - US"], "ONSITE", ["US"], ["US"], { workplaceTypeHint: "ONSITE" }),
  c(["San Francisco, CA"], "REMOTE", ["US"], ["US"], { workplaceTypeHint: "REMOTE" }),
  c(["Remote"], "HYBRID", [], [], { workplaceTypeHint: "HYBRID" }),
  c(["San Francisco, CA"], "HYBRID", ["US"], ["US"], { title: "Engineer (Hybrid)" }),
  c(["Austin, TX"], "REMOTE", ["US"], ["US"], { title: "Remote Backend Engineer" }),
  c([], "REMOTE", [], ["GLOBAL"], { title: "Remote Engineer" }),
  c(["San Francisco, CA", "Bengaluru, India"], "ONSITE", ["US", "IN"], ["US", "INDIA"]),
  c(["Remote - US", "Remote - India"], "REMOTE", ["US", "IN"], ["US", "INDIA"]),
  c(["Remote - US or Canada"], "REMOTE", ["US", "CA"], ["US", "OTHER"]),
  // Georgia is ambiguous: US only with a US context; a bare "Georgia" is left unresolved.
  c(["Atlanta, Georgia"], "ONSITE", ["US"], ["US"]),
  c(["Savannah, Georgia"], "ONSITE", ["US"], ["US"]),
  c(["Georgia, US"], "ONSITE", ["US"], ["US"]),
  c(["Georgia"], "UNKNOWN", [], []),
  c(["Tbilisi, Georgia"], "ONSITE", ["GE"], ["OTHER"]),
  c(["New Mexico"], "ONSITE", ["US"], ["US"]),
  c(["Mexico City, Mexico"], "ONSITE", ["MX"], ["OTHER"]),
];

describe("parseLocations", () => {
  it("has at least 40 table cases", () => {
    expect(cases.length).toBeGreaterThanOrEqual(40);
  });

  it.each(cases)("$name", ({ input, workplaceType, countryCodes, regions }) => {
    const out = parseLocations(input);
    expect(out.workplaceType).toBe(workplaceType);
    expect([...out.countryCodes].sort()).toEqual([...countryCodes].sort());
    expect(out.regions).toEqual(regions);
  });

  it("joins raw locations with ' | ' and returns '' when empty", () => {
    expect(parseLocations({ locations: ["London, UK", "Remote"] }).locationRaw).toBe("London, UK | Remote");
    expect(parseLocations({ locations: [] }).locationRaw).toBe("");
  });

  it("extracts city, region and countryCode per location", () => {
    expect(parseLocations({ locations: ["Bengaluru, Karnataka, India"] }).locations).toEqual([
      { raw: "Bengaluru, Karnataka, India", city: "Bengaluru", region: "Karnataka", countryCode: "IN" },
    ]);
    expect(parseLocations({ locations: ["Austin, TX"] }).locations).toEqual([
      { raw: "Austin, TX", city: "Austin", region: "TX", countryCode: "US" },
    ]);
    expect(parseLocations({ locations: ["Foo, Germany"] }).locations[0]).toMatchObject({ city: "Foo", countryCode: "DE" });
    expect(parseLocations({ locations: ["Remote"] }).locations).toEqual([{ raw: "Remote" }]);
  });

  it("splits ';' and '|' inside one string into separate locations", () => {
    const out = parseLocations({ locations: ["London, UK; Dublin, Ireland"] });
    expect(out.locations.map((l) => l.countryCode)).toEqual(["GB", "IE"]);
  });

  it("does not match country names inside other words or states", () => {
    expect(parseLocations({ locations: ["Indianapolis"] }).countryCodes).toEqual(["US"]);
    expect(parseLocations({ locations: ["Indiana"] }).countryCodes).toEqual(["US"]);
  });

  it("averages under 1ms per call", () => {
    const inputs = cases.map((x) => x.input);
    for (const i of inputs) parseLocations(i); // warm up
    const rounds = 20;
    const start = performance.now();
    for (let r = 0; r < rounds; r++) for (const i of inputs) parseLocations(i);
    const avg = (performance.now() - start) / (rounds * inputs.length);
    expect(avg).toBeLessThan(1);
  });
});
