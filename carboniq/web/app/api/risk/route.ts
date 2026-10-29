// ঝুঁকি (audit অগ্রাধিকার) আর Monte Carlo অনিশ্চয়তা
import { errMsg } from "@/lib/record";
import { loadLedger, loadProduction } from "@/lib/ledgerData";
import { monteCarlo, periodRisk, recordRisks, RISK_RULES, UNCERTAINTY } from "@/lib/risk";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [entries, prod] = await Promise.all([loadLedger(), loadProduction()]);
    const risks = recordRisks(entries, prod, new Date().toISOString().slice(0, 7));
    return Response.json({ risks, summary: periodRisk(risks), mc: monteCarlo(entries), rules: RISK_RULES, uncertainty: UNCERTAINTY });
  } catch (err) {
    return Response.json({ error: errMsg(err) }, { status: 500 });
  }
}
