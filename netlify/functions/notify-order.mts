import { Resend } from "resend";
import { buildLoTapEmailHtml, getFromEmail, ADMIN_RECIPIENTS, formattedNowSAST } from "./_email-template.mts";

// Standalone function, deliberately independent from server.ts/netlify/functions/api.ts.
// The shared Express app behind /api/* has had unresolved intermittent 404s;
// rather than keep chasing that, order emails get their own small, simple
// function with no Express, no vite, no supabase-js - just Resend.

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { customer_name, customer_email, customer_phone, quantity, color, size, shipping_address } = body || {};

  if (!customer_name) {
    return new Response(JSON.stringify({ error: "customer_name is required" }), { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[notify-order] RESEND_API_KEY is not set in this runtime.");
    return new Response(JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }), { status: 500 });
  }

  const resend = new Resend(apiKey);
  const fromEmail = getFromEmail();
  const adminRecipients = ADMIN_RECIPIENTS;

  const formattedTime = formattedNowSAST();

  let clientMailInfo = null;
  let clientMailError: string | null = null;
  let adminMailInfo = null;
  let adminMailError: string | null = null;

  if (customer_email) {
    try {
      clientMailInfo = await resend.emails.send({
        from: `LoTap Orders <${fromEmail}>`,
        to: customer_email,
        subject: `🎉 Thank You for Your LoTap Order, ${customer_name}!`,
        html: buildLoTapEmailHtml({
          badgeText: "ORDER CONFIRMED",
          badgeBg: "#25D366",
          title: `Thank You for Your Order, ${customer_name}!`,
          subtitle: "LoTap NFC Child Safety Wristband Inquiry",
          introText: `We have successfully received your order inquiry for <strong>${quantity || 1} LoTap Smart Safety Wristband(s)</strong>. Our team is now processing your request and preparing dispatch details!`,
          tableRows: [
            { label: "Customer Name", value: customer_name },
            { label: "Email Address", value: customer_email },
            { label: "Contact Number", value: customer_phone || 'Not Provided' },
            { label: "Wristband Quantity", value: `${quantity || 1} Band(s)`, isHighlight: true },
            { label: "Wristband Color", value: color || 'Navy Blue' },
            { label: "Wristband Size", value: size || 'Kids Small' },
            { label: "Delivery Address", value: shipping_address || 'Standard Delivery' },
            { label: "Order Placed At", value: formattedTime }
          ],
          contentBlocks: [
            {
              title: "What Happens Next?",
              items: [
                "<strong>Order Dispatch:</strong> Our team will package your custom silicone wristbands and arrange courier delivery to your specified location.",
                "<strong>Receive & Tap:</strong> Once delivered, bring your smartphone near the NFC chip or scan the printed QR code on the back of the band.",
                "<strong>Activate Profile:</strong> You will be guided to connect your free parent profile, add emergency contacts, and input any critical medical instructions in seconds."
              ]
            }
          ],
          ctaButton: { text: "Visit LoTap Portal", url: "https://lotap.co.za" },
          footerNote: "Questions about your order? Reply directly to this email or contact customer support."
        })
      });
      if ((clientMailInfo as any)?.error) {
        clientMailError = JSON.stringify((clientMailInfo as any).error);
      }
    } catch (err: any) {
      clientMailError = err?.message || String(err);
      console.error("[notify-order] client email failed:", err);
    }
  }

  try {
    adminMailInfo = await resend.emails.send({
      from: `LoTap Admin Alerts <${fromEmail}>`,
      to: adminRecipients,
      subject: `📦 NEW ORDER: ${customer_name} (${quantity || 1} Band(s))`,
      html: buildLoTapEmailHtml({
        badgeText: "NEW ORDER ALERT",
        badgeBg: "#C54B8C",
        title: "New Wristband Order Received",
        subtitle: "LoTap Admin Order Notification Service",
        introText: "A new customer order inquiry has been placed on the website. Review details below to process fulfillment:",
        tableRows: [
          { label: "Customer Name", value: customer_name, isHighlight: true },
          { label: "Email Address", value: customer_email || 'Not Provided' },
          { label: "Contact Phone", value: customer_phone || 'Not Provided' },
          { label: "Order Quantity", value: `${quantity || 1} Wristband(s)`, isHighlight: true },
          { label: "Wristband Color", value: color || 'Navy Blue' },
          { label: "Wristband Size", value: size || 'Kids Small' },
          { label: "Shipping Address", value: shipping_address || 'Not Provided' },
          { label: "Order Time", value: formattedTime }
        ],
        contentBlocks: [
          {
            title: "Admin Fulfillment Instructions",
            items: [
              "Verify stock for the selected wristband color and size.",
              "Log into the LoTap Admin Portal to assign Tag IDs and mark order as Fulfilled.",
              "Contact the customer via phone/WhatsApp if courier clarification is needed."
            ]
          }
        ],
        ctaButton: { text: "Open Admin Dashboard", url: "https://lotap.co.za/admin" }
      })
    });
    if ((adminMailInfo as any)?.error) {
      adminMailError = JSON.stringify((adminMailInfo as any).error);
    }
  } catch (err: any) {
    adminMailError = err?.message || String(err);
    console.error("[notify-order] admin email failed:", err);
  }

  const sent = !clientMailError && !adminMailError;

  return new Response(JSON.stringify({
    success: true,
    sent,
    clientMailInfo,
    clientMailError,
    adminMailInfo,
    adminMailError
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

