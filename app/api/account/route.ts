import { NextResponse } from "next/server";
import { accountInfo } from "@/lib/serpapi";

export async function GET() {
  try {
    return NextResponse.json(await accountInfo());
  } catch {
    return NextResponse.json({ mock: false });
  }
}
