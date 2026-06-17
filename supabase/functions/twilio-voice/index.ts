// Twilio voice webhook (Feature 9.5): handles inbound routing via forwarding
// rule groups and logs calls into `communications` + `call_sessions`. Media
// Streams are bridged to Deepgram for live transcription elsewhere.
//
// Structural stub: validate the Twilio signature and return TwiML to go live.
import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const form = await req.formData().catch(() => null);
  const callSid = form?.get("CallSid")?.toString() ?? crypto.randomUUID();
  const from = form?.get("From")?.toString() ?? "";
  const to = form?.get("To")?.toString() ?? "";

  const svc = serviceClient();
  await svc.from("call_sessions").insert({
    twilio_call_sid: callSid,
    direction: "inbound",
    from_number: from,
    to_number: to,
    status: "ringing",
  });

  // TODO: evaluate forwarding_rules (rule groups) to pick a target.
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Connecting you now.</Say></Response>`;
  return new Response(twiml, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
});
