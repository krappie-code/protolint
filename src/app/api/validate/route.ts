import { NextRequest, NextResponse } from "next/server";
import { validate } from "@/lib/validator";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let content: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      content = await file.text();
    } else {
      const body = await req.json();
      if (!body.content || typeof body.content !== "string") {
        return NextResponse.json({ error: "Missing 'content' field" }, { status: 400 });
      }
      content = body.content;
    }

    const result = validate(content);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
