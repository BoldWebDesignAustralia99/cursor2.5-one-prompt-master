# Edge functions (Deno)

Privileged, server-side capabilities. The browser never holds integration secrets;
it calls these, which (1) check the caller's permission via `authorize()` against
the registry, then (2) use a service-role client for the privileged write. This is
the "edge functions check permissions next" layer from Architecture 01 §4.

Secrets live in Supabase function env (`supabase secrets set …`), never in the repo.

## Included (structural stubs — wire the SDKs/keys to go live)

- `stripe-deposit/` — take the refundable patient deposit; record `payments`;
  link to the booking. Amount comes from `settings.deposit`.
- `twilio-voice/` — inbound voice webhook; logs `call_sessions`; routes via
  forwarding rule groups; bridges Media Streams → Deepgram for live transcripts.

## Planned (same pattern, registered in the workflow action registry)

- `stripe-webhook`, `gocardless-charge`, `gocardless-webhook`, `resend-email`,
  `twilio-sms`, `deepgram-stream`, `ai-grade-call`, `ai-classify-booking`,
  `ai-compliance-check`, `facebook-lead-webhook`, `make-webhook`,
  `workflow-execute` (the engine: subscribes to triggers, evaluates rule-group
  conditions, runs actions with retries + idempotency + run logs).
