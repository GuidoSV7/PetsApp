import { NextResponse } from "next/server";
import {
  GlobalPetModelStore,
  StoreNotFoundError,
} from "@/lib/global-pet-model-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public GLB bytes for the shared cat mesh. */
export async function GET() {
  try {
    const { buffer, mimeType, fileName } =
      new GlobalPetModelStore().getFileBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${fileName.replace(/"/g, "")}"`,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    if (err instanceof StoreNotFoundError) {
      return NextResponse.json({ message: err.message }, { status: 404 });
    }
    throw err;
  }
}
