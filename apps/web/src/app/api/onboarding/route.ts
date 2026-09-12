import { NextResponse } from "next/server";
import { z } from "zod";
import { saveAssistantBrief } from "agent-core/lore";

export const runtime = "nodejs";

const briefSchema = z.object({
  role: z.string().trim().min(1).max(200),
  projects: z.array(z.string().trim().min(1).max(120)).max(20),
  duties: z.string().trim().min(1).max(4_000),
});

export async function POST(request: Request) {
  const parsed = briefSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Add your role, at least one project, and what Lore should remember." }, { status: 400 });
  }
  return NextResponse.json({ brief: await saveAssistantBrief(parsed.data) });
}
