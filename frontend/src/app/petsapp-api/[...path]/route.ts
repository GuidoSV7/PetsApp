import { NextRequest, NextResponse } from "next/server";
import { Agent, fetch as fetchUndici } from "undici";
import {
  buildApiProxyDestination,
  shouldSkipTlsVerification,
  internalApiOrigin,
} from "@/lib/petsapp-api-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type Ctx = { params: Promise<{ path: string[] }> };

async function forwardRequest(req: NextRequest, segments: string[]) {
  const destination = buildApiProxyDestination(
    internalApiOrigin(),
    segments,
    req.nextUrl.search,
  );
  const headersOut = new Headers();
  req.headers.forEach((valor, clave) => {
    if (!HOP_HEADERS.has(clave.toLowerCase())) {
      headersOut.set(clave, valor);
    }
  });

  const init: Parameters<typeof fetchUndici>[1] = {
    method: req.method,
    headers: headersOut,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Buffer.from(await req.arrayBuffer());
  }
  if (shouldSkipTlsVerification(destination)) {
    init.dispatcher = new Agent({
      connect: { rejectUnauthorized: false },
    });
  }

  try {
    const res = await fetchUndici(destination, init);
    const responseHeaders = new Headers();
    res.headers.forEach((valor, clave) => {
      if (!HOP_HEADERS.has(clave.toLowerCase())) {
        responseHeaders.set(clave, valor);
      }
    });
    return new NextResponse(Buffer.from(await res.arrayBuffer()), {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "error desconocido";
    return NextResponse.json(
      { message: "Proxy PetsApp no pudo alcanzar el API", detail },
      { status: 502 },
    );
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  return forwardRequest(req, (await ctx.params).path ?? []);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return forwardRequest(req, (await ctx.params).path ?? []);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return forwardRequest(req, (await ctx.params).path ?? []);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return forwardRequest(req, (await ctx.params).path ?? []);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return forwardRequest(req, (await ctx.params).path ?? []);
}
export async function OPTIONS(req: NextRequest, ctx: Ctx) {
  return forwardRequest(req, (await ctx.params).path ?? []);
}
