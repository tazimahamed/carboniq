// MCP endpoint: POST /api/mcp (Streamable HTTP, stateless, JSON উত্তর)
import { handleRpc, SERVER_INFO, TOOLS } from "@/lib/mcp";
import { loadLedger } from "@/lib/ledgerData";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
};

function authorized(req: Request) {
  const token = process.env.MCP_TOKEN; // বসানো থাকলে Bearer token লাগবে
  return !token || req.headers.get("authorization") === `Bearer ${token}`;
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// Browser-এ খুললে সংক্ষিপ্ত পরিচয় (MCP client-রা POST ব্যবহার করে)
export function GET() {
  return Response.json({ ...SERVER_INFO, transport: "streamable-http (POST JSON-RPC)", tools: TOOLS.map((t) => t.name) }, { headers: CORS });
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } }, { status: 401, headers: CORS });
  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: CORS });
  }
  const batch = Array.isArray(body);
  const msgs = batch ? (body as any[]) : [body];
  const out = (await Promise.all(msgs.map((m) => handleRpc(m, loadLedger)))).filter(Boolean);
  if (!out.length) return new Response(null, { status: 202, headers: CORS }); // শুধু notification
  return Response.json(batch ? out : out[0], { headers: CORS });
}
