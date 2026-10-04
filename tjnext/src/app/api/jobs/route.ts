import { NextRequest, NextResponse } from "next/server";
import { parseSearchParams, searchJobs } from "@/lib/jobs";

export function GET(req: NextRequest) {
  const jobs = searchJobs(parseSearchParams(req.nextUrl.searchParams));
  return NextResponse.json({ total: jobs.length, jobs });
}
