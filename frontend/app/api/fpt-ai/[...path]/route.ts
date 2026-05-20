export const runtime = "nodejs";
export const maxDuration = 300;

const fptBaseUrl = "https://mkp-api.fptcloud.com/v1";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function resolvePath(params: RouteContext["params"]) {
  const resolved = await params;
  return resolved.path ?? [];
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);
  return scheme.toLowerCase() === "bearer" ? token : "";
}

async function proxyToFpt(request: Request, context: RouteContext) {
  const apiKey = process.env.FPT_AI_API_KEY;
  const proxyToken = process.env.FPT_AI_PROXY_TOKEN;

  if (!apiKey || !proxyToken) {
    return Response.json({ detail: "FPT proxy is not configured." }, { status: 500 });
  }

  if (bearerToken(request) !== proxyToken) {
    return Response.json({ detail: "Unauthorized." }, { status: 401 });
  }

  const path = await resolvePath(context.params);
  const upstreamUrl = new URL(`${fptBaseUrl}/${path.join("/")}`);
  const requestUrl = new URL(request.url);
  upstreamUrl.search = requestUrl.search;

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": request.headers.get("content-type") ?? "application/json",
    },
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
    cache: "no-store",
  });

  return new Response(await upstreamResponse.arrayBuffer(), {
    status: upstreamResponse.status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": upstreamResponse.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  return proxyToFpt(request, context);
}
