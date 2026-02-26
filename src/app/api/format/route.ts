import { NextRequest, NextResponse } from "next/server";
import { format } from "@/lib/formatter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content = body.content ?? "";
    const formatted = format(content);
    return NextResponse.json({ formatted });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }
}
