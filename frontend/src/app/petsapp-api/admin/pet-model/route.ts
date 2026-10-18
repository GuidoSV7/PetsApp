import { NextRequest, NextResponse } from "next/server";
import { assertAdminBearer } from "@/lib/assert-admin-bearer";
import {
  GlobalPetModelStore,
  StoreBadRequestError,
} from "@/lib/global-pet-model-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function upsert(req: NextRequest) {
  const auth = await assertAdminBearer(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const form = await req.formData();
    const scaleRaw = form.get("modelScale");
    const modelScale = Number(scaleRaw);
    if (!Number.isFinite(modelScale)) {
      return NextResponse.json(
        { message: "modelScale inválido" },
        { status: 400 },
      );
    }

    const fileEntry = form.get("file");
    let file:
      | { buffer: Buffer; originalname: string; mimetype?: string }
      | undefined;
    if (fileEntry instanceof File) {
      const buffer = Buffer.from(await fileEntry.arrayBuffer());
      file = {
        buffer,
        originalname: fileEntry.name || "model.glb",
        mimetype: fileEntry.type || undefined,
      };
    }

    const meta = new GlobalPetModelStore().saveModel({ modelScale, file });
    return NextResponse.json(meta);
  } catch (err) {
    if (err instanceof StoreBadRequestError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    throw err;
  }
}

/** Preferred multer-native verb. */
export async function POST(req: NextRequest) {
  return upsert(req);
}

/** Alias for older clients. */
export async function PUT(req: NextRequest) {
  return upsert(req);
}

export async function DELETE(req: NextRequest) {
  const auth = await assertAdminBearer(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }
  const meta = new GlobalPetModelStore().clearModel();
  return NextResponse.json(meta);
}
