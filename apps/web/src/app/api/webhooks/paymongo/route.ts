import { receivePaymongoWebhook } from "@negosyo-os/billing/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Read a bounded raw body. JSON reserialization would invalidate the signature.
  if (!request.body) return Response.json({ error: "Missing body." }, { status: 400 });
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 1024 * 1024) {
        await reader.cancel();
        return Response.json({ error: "Body too large." }, { status: 413 });
      }
      chunks.push(value);
    }
    await receivePaymongoWebhook(Buffer.concat(chunks).toString("utf8"), request.headers.get("paymongo-signature"));
    return Response.json({ received: true });
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 400;
    // A non-2xx response lets PayMongo retry a failed database confirmation.
    return Response.json({ error: status >= 500 ? "Payment confirmation unavailable." : "Invalid webhook." }, { status });
  }
}
