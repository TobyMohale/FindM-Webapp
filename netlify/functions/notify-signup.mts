import { Resend } from "resend";
import { buildLoTapEmailHtml, getFromEmail, ADMIN_RECIPIENTS, formattedNowSAST } from "./_email-template.mts";

// Standalone, same pattern as notify-order.mts - deliberately independent
// from server.ts's shared Express app to sidestep the unresolved /api/*
// routing issue. Called at its own default path
// /.netlify/functions/notify-signup, not under /api/* at all.

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

  const { parent_email, parent_phone, child_name, tag_id } = body || {};

  if (!parent_email) {
    return new Response(JSON.stringify({ error: "parent_email is required" }), { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[notify-signup] RESEND_API_KEY is not set in this runtime.");
    return new Response(JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }), { status: 500 });
  }

  const resend = new Resend(apiKey);
  const fromEmail = getFromEmail();
  const formattedTime = formattedNowSAST();

  const parentSubject = `🎉 Welcome to LoTap: ${child_name || 'Child'}'s Safety Profile is Active!`;
  const parentHtml = buildLoTapEmailHtml({
    badgeText: "ACCOUNT REGISTERED",
    badgeBg: "#25D366",
    title: `Welcome to LoTap Parent Safety Portal!`,
    subtitle: "Smart NFC Safety Wristband Linked",
    introText: `Hello! Thank you for registering with LoTap. Your child's physical safety wristband has been successfully linked and activated under your secure parent profile.`,
    tableRows: [
      { label: "Parent Email", value: parent_email },
      { label: "Registered Phone / WhatsApp", value: parent_phone || 'Not Provided' },
      { label: "Child's Name", value: `👧 ${child_name || 'Child Profile'}`, isHighlight: true },
      { label: "Unique Tag Code (ID)", value: tag_id || 'N/A', isMonospace: true, isHighlight: true },
      { label: "Registered At", value: formattedTime }
    ],
    contentBlocks: [
      {
        title: "How to Manage Your Safety Wristband",
        items: [
          "<strong>Update Contacts Anytime:</strong> Change phone numbers or medical notes anytime in your Parent Portal. The physical wristband updates instantly!",
          "<strong>Emergency Mode:</strong> In an emergency, toggle Broadcast Mode in your portal to show prominent alert buttons to anyone scanning the band.",
          "<strong>Test Scan:</strong> Try tapping the physical NFC chip with your phone or scanning the printed QR code to preview the active safety card."
        ]
      }
    ],
    ctaButton: { text: "Open Parent Dashboard", url: "https://lotap.co.za/dashboard" },
    footerNote: "Your child's privacy and safety are protected under POPIA regulations."
  });

  const adminSubject = `📢 NEW REGISTRATION: ${child_name || 'Child'} Linked (${tag_id || 'Tag'})`;
  const adminHtml = buildLoTapEmailHtml({
    badgeText: "NEW PARENT REGISTRATION",
    badgeBg: "#051650",
    title: `New Parent Account & Wristband Linked`,
    subtitle: "LoTap System Registration Notice",
    introText: `A parent has registered an account and linked a physical safety wristband on the platform:`,
    tableRows: [
      { label: "Parent Email", value: parent_email, isHighlight: true },
      { label: "Contact Phone / WhatsApp", value: parent_phone || 'Not Provided' },
      { label: "Child Name", value: `👧 ${child_name || 'Unnamed Child'}` },
      { label: "Wristband Tag Code", value: tag_id || 'N/A', isMonospace: true, isHighlight: true },
      { label: "Registration Date", value: formattedTime }
    ],
    ctaButton: { text: "Review in Admin Portal", url: "https://lotap.co.za/admin" }
  });

  let parentMailInfo = null;
  let parentMailError: string | null = null;
  let adminMailInfo = null;
  let adminMailError: string | null = null;

  try {
    parentMailInfo = await resend.emails.send({
      from: `LoTap Alerts <${fromEmail}>`,
      to: parent_email,
      subject: parentSubject,
      html: parentHtml
    });
    if ((parentMailInfo as any)?.error) {
      parentMailError = JSON.stringify((parentMailInfo as any).error);
    }
  } catch (err: any) {
    parentMailError = err?.message || String(err);
    console.error("[notify-signup] parent welcome email failed:", err);
  }

  try {
    adminMailInfo = await resend.emails.send({
      from: `LoTap Admin Alerts <${fromEmail}>`,
      to: ADMIN_RECIPIENTS,
      subject: adminSubject,
      html: adminHtml
    });
    if ((adminMailInfo as any)?.error) {
      adminMailError = JSON.stringify((adminMailInfo as any).error);
    }
  } catch (err: any) {
    adminMailError = err?.message || String(err);
    console.error("[notify-signup] admin registration alert failed:", err);
  }

  const sent = !parentMailError && !adminMailError;

  return new Response(JSON.stringify({
    success: true,
    sent,
    recipient: parent_email,
    subject: parentSubject,
    parentMailInfo,
    parentMailError,
    adminMailInfo,
    adminMailError
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
