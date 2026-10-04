export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary?: string;
  seniority: "Junior" | "Mid" | "Senior" | "Staff" | "Manager";
  tags: string[];
  ats: string;
  applyUrl: string;
  careersUrl: string;
  firstSeen: string; // ISO
  lastVerified: string; // ISO
  description: string;
  requirements: string[];
};

const hoursAgo = (h: number) =>
  new Date(Date.now() - h * 3600_000).toISOString();

// In-memory seed data standing in for the discovery/normalization pipeline.
const JOBS: Job[] = [
  {
    id: "senior-backend-engineer-stripe",
    title: "Senior Backend Engineer",
    company: "Stripe",
    location: "Remote - US",
    remote: true,
    salary: "$170K–$230K",
    seniority: "Senior",
    tags: ["Java", "Distributed Systems", "Payments"],
    ats: "Greenhouse",
    applyUrl: "https://boards.greenhouse.io/stripe",
    careersUrl: "https://stripe.com/jobs",
    firstSeen: hoursAgo(5),
    lastVerified: hoursAgo(0.3),
    description:
      "Build and scale the services that move money for millions of businesses. You will design APIs, own reliability, and work across teams on high-throughput systems.",
    requirements: [
      "5+ years building backend services",
      "Strong Java, Kotlin or Scala experience",
      "Experience with distributed systems and databases",
    ],
  },
  {
    id: "fullstack-engineer-vercel",
    title: "Full Stack Engineer",
    company: "Vercel",
    location: "Remote - Global",
    remote: true,
    salary: "$140K–$190K",
    seniority: "Mid",
    tags: ["TypeScript", "Node.js", "React", "Next.js"],
    ats: "Ashby",
    applyUrl: "https://jobs.ashbyhq.com/vercel",
    careersUrl: "https://vercel.com/careers",
    firstSeen: hoursAgo(20),
    lastVerified: hoursAgo(1),
    description:
      "Ship product features end to end across the dashboard and platform APIs used by millions of developers.",
    requirements: [
      "3+ years with TypeScript and React",
      "Comfortable owning features from design to production",
      "Node.js backend experience",
    ],
  },
  {
    id: "ml-engineer-example-ai",
    title: "AI/ML Engineer",
    company: "Example AI",
    location: "San Francisco, US",
    remote: false,
    salary: "$200K–$300K",
    seniority: "Senior",
    tags: ["Python", "PyTorch", "LLM"],
    ats: "Greenhouse",
    applyUrl: "https://boards.greenhouse.io/example",
    careersUrl: "https://example.com/careers",
    firstSeen: hoursAgo(30),
    lastVerified: hoursAgo(2),
    description:
      "Train, evaluate and deploy large language model systems. Work with researchers to turn prototypes into reliable production services.",
    requirements: [
      "Strong Python and PyTorch",
      "Experience with LLM evaluation or serving",
      "Production ML experience",
    ],
  },
  {
    id: "sre-datadog",
    title: "Site Reliability Engineer",
    company: "Datadog",
    location: "Dublin, Europe",
    remote: false,
    seniority: "Mid",
    tags: ["Kubernetes", "Go", "Observability"],
    ats: "Lever",
    applyUrl: "https://jobs.lever.co/datadog",
    careersUrl: "https://careers.datadoghq.com",
    firstSeen: hoursAgo(52),
    lastVerified: hoursAgo(3),
    description:
      "Keep a global observability platform reliable. Define SLOs, automate operations and lead incident response.",
    requirements: [
      "Kubernetes in production",
      "Go or Python scripting",
      "On-call and incident management experience",
    ],
  },
  {
    id: "node-engineer-razorpay",
    title: "Node.js Backend Engineer",
    company: "Razorpay",
    location: "Bengaluru, India",
    remote: false,
    salary: "₹30L–₹55L",
    seniority: "Mid",
    tags: ["Node.js", "TypeScript", "Microservices"],
    ats: "Lever",
    applyUrl: "https://jobs.lever.co/razorpay",
    careersUrl: "https://razorpay.com/jobs",
    firstSeen: hoursAgo(75),
    lastVerified: hoursAgo(4),
    description:
      "Build payment infrastructure APIs handling billions in volume with a focus on correctness and latency.",
    requirements: [
      "3+ years with Node.js",
      "Experience with microservices and message queues",
      "Solid SQL knowledge",
    ],
  },
  {
    id: "staff-platform-engineer-shopify",
    title: "Staff Platform Engineer",
    company: "Shopify",
    location: "Remote - Europe",
    remote: true,
    salary: "€120K–€170K",
    seniority: "Staff",
    tags: ["Ruby", "Kubernetes", "Platform"],
    ats: "Workday",
    applyUrl: "https://shopify.wd1.myworkdayjobs.com/",
    careersUrl: "https://www.shopify.com/careers",
    firstSeen: hoursAgo(120),
    lastVerified: hoursAgo(6),
    description:
      "Lead the internal developer platform that thousands of engineers rely on to ship safely and quickly.",
    requirements: [
      "8+ years of engineering experience",
      "Platform or infrastructure leadership",
      "Strong cross-team communication",
    ],
  },
  {
    id: "frontend-engineer-notion",
    title: "Frontend Engineer",
    company: "Notion",
    location: "New York, US",
    remote: false,
    salary: "$150K–$200K",
    seniority: "Senior",
    tags: ["React", "TypeScript", "Performance"],
    ats: "Greenhouse",
    applyUrl: "https://boards.greenhouse.io/notion",
    careersUrl: "https://www.notion.so/careers",
    firstSeen: hoursAgo(150),
    lastVerified: hoursAgo(8),
    description:
      "Craft fast, delightful editor and collaboration experiences used by millions.",
    requirements: [
      "5+ years frontend experience",
      "Deep React and TypeScript knowledge",
      "Eye for performance and accessibility",
    ],
  },
  {
    id: "engineering-manager-gitlab",
    title: "Engineering Manager, Backend",
    company: "GitLab",
    location: "Remote - Global",
    remote: true,
    seniority: "Manager",
    tags: ["Ruby", "Go", "Leadership"],
    ats: "Greenhouse",
    applyUrl: "https://boards.greenhouse.io/gitlab",
    careersUrl: "https://about.gitlab.com/jobs",
    firstSeen: hoursAgo(200),
    lastVerified: hoursAgo(10),
    description:
      "Manage a distributed backend team, grow engineers and partner with product to deliver roadmap.",
    requirements: [
      "2+ years managing engineers",
      "Backend background in Ruby, Go or similar",
      "Experience with remote-first teams",
    ],
  },
];

export type SearchParams = {
  q?: string;
  location?: string;
  remote?: boolean;
  seniority?: string;
  days?: number;
};

export function searchJobs(p: SearchParams = {}): Job[] {
  const terms = (p.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const loc = (p.location ?? "").toLowerCase().trim();
  const cutoff = p.days ? Date.now() - p.days * 86400_000 : 0;
  return JOBS.filter((j) => {
    const hay = [j.title, j.company, j.description, ...j.tags]
      .join(" ")
      .toLowerCase();
    if (!terms.every((t) => hay.includes(t))) return false;
    if (loc && !j.location.toLowerCase().includes(loc)) return false;
    if (p.remote && !j.remote) return false;
    if (p.seniority && j.seniority.toLowerCase() !== p.seniority.toLowerCase())
      return false;
    if (cutoff && new Date(j.firstSeen).getTime() < cutoff) return false;
    return true;
  }).sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
}

export const recentJobs = (n = 6) => searchJobs().slice(0, n);

export const getJob = (id: string) => JOBS.find((j) => j.id === id);

export function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return `${Math.round(h / 24)} days ago`;
}

export function parseSearchParams(sp: URLSearchParams | Record<string, string | string[] | undefined>): SearchParams {
  const get = (k: string) => {
    const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? undefined;
  };
  const days = Number(get("days"));
  return {
    q: get("q"),
    location: get("location"),
    remote: get("remote") === "true" || get("remote") === "1",
    seniority: get("seniority") || undefined,
    days: days > 0 ? days : undefined,
  };
}
