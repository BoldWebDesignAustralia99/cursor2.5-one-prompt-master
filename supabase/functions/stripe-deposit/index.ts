// Take a refundable patient deposit (persona 04). The browser never holds
// privileged keys; it calls this function, which checks the caller's permission,
// creates a Stripe PaymentIntent (card on call) or Checkout link (SMS), records a
// `payments` row, and links it to the booking. Webhook confirmation flips status.
//
// This is a structural stub: wire STRIPE_SECRET_KEY + the Stripe SDK to go live.
import { corsHeaders, json } from "../_shared/cors.ts";
import { clientForRequest, serviceClient, authorize } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const client = clientForRequest(req);
  if (!client) return json({ error: "unauthenticated" }, 401);

  // A rep taking a deposit must be able to call leads.
  if (!(await authorize(client, "leads.call"))) {
    return json({ error: "forbidden" }, 403);
  }

  const { booking_id, lead_id, clinic_id, mode } = await req.json().catch(() => ({}));
  if (!booking_id || !lead_id) return json({ error: "booking_id and lead_id required" }, 400);

  const svc = serviceClient();

  // Deposit amount comes from settings — never hardcoded.
  const { data: setting } = await svc.from("settings").select("value").eq("key", "deposit").single();
  const amount = (setting?.value as { amount_cents?: number } | null)?.amount_cents ?? 7500;
  const currency = (setting?.value as { currency?: string } | null)?.currency ?? "AUD";

  // TODO: create the Stripe PaymentIntent / Checkout Session here.
  const providerRef = `demo_${mode ?? "card"}_${crypto.randomUUID()}`;

  const { data: payment, error } = await svc
    .from("payments")
    .insert({
      kind: "patient_deposit",
      provider: "stripe",
      provider_ref: providerRef,
      clinic_id,
      lead_id,
      booking_id,
      amount_cents: amount,
      currency,
      status: "pending",
    })
    .select()
    .single();

  if (error) return json({ error: error.message }, 500);

  await svc.from("bookings").update({ deposit_status: "pending", deposit_payment_id: payment.id }).eq("id", booking_id);

  return json({ payment_id: payment.id, client_secret: providerRef, amount_cents: amount, currency });
});
