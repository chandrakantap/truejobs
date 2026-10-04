import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const job = getJob((await ctx.params).id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}
