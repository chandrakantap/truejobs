import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import type {
  AtsType,
  CompanyStatus,
  CrawlRunStatus,
  EmploymentType,
  JobCategory,
  JobEventType,
  Prisma,
  PrismaClient,
  Region,
  SalaryPeriod,
  Seniority,
  WorkplaceType,
} from "../src/generated/prisma/client.js";
import { computeContentHash, htmlToText } from "../src/normalization/index.js";
import { createPrismaClient } from "../src/plugins/prisma.js";

/**
 * Deterministic, idempotent dev dataset (TRUEJOBS-8). Companies upsert by slug, sources by
 * (atsType, identifier), jobs by (careerSourceId, externalId); crawl runs, versions and events use
 * ids derived from stable names, so re-running updates rows in place and never duplicates them.
 * Dates are relative to `now`, so a re-run refreshes the ages.
 */

const HOUR = 3600_000;

/** Stable UUID-shaped id derived from a name. */
function seedId(name: string): string {
  const h = createHash("sha1").update(name).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** `<slugified-title>-<company-slug>-<8 hex of sha1(sourceId+externalId)>`; TRUEJOBS-14 replaces this. */
function jobSlug(title: string, companySlug: string, sourceId: string, externalId: string): string {
  const hash = createHash("sha1").update(sourceId + externalId).digest("hex").slice(0, 8);
  return `${slugify(title)}-${companySlug}-${hash}`;
}

interface CompanySpec {
  slug: string;
  name: string;
  websiteUrl: string;
  hqLocation: string;
  description: string;
  status: CompanyStatus;
  atsType: AtsType;
  identifier: string;
  config?: Prisma.InputJsonValue;
}

const COMPANIES: CompanySpec[] = [
  { slug: "stripe", name: "Stripe", websiteUrl: "https://stripe.com", hqLocation: "San Francisco, US", description: "Payments infrastructure for the internet.", status: "ACTIVE", atsType: "GREENHOUSE", identifier: "stripe" },
  { slug: "vercel", name: "Vercel", websiteUrl: "https://vercel.com", hqLocation: "San Francisco, US", description: "The frontend cloud behind Next.js.", status: "ACTIVE", atsType: "ASHBY", identifier: "vercel" },
  { slug: "exampleai", name: "Example AI", websiteUrl: "https://exampleai.example.com", hqLocation: "San Francisco, US", description: "Applied AI research and products.", status: "ACTIVE", atsType: "GREENHOUSE", identifier: "exampleai" },
  { slug: "datadog", name: "Datadog", websiteUrl: "https://www.datadoghq.com", hqLocation: "New York, US", description: "Observability and security platform for cloud applications.", status: "ACTIVE", atsType: "GREENHOUSE", identifier: "datadog" },
  { slug: "razorpay", name: "Razorpay", websiteUrl: "https://razorpay.com", hqLocation: "Bengaluru, India", description: "Payments and banking for Indian businesses.", status: "ACTIVE", atsType: "LEVER", identifier: "razorpay" },
  {
    slug: "shopify", name: "Shopify", websiteUrl: "https://www.shopify.com", hqLocation: "Ottawa, Canada", description: "Commerce platform for merchants of every size.", status: "ACTIVE",
    atsType: "WORKDAY", identifier: "shopify/External", config: { host: "shopify.wd1.myworkdayjobs.com", tenant: "shopify", site: "External" },
  },
  { slug: "notion", name: "Notion", websiteUrl: "https://www.notion.so", hqLocation: "San Francisco, US", description: "Connected workspace for docs, wikis and projects.", status: "PAUSED", atsType: "ASHBY", identifier: "notion" },
  { slug: "gitlab", name: "GitLab", websiteUrl: "https://about.gitlab.com", hqLocation: "Remote", description: "The DevSecOps platform, built all-remote.", status: "ACTIVE", atsType: "GREENHOUSE", identifier: "gitlab" },
  { slug: "archived-co", name: "Archived Co", websiteUrl: "https://archived.example.com", hqLocation: "Remote", description: "Former customer kept for visibility-rule tests.", status: "ARCHIVED", atsType: "GREENHOUSE", identifier: "archivedco" },
];

type Salary = [min: number, max: number, currency: string, period: SalaryPeriod];

interface JobSpec {
  co: string;
  title: string;
  category: JobCategory;
  seniority: Seniority;
  workplace: WorkplaceType;
  regions: Region[];
  countries: string[];
  location: string;
  tags: string[];
  salary?: Salary;
  employment?: EmploymentType;
  /** Hours since firstSeenAt. */
  age: number;
  /** Hours since closedAt; makes the job CLOSED. */
  closedAge?: number;
  hidden?: boolean;
  /** Hours-ago of each later version (v2, v3), oldest first. */
  versionAges?: number[];
  /** Title of the closed job (same company) this one reposts. */
  repostOf?: string;
}

const r = (
  co: string, title: string, category: JobCategory, seniority: Seniority, workplace: WorkplaceType,
  regions: Region[], countries: string[], location: string, tags: string[], age: number,
  extra: Partial<JobSpec> = {},
): JobSpec => ({ co, title, category, seniority, workplace, regions, countries, location, tags, age, ...extra });

const JOBS: JobSpec[] = [
  r("stripe", "Senior Backend Engineer", "BACKEND", "SENIOR", "REMOTE", ["US"], ["US"], "Remote - US", ["Java", "Distributed Systems", "Payments"], 600, { salary: [170_000, 230_000, "USD", "YEAR"], versionAges: [400, 120] }),
  r("stripe", "Staff Payments Engineer", "BACKEND", "STAFF", "HYBRID", ["US"], ["US"], "San Francisco, US", ["Java", "Kotlin", "Payments"], 200, { salary: [210_000, 290_000, "USD", "YEAR"] }),
  r("stripe", "Security Engineer, Fraud", "SECURITY", "MID", "HYBRID", ["US"], ["US"], "Seattle, US", ["Python", "Fraud", "Security"], 100, { salary: [150_000, 200_000, "USD", "YEAR"] }),
  r("stripe", "Account Executive, Enterprise", "NON_ENGINEERING", "MID", "ONSITE", ["US"], ["US"], "New York, US", ["Sales"], 60),
  r("stripe", "Backend Engineer Intern", "BACKEND", "INTERN", "HYBRID", ["US"], ["US"], "Seattle, US", ["Java", "SQL"], 400, { salary: [50, 60, "USD", "HOUR"], employment: "INTERNSHIP" }),
  r("vercel", "Full Stack Engineer", "FULLSTACK", "MID", "REMOTE", ["GLOBAL"], [], "Remote - Global", ["TypeScript", "Node.js", "React", "Next.js"], 12, { salary: [140_000, 190_000, "USD", "YEAR"] }),
  r("vercel", "Frontend Engineer, Design Systems", "FRONTEND", "JUNIOR", "REMOTE", ["GLOBAL"], [], "Remote - Global", ["React", "CSS", "Accessibility"], 30, { salary: [110_000, 140_000, "USD", "YEAR"] }),
  r("vercel", "Developer Advocate", "NON_ENGINEERING", "UNKNOWN", "REMOTE", ["GLOBAL"], [], "Remote - Global", ["DevRel"], 700),
  r("vercel", "Mobile Engineer, iOS", "MOBILE", "SENIOR", "REMOTE", ["US", "EUROPE"], ["US", "DE"], "Remote - US / EU", ["Swift", "iOS"], 300, { salary: [160_000, 210_000, "USD", "YEAR"], closedAge: 100 }),
  r("exampleai", "AI/ML Engineer", "ML_AI", "SENIOR", "ONSITE", ["US"], ["US"], "San Francisco, US", ["Python", "PyTorch", "LLM"], 8, { salary: [200_000, 300_000, "USD", "YEAR"] }),
  r("exampleai", "Research Engineer, LLM Evaluation", "ML_AI", "STAFF", "HYBRID", ["US"], ["US"], "San Francisco, US", ["Python", "Evals", "LLM"], 150, { salary: [250_000, 350_000, "USD", "YEAR"] }),
  r("exampleai", "Data Engineer", "DATA_ENGINEERING", "MID", "HYBRID", ["US"], ["US"], "San Francisco, US", ["Spark", "Airflow", "SQL"], 20, { salary: [150_000, 190_000, "USD", "YEAR"] }),
  r("exampleai", "Principal Engineer, Inference", "OTHER_ENGINEERING", "PRINCIPAL", "REMOTE", ["US"], ["US"], "Remote - US", ["C++", "CUDA", "Inference"], 500, { salary: [300_000, 400_000, "USD", "YEAR"] }),
  r("exampleai", "Recruiting Coordinator", "NON_ENGINEERING", "JUNIOR", "ONSITE", ["US"], ["US"], "San Francisco, US", ["Recruiting"], 90, { closedAge: 40 }),
  r("datadog", "Site Reliability Engineer", "DEVOPS_SRE", "MID", "HYBRID", ["EUROPE"], ["IE"], "Dublin, Europe", ["Kubernetes", "Go", "Observability"], 40, { salary: [80_000, 110_000, "EUR", "YEAR"] }),
  r("datadog", "Senior QA Engineer", "QA", "SENIOR", "HYBRID", ["EUROPE"], ["FR"], "Paris, Europe", ["Playwright", "TypeScript"], 220, { salary: [70_000, 95_000, "EUR", "YEAR"] }),
  r("datadog", "Embedded Software Engineer", "EMBEDDED", "SENIOR", "ONSITE", ["EUROPE"], ["NL"], "Amsterdam, Europe", ["C", "Rust", "Firmware"], 800, { salary: [85_000, 115_000, "EUR", "YEAR"], closedAge: 400 }),
  r("datadog", "Director of Engineering, Metrics", "ENGINEERING_MANAGEMENT", "DIRECTOR", "HYBRID", ["EUROPE"], ["FR"], "Paris, Europe", ["Leadership", "Go"], 350),
  r("datadog", "Platform Engineer (Contract)", "DEVOPS_SRE", "UNKNOWN", "UNKNOWN", ["OTHER"], ["SG"], "Singapore", ["Terraform", "AWS"], 18, { employment: "CONTRACT" }),
  r("razorpay", "Node.js Backend Engineer", "BACKEND", "MID", "HYBRID", ["INDIA"], ["IN"], "Bengaluru, India", ["Node.js", "TypeScript", "Microservices"], 3, { salary: [3_000_000, 5_500_000, "INR", "YEAR"] }),
  r("razorpay", "Senior Frontend Engineer", "FRONTEND", "SENIOR", "HYBRID", ["INDIA"], ["IN"], "Bengaluru, India", ["React", "TypeScript"], 9, { salary: [3_500_000, 6_000_000, "INR", "YEAR"] }),
  r("razorpay", "Engineering Manager, Payments Core", "ENGINEERING_MANAGEMENT", "MANAGER", "HYBRID", ["INDIA"], ["IN"], "Bengaluru, India", ["Java", "Leadership"], 260, { salary: [6_000_000, 9_000_000, "INR", "YEAR"] }),
  r("razorpay", "Android Engineer", "MOBILE", "JUNIOR", "ONSITE", ["INDIA"], ["IN"], "Bengaluru, India", ["Kotlin", "Android"], 70, { salary: [1_800_000, 2_800_000, "INR", "YEAR"] }),
  r("razorpay", "Software Engineer in Test", "QA", "MID", "ONSITE", ["INDIA"], ["IN"], "Pune, India", ["Java", "Selenium"], 500, { closedAge: 200 }),
  r("shopify", "Staff Platform Engineer", "DEVOPS_SRE", "STAFF", "REMOTE", ["EUROPE"], [], "Remote - Europe", ["Ruby", "Kubernetes", "Platform"], 500, { salary: [120_000, 170_000, "EUR", "YEAR"], versionAges: [200] }),
  r("shopify", "Senior Data Engineer", "DATA_ENGINEERING", "SENIOR", "REMOTE", ["EUROPE"], [], "Remote - Europe", ["Python", "dbt", "BigQuery"], 48, { salary: [110_000, 150_000, "EUR", "YEAR"] }),
  r("shopify", "Senior Full Stack Engineer, Checkout", "FULLSTACK", "SENIOR", "REMOTE", ["GLOBAL"], [], "Remote - Global", ["Ruby", "React", "GraphQL"], 600, { salary: [150_000, 200_000, "USD", "YEAR"] }),
  r("shopify", "Application Security Engineer", "SECURITY", "SENIOR", "REMOTE", ["US", "EUROPE"], [], "Remote - US / EU", ["AppSec", "Ruby"], 55, { hidden: true }),
  r("shopify", "Junior Developer, Storefront", "FRONTEND", "JUNIOR", "HYBRID", ["EUROPE"], ["DE"], "Berlin, Europe", ["Liquid", "JavaScript"], 140, { salary: [55_000, 70_000, "EUR", "YEAR"] }),
  r("notion", "Senior Frontend Engineer", "FRONTEND", "SENIOR", "HYBRID", ["US"], ["US"], "New York, US", ["React", "TypeScript", "Performance"], 35, { salary: [150_000, 200_000, "USD", "YEAR"] }),
  r("notion", "Staff Engineer, Performance", "OTHER_ENGINEERING", "STAFF", "HYBRID", ["US"], ["US"], "New York, US", ["Rust", "Performance"], 160, { salary: [220_000, 280_000, "USD", "YEAR"] }),
  r("notion", "Mobile Engineer, Android", "MOBILE", "MID", "HYBRID", ["US"], ["US"], "New York, US", ["Kotlin", "Android"], 900, { salary: [160_000, 200_000, "USD", "YEAR"], closedAge: 400 }),
  r("notion", "Mobile Engineer, Android", "MOBILE", "MID", "HYBRID", ["US"], ["US"], "New York, US", ["Kotlin", "Android"], 60, { salary: [165_000, 205_000, "USD", "YEAR"], repostOf: "Mobile Engineer, Android" }),
  r("notion", "Data Engineer", "DATA_ENGINEERING", "MID", "HYBRID", ["US"], ["US"], "San Francisco, US", ["Spark", "Snowflake"], 75, { salary: [150_000, 190_000, "USD", "YEAR"] }),
  r("gitlab", "Engineering Manager, Backend", "ENGINEERING_MANAGEMENT", "MANAGER", "REMOTE", ["GLOBAL"], [], "Remote - Global", ["Ruby", "Go", "Leadership"], 26),
  r("gitlab", "Senior Backend Engineer, Gitaly", "BACKEND", "SENIOR", "REMOTE", ["GLOBAL"], [], "Remote - Global", ["Go", "Git"], 4, { salary: [120_000, 160_000, "USD", "YEAR"] }),
  r("gitlab", "Frontend Engineer, Pipeline UI", "FRONTEND", "MID", "REMOTE", ["GLOBAL"], [], "Remote - Global", ["Vue", "JavaScript"], 1000, { salary: [100_000, 140_000, "USD", "YEAR"] }),
  r("gitlab", "Security Research Intern", "SECURITY", "INTERN", "REMOTE", ["GLOBAL"], [], "Remote - Global", ["Security", "Python"], 50, { salary: [3_000, 3_500, "USD", "MONTH"], employment: "INTERNSHIP" }),
  r("archived-co", "Backend Engineer", "BACKEND", "MID", "REMOTE", ["US"], ["US"], "Remote - US", ["Python", "Django"], 300, { salary: [120_000, 150_000, "USD", "YEAR"] }),
  r("archived-co", "Full Stack Engineer", "FULLSTACK", "SENIOR", "REMOTE", ["US"], ["US"], "Remote - US", ["TypeScript", "Postgres"], 280, { salary: [140_000, 180_000, "USD", "YEAR"] }),
];

const SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", INR: "₹" };

function salaryRaw([min, max, currency, period]: Salary): string {
  const sym = SYMBOLS[currency] ?? "";
  const fmt = (n: number): string => {
    if (currency === "INR") return `${n / 100_000}L`;
    if (period === "YEAR") return `${n / 1000}K`;
    return n.toLocaleString("en-US");
  };
  const suffix = period === "HOUR" ? "/hr" : period === "MONTH" ? "/mo" : "";
  return `${sym}${fmt(min)}–${sym}${fmt(max)}${suffix}`;
}

interface Snapshot {
  descriptionHtml: string;
  capturedAt: Date;
}

function descriptionFor(spec: JobSpec, companyName: string, revision: number): string {
  const intro = `<p>${companyName} is hiring a ${spec.title} (${spec.location}). You will work with ${spec.tags.join(", ")} alongside a small, senior team.</p>`;
  const reqs = `<h3>Requirements</h3><ul>${spec.tags.map((t) => `<li>Hands-on experience with ${t}</li>`).join("")}</ul>`;
  const updates = ["", "<p>Updated: this role now includes on-call participation.</p>", "<p>Updated: this role now includes on-call participation and mentoring.</p>"];
  return intro + reqs + (updates[revision] ?? "");
}

const CRAWLER_VERSION = "seed";

export interface SeedSummary {
  companies: number;
  careerSources: number;
  jobs: number;
  jobVersions: number;
  jobEvents: number;
  crawlRuns: number;
}

export async function runSeed(prisma: PrismaClient, now: Date = new Date()): Promise<SeedSummary> {
  const ago = (hours: number): Date => new Date(now.getTime() - hours * HOUR);
  const summary: SeedSummary = { companies: 0, careerSources: 0, jobs: 0, jobVersions: 0, jobEvents: 0, crawlRuns: 0 };

  const sources = new Map<string, { id: string; companyId: string; company: CompanySpec }>();
  for (const spec of COMPANIES) {
    const company = await prisma.company.upsert({
      where: { slug: spec.slug },
      create: { slug: spec.slug, name: spec.name, websiteUrl: spec.websiteUrl, hqLocation: spec.hqLocation, description: spec.description, status: spec.status },
      update: { name: spec.name, websiteUrl: spec.websiteUrl, hqLocation: spec.hqLocation, description: spec.description, status: spec.status },
    });
    summary.companies++;

    const lastRunAt = ago(2);
    const sourceData = {
      companyId: company.id,
      config: spec.config ?? {},
      careersPageUrl: `${spec.websiteUrl}/careers`,
      isEnabled: false, // a local crawler must not hit real ATSs unless an admin enables the source
      crawlIntervalMinutes: 360,
      nextCrawlAt: new Date(lastRunAt.getTime() + 360 * 60_000),
      lastCrawlAt: lastRunAt,
      lastSuccessAt: lastRunAt,
      lastRunStatus: "SUCCEEDED" as CrawlRunStatus,
      lastError: null,
      consecutiveFailures: 0,
    };
    const source = await prisma.careerSource.upsert({
      where: { atsType_identifier: { atsType: spec.atsType, identifier: spec.identifier } },
      create: { id: seedId(`source:${spec.atsType}:${spec.identifier}`), atsType: spec.atsType, identifier: spec.identifier, ...sourceData },
      update: sourceData,
    });
    summary.careerSources++;
    sources.set(spec.slug, { id: source.id, companyId: company.id, company: spec });

    // Three runs per source: success, then a failure (one source times out instead), then success.
    const middle: CrawlRunStatus = spec.slug === "datadog" ? "TIMED_OUT" : "FAILED";
    const runs: { status: CrawlRunStatus; startedAgo: number }[] = [
      { status: "SUCCEEDED", startedAgo: 50 },
      { status: middle, startedAgo: 26 },
      { status: "SUCCEEDED", startedAgo: 2 },
    ];
    for (const [i, run] of runs.entries()) {
      const startedAt = ago(run.startedAgo);
      const ok = run.status === "SUCCEEDED";
      const data: Prisma.CrawlRunUncheckedCreateInput = {
        careerSourceId: source.id,
        status: run.status,
        workerId: "seed-worker",
        crawlerVersion: CRAWLER_VERSION,
        startedAt,
        leaseExpiresAt: new Date(startedAt.getTime() + 15 * 60_000),
        finishedAt: new Date(startedAt.getTime() + (run.status === "TIMED_OUT" ? 15 * 60_000 : 90_000)),
        isCompleteSnapshot: ok ? true : null,
        jobsReceived: ok ? 12 : 0,
        errorMessage: run.status === "FAILED" ? "HTTP 503 from ATS endpoint after 3 retries" : run.status === "TIMED_OUT" ? "Run exceeded its lease without a heartbeat" : null,
      };
      await prisma.crawlRun.upsert({ where: { id: seedId(`run:${spec.slug}:${i}`) }, create: { id: seedId(`run:${spec.slug}:${i}`), ...data }, update: data });
      summary.crawlRuns++;
    }
  }

  const jobIds = new Map<string, string>(); // `${co}|${title}` of closed jobs -> id, for reposts
  for (const [index, spec] of JOBS.entries()) {
    const src = sources.get(spec.co);
    if (!src) throw new Error(`unknown company ${spec.co}`);
    const { company } = src;
    const externalId = String(4000 + index);
    const firstSeenAt = ago(spec.age);
    const closedAt = spec.closedAge !== undefined ? ago(spec.closedAge) : null;
    const isClosed = closedAt !== null;

    // Snapshot per version, oldest first. Later versions change the description; earlier ones carry a
    // lower salary, so the last version changes it and matches the job row.
    const snapshots: Snapshot[] = [{ descriptionHtml: descriptionFor(spec, company.name, 0), capturedAt: firstSeenAt }];
    for (const [i, versionAge] of (spec.versionAges ?? []).entries()) {
      snapshots.push({ descriptionHtml: descriptionFor(spec, company.name, i + 1), capturedAt: ago(versionAge) });
    }
    const snapshotSalary = (idx: number): Salary | undefined => {
      const s = spec.salary;
      if (!s || idx === snapshots.length - 1) return s;
      return [Math.round(s[0] * 0.94), Math.round(s[1] * 0.94), s[2], s[3]];
    };
    const current = snapshots[snapshots.length - 1]!;
    const descriptionText = htmlToText(current.descriptionHtml);
    const hashOf = (idx: number): string => {
      const s = snapshots[idx]!;
      const sal = snapshotSalary(idx);
      return computeContentHash({
        title: spec.title,
        descriptionText: htmlToText(s.descriptionHtml),
        locationRaw: spec.location,
        salaryMin: sal?.[0], salaryMax: sal?.[1], salaryCurrency: sal?.[2], salaryPeriod: sal?.[3],
      });
    };

    let repostOfJobId: string | null = null;
    if (spec.repostOf) {
      repostOfJobId = jobIds.get(`${spec.co}|${spec.repostOf}`) ?? null;
      if (!repostOfJobId) throw new Error(`repost target ${spec.repostOf} must be listed before its repost`);
    }

    const sal = spec.salary;
    const data = {
      slug: jobSlug(spec.title, spec.co, src.id, externalId),
      companyId: src.companyId,
      status: isClosed ? ("CLOSED" as const) : ("ACTIVE" as const),
      isHidden: spec.hidden ?? false,
      hiddenReason: spec.hidden ? "Hidden by admin: duplicate of another listing" : null,
      repostOfJobId,
      title: spec.title,
      normalizedTitle: spec.title.toLowerCase(),
      descriptionHtml: current.descriptionHtml,
      descriptionText,
      applyUrl: applyUrl(company, externalId),
      sourceUrl: `${company.websiteUrl}/careers`,
      department: spec.category === "NON_ENGINEERING" ? "Business" : "Engineering",
      locationRaw: spec.location,
      locations: [spec.location],
      countryCodes: spec.countries,
      regions: spec.regions,
      workplaceType: spec.workplace,
      employmentType: spec.employment ?? "FULL_TIME",
      seniority: spec.seniority,
      category: spec.category,
      techTags: spec.tags.map((t) => t.toLowerCase()),
      salaryMin: sal?.[0] ?? null,
      salaryMax: sal?.[1] ?? null,
      salaryCurrency: sal?.[2] ?? null,
      salaryPeriod: sal?.[3] ?? null,
      salaryRaw: sal ? salaryRaw(sal) : null,
      postedAt: firstSeenAt,
      firstSeenAt,
      lastSeenAt: closedAt ? new Date(closedAt.getTime() - 6 * HOUR) : ago(Math.min(2, spec.age)),
      closedAt,
      consecutiveMisses: isClosed ? 3 : 0,
      contentHash: hashOf(snapshots.length - 1),
      versionCount: snapshots.length,
      normalizerVersion: 0,
      rawPayload: { seed: true },
    };
    const job = await prisma.job.upsert({
      where: { careerSourceId_externalId: { careerSourceId: src.id, externalId } },
      create: { id: seedId(`job:${spec.co}:${externalId}`), careerSourceId: src.id, externalId, ...data },
      update: data,
    });
    summary.jobs++;
    if (isClosed) jobIds.set(`${spec.co}|${spec.title}`, job.id);

    for (const [i, snap] of snapshots.entries()) {
      const sv = snapshotSalary(i);
      const vdata = {
        contentHash: hashOf(i),
        title: spec.title,
        descriptionHtml: snap.descriptionHtml,
        locationRaw: spec.location,
        salaryMin: sv?.[0] ?? null,
        salaryMax: sv?.[1] ?? null,
        salaryCurrency: sv?.[2] ?? null,
        salaryPeriod: sv?.[3] ?? null,
        salaryRaw: sv ? salaryRaw(sv) : null,
        capturedAt: snap.capturedAt,
      };
      await prisma.jobVersion.upsert({
        where: { jobId_versionNumber: { jobId: job.id, versionNumber: i + 1 } },
        create: { id: seedId(`version:${job.id}:${i + 1}`), jobId: job.id, versionNumber: i + 1, ...vdata },
        update: vdata,
      });
      summary.jobVersions++;
    }

    const events: { type: JobEventType; occurredAt: Date; data?: Prisma.InputJsonValue }[] = [
      { type: "FIRST_SEEN", occurredAt: firstSeenAt },
    ];
    if (repostOfJobId) events.push({ type: "REPOSTED", occurredAt: firstSeenAt, data: { repostOfJobId } });
    for (let i = 1; i < snapshots.length; i++) {
      const at = snapshots[i]!.capturedAt;
      events.push({ type: "DESCRIPTION_CHANGED", occurredAt: at, data: { fromVersion: i, toVersion: i + 1 } });
      if (hashSalary(snapshotSalary(i)) !== hashSalary(snapshotSalary(i - 1))) {
        events.push({ type: "SALARY_CHANGED", occurredAt: at, data: { fromVersion: i, toVersion: i + 1 } });
      }
    }
    if (closedAt) events.push({ type: "CLOSED", occurredAt: closedAt });
    for (const [i, ev] of events.entries()) {
      const id = seedId(`event:${job.id}:${i}`);
      const edata = { jobId: job.id, type: ev.type, occurredAt: ev.occurredAt, data: ev.data ?? {} };
      await prisma.jobEvent.upsert({ where: { id }, create: { id, ...edata }, update: edata });
      summary.jobEvents++;
    }
  }

  return summary;
}

function hashSalary(s: Salary | undefined): string {
  return JSON.stringify(s ?? null);
}

function applyUrl(company: CompanySpec, externalId: string): string {
  switch (company.atsType) {
    case "ASHBY":
      return `https://jobs.ashbyhq.com/${company.identifier}/${externalId}`;
    case "LEVER":
      return `https://jobs.lever.co/${company.identifier}/${externalId}`;
    case "WORKDAY": {
      const cfg = company.config as { host: string; site: string };
      return `https://${cfg.host}/${cfg.site}/job/${externalId}`;
    }
    default:
      return `https://boards.greenhouse.io/${company.identifier}/jobs/${externalId}`;
  }
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const prisma = createPrismaClient(url);
  try {
    const summary = await runSeed(prisma);
    console.log("Seeded:", summary);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
