import { NextRequest } from "next/server";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:3001";

async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  if (req.headers.get("x-scriptgrade-proxy") === "1") {
    return Response.json(
      {
        statusCode: 502,
        message:
          "Port 3001 is not the Nest API (proxy loop). Stop whatever is using 3001, then run: cd api && npm run start:dev",
      },
      { status: 502 },
    );
  }

  const { path } = await context.params;
  const target = `${API_ORIGIN}/api/${path.join("/")}${new URL(req.url).search}`;

  try {
    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.delete("connection");
    headers.delete("content-length");
    headers.delete("transfer-encoding");
    headers.set("x-scriptgrade-proxy", "1");

    const method = req.method.toUpperCase();
    const body =
      method === "GET" || method === "HEAD" || method === "OPTIONS"
        ? undefined
        : await req.arrayBuffer();

    const upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });

    const out = new Headers();
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") return;
      out.append(key, value);
    });
    const cookies =
      typeof upstream.headers.getSetCookie === "function"
        ? upstream.headers.getSetCookie()
        : [];
    for (const cookie of cookies) {
      out.append("set-cookie", cookie);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: out,
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const cause =
      err instanceof Error && "cause" in err ? String((err as { cause?: unknown }).cause) : "";
    const unreachable =
      /fetch failed|ECONNREFUSED|ENOTFOUND|aborted|timeout/i.test(`${raw} ${cause}`);
    const message = unreachable
      ? "Cannot reach the ScriptGrade API on port 3001. In a second terminal run: cd api && npm run start:dev"
      : raw;
    return Response.json({ statusCode: 502, message }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
