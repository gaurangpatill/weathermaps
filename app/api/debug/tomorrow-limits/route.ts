import { NextResponse } from "next/server";
import { getTomorrowStats } from "@/lib/weather";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      tomorrow: getTomorrowStats()
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to read Tomorrow.io stats." },
      { status: 500 }
    );
  }
}
