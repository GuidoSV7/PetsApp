import { NextResponse } from "next/server";
import { GlobalPetModelStore } from "@/lib/global-pet-model-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public meta for the shared cat mesh (BFF — works even if Nest lacks the route). */
export async function GET() {
  const meta = new GlobalPetModelStore().getMeta();
  return NextResponse.json(meta);
}
