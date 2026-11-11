import { NextRequest, NextResponse } from "next/server";
import { Agent, fetch as fetchUndici } from "undici";
import {
  buildApiProxyDestination,
  shouldUseInsecureTls,
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

/** Client-supplied values we never trust for hop decisions (S5). */
const STRIPPED_CLIENT_HEADERS = new Set([
  "x-forwarded-for",
  "x-forwarded-proto",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-real-ip",
  "forwarded",
]);

function esHeaderDeCliente(clave: string): boolean {
  const normalizada = clave.toLowerCase();
  return (
    STRIPPED_CLIENT_HEADERS.has(normalizada) ||
    normalizada.startsWith("cf-")
  );
}

/** The trusted edge appends the real client IP last; anything before it may be spoofed (S5). */
function clienteReal(req: NextRequest): string {
  const crudo = req.headers.get("x-forwarded-for");
  if (!crudo) return "unknown";
  const partes = crudo
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return partes[partes.length - 1] ?? "unknown";
}

function cabecerasSalida(req: NextRequest): Headers {
  const headersOut = new Headers();
  req.headers.forEach((valor, clave) => {
    if (!HOP_HEADERS.has(clave.toLowerCase()) && !esHeaderDeCliente(clave)) {
      headersOut.set(clave, valor);
    }
  });
  headersOut.set("x-forwarded-for", clienteReal(req));
  headersOut.set(
    "x-forwarded-proto",
    new URL(req.url).protocol.replace(":", ""),
  );
  headersOut.set(
    "x-forwarded-host",
    req.headers.get("host") ?? new URL(req.url).host,
  );
  return headersOut;
}

/** Rejects any segment that decodes to . or .. or hides / or \ (S6). */
function segmentosSeguros(segmentos: string[]): boolean {
  for (const segmento of segmentos) {
    let decodificado: string;
    try {
      decodificado = decodeURIComponent(segmento);
    } catch {
      return false;
    }
    if (
      decodificado === "." ||
      decodificado === ".." ||
      decodificado.includes("/") ||
      decodificado.includes("\\")
    ) {
      return false;
    }
  }
  return true;
}

type Ctx = { params: Promise<{ path: string[] }> };

async function forwardRequest(req: NextRequest, segments: string[]) {
  if (!segmentosSeguros(segments)) {
    return NextResponse.json({ message: "Invalid path" }, { status: 400 });
  }

  const destination = buildApiProxyDestination(
    internalApiOrigin(),
    segments,
    req.nextUrl.search,
  );
  const headersOut = cabecerasSalida(req);

  const init: Parameters<typeof fetchUndici>[1] = {
    method: req.method,
    headers: headersOut,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Buffer.from(await req.arrayBuffer());
  }
  if (shouldUseInsecureTls()) {
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
    // The detail stays server-side; the client gets a generic answer (S7).
    console.error(
      "[proxy] No se pudo alcanzar el API upstream:",
      error instanceof Error ? error : String(error),
    );
    return NextResponse.json({ message: "Upstream unavailable" }, { status: 502 });
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
