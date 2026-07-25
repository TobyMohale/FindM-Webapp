import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Initialize Dotenv (though in this environment variables are pre-loaded)
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ywpidzojetdhyezmkjxb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

async function ensureAdminUser() {
  if (!supabaseAdmin) {
    console.warn("supabaseAdmin unavailable (SUPABASE_SERVICE_ROLE_KEY missing). Skipping auto admin user creation.");
    return { success: false, reason: "SUPABASE_SERVICE_ROLE_KEY missing" };
  }
  const targetEmail = "findmewebapp7@gmail.com";
  const setupPassword = process.env.ADMIN_SETUP_PASSWORD;

  try {
    const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error("Error listing Supabase users:", listError);
      return { success: false, error: listError.message };
    }

    const users = data?.users || [];
    const existingUser = users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());

    let userId = existingUser?.id;

    if (existingUser) {
      if (setupPassword) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: setupPassword,
          email_confirm: true,
          user_metadata: { full_name: 'Lead Admin' }
        });
        if (updateError) {
          console.error("Error updating admin password:", updateError);
          return { success: false, error: updateError.message };
        }
        console.log(`Updated password for admin user ${targetEmail} from ADMIN_SETUP_PASSWORD`);
      } else {
        console.log(`Admin user ${targetEmail} already exists. ADMIN_SETUP_PASSWORD not provided; preserving existing password.`);
      }
    } else {
      if (!setupPassword) {
        console.warn(`Admin user ${targetEmail} does not exist, but ADMIN_SETUP_PASSWORD is not set. Skipping user creation.`);
        return { success: false, reason: "ADMIN_SETUP_PASSWORD missing" };
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: targetEmail,
        password: setupPassword,
        email_confirm: true,
        user_metadata: { full_name: 'Lead Admin' }
      });
      if (createError) {
        console.error("Error creating admin user:", createError);
        return { success: false, error: createError.message };
      }
      userId = newUser.user?.id;
      console.log(`Created new admin user ${targetEmail}`);
    }

    if (userId) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          email: targetEmail,
          full_name: 'Lead Admin',
          popia_consent_accepted: true
        }, { onConflict: 'id' });

      if (profileError) {
        console.warn("Notice updating profiles table for admin:", profileError.message);
      }
    }

    return { success: true, email: targetEmail };
  } catch (err: any) {
    console.error("Exception in ensureAdminUser:", err);
    return { success: false, error: err.message };
  }
}

// Automatically ensure admin user on server start
ensureAdminUser().catch(err => console.error("Admin user auto setup error:", err));

let resendInstance: Resend | null = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set. Please add it in Settings.');
  }
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API route to get current Resend configuration status
  app.get("/api/resend-status", (req, res) => {
    const hasKey = Boolean(process.env.RESEND_API_KEY);
    const rawFromEmail = process.env.RESEND_FROM_EMAIL;
    const fromEmail = (rawFromEmail && rawFromEmail !== "onboarding@resend.dev")
      ? rawFromEmail
      : "alerts@lotap.co.za";
    res.json({
      configured: hasKey,
      fromEmail,
      note: hasKey ? "Resend is ready to send automatic email notifications." : "Missing RESEND_API_KEY. Add it to Settings."
    });
  });

  // API route to ensure admin user credentials
  app.post("/api/admin/setup-auth-user", async (req, res) => {
    const result = await ensureAdminUser();
    res.json(result);
  });

  async function resolveTagAndParent(tag_id?: string) {
    let email: string | null = null;
    let childName: string | null = null;

    if (tag_id && supabaseAdmin) {
      try {
        const { data: tagData } = await supabaseAdmin
          .from('tags')
          .select('child_name, owner_id')
          .eq('tag_id', tag_id)
          .maybeSingle();

        if (tagData) {
          if (tagData.child_name) {
            childName = tagData.child_name;
          }
          if (tagData.owner_id) {
            const { data: profileData } = await supabaseAdmin
              .from('profiles')
              .select('email')
              .eq('id', tagData.owner_id)
              .maybeSingle();

            if (profileData?.email) {
              email = profileData.email;
            }
          }
        }
      } catch (e) {
        console.warn("Error looking up tag/parent via supabaseAdmin:", e);
      }
    }

    return { email, childName: childName || 'Safety Tag' };
  }

  // Send scan notification email
  app.post("/api/notify/scan", async (req, res) => {
    try {
      const { tag_id, scan_count, timestamp } = req.body;
      
      const { email, childName } = await resolveTagAndParent(tag_id);

      if (!email) {
        return res.json({ success: true, sent: false, note: "No parent email found for this tag" });
      }

      const formattedTime = new Date(timestamp || Date.now()).toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        dateStyle: "medium",
        timeStyle: "medium"
      });

      const subject = `🚨 LoTap Scan Alert: ${childName || 'Safety Tag'} was scanned!`;
      const html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
          <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #FFCFF1; padding-bottom: 16px;">
            <span style="font-size: 32px; display: inline-block; margin-bottom: 8px;">🏷️</span>
            <h1 style="color: #051650; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">LoTap Safety Alert</h1>
            <p style="color: #c54b8c; font-size: 13px; font-weight: bold; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">Automatic NFC Scan Notification</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 18px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #c54b8c;">
            <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #334155;">
              This is an automatic notification that your child's LoTap safety tag has been scanned.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Child's Profile</td>
              <td style="padding: 8px 0; color: #051650; font-weight: 700; text-align: right;">${childName || 'Unnamed Child'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Wristband ID</td>
              <td style="padding: 8px 0; color: #051650; font-weight: 700; font-family: monospace; text-align: right;">${tag_id || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Scan Number</td>
              <td style="padding: 8px 0; color: #051650; font-weight: 700; text-align: right;">#${scan_count || 1}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Scan Time (SAST)</td>
              <td style="padding: 8px 0; color: #051650; font-weight: 700; text-align: right;">${formattedTime}</td>
            </tr>
          </table>

          <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 16px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
            <h3 style="color: #991b1b; margin: 0 0 6px 0; font-size: 14px; font-weight: 700;">No Action Needed?</h3>
            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #7f1d1d;">
              If this was you scanning the tag or if your child is safely with you, please disregard this alert. If your child is out and you did not expect this scan, please prepare to communicate with any potential finder.
            </p>
          </div>

          <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <p style="margin: 0 0 4px 0;">LoTap Smart Safety Wristbands &copy; 2026</p>
            <p style="margin: 0;">Sent automatically via Resend Mailer Integration</p>
          </div>
        </div>
      `;

      let info = null;
      let usedSandbox = false;
      
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const resend = getResendClient();
        const rawFromEmail = process.env.RESEND_FROM_EMAIL;
        const fromEmail = (rawFromEmail && rawFromEmail !== "onboarding@resend.dev")
          ? rawFromEmail
          : "alerts@lotap.co.za";
        const toEmail = email;
        if (fromEmail === "onboarding@resend.dev") {
          usedSandbox = true;
        }

        info = await resend.emails.send({
          from: `LoTap Alerts <${fromEmail}>`,
          to: toEmail,
          subject,
          html
        });
      }

      res.json({
        success: true,
        sent: !!apiKey,
        usedSandbox,
        recipient: email,
        subject,
        html,
        info
      });
    } catch (err: any) {
      console.error("Scan notification failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Send finder alert notification email
  app.post("/api/notify/finder", async (req, res) => {
    try {
      const { tag_id, finder_name, finder_phone, finder_email, custom_note, timestamp } = req.body;
      
      const { email, childName } = await resolveTagAndParent(tag_id);

      if (!email) {
        return res.json({ success: true, sent: false, note: "No parent email found for this tag" });
      }

      const formattedTime = new Date(timestamp || Date.now()).toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        dateStyle: "medium",
        timeStyle: "medium"
      });

      const subject = `🚨 EMERGENCY ALERT: Finder has submitted details for ${childName || 'your child'}!`;
      const html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fee2e2; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
          <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #ef4444; padding-bottom: 16px;">
            <span style="font-size: 32px; display: inline-block; margin-bottom: 8px;">🚨</span>
            <h1 style="color: #991b1b; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">LoTap Emergency Alert</h1>
            <p style="color: #dc2626; font-size: 13px; font-weight: bold; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">Finder has Submitted Information</p>
          </div>
          
          <div style="background-color: #fef2f2; padding: 18px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #ef4444;">
            <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #991b1b; font-weight: bold;">
              A finder has interacted with your child's safety wristband and submitted details to reach you!
            </p>
          </div>

          <h3 style="color: #051650; font-size: 14px; margin: 0 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">Finder Contact Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Finder Name</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${finder_name || 'Anonymous Finder'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Finder Phone</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${finder_phone || 'Not Provided'}</td>
            </tr>
            ${finder_email ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Finder Email</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;"><a href="mailto:${finder_email}" style="color: #051650; text-decoration: underline;">${finder_email}</a></td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Submitted Time</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${formattedTime}</td>
            </tr>
            ${custom_note ? `
            <tr>
              <td style="padding: 12px 0 8px 0; color: #64748b; font-weight: 600; vertical-align: top;">Finder's Note / Location Info</td>
              <td style="padding: 12px 0 8px 0; color: #334155; font-weight: 700; text-align: right; line-height: 1.5; font-style: italic; max-width: 300px;">"${custom_note}"</td>
            </tr>
            ` : ''}
          </table>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
            <h4 style="color: #1e3a8a; margin: 0 0 6px 0; font-size: 13px; font-weight: 700;">What to do next?</h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.6; color: #1e3a8a;">
              <li>Contact the finder directly if their phone number is provided above.</li>
              <li>Check your WhatsApp messages for the direct safety link template.</li>
              <li>Remain calm and locate your child using the coordinates if provided.</li>
            </ul>
          </div>

          <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <p style="margin: 0 0 4px 0;">LoTap Smart Safety Wristbands &copy; 2026</p>
            <p style="margin: 0;">Sent automatically via Resend Mailer Integration</p>
          </div>
        </div>
      `;

      let info = null;
      let usedSandbox = false;
      
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const resend = getResendClient();
        const rawFromEmail = process.env.RESEND_FROM_EMAIL;
        const fromEmail = (rawFromEmail && rawFromEmail !== "onboarding@resend.dev")
          ? rawFromEmail
          : "alerts@lotap.co.za";
        const toEmail = email;
        if (fromEmail === "onboarding@resend.dev") {
          usedSandbox = true;
        }

        info = await resend.emails.send({
          from: `LoTap Alerts <${fromEmail}>`,
          to: toEmail,
          subject,
          html
        });
      }

      res.json({
        success: true,
        sent: !!apiKey,
        usedSandbox,
        recipient: email,
        subject,
        html,
        info
      });
    } catch (err: any) {
      console.error("Finder notification failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Send GPS/Location shared notification email
  app.post("/api/notify/location", async (req, res) => {
    try {
      const { tag_id, latitude, longitude, place_name, timestamp } = req.body;
      
      const { email, childName } = await resolveTagAndParent(tag_id);

      if (!email) {
        return res.json({ success: true, sent: false, note: "No parent email found for this tag" });
      }

      const formattedTime = new Date(timestamp || Date.now()).toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        dateStyle: "medium",
        timeStyle: "medium"
      });

      const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;

      const subject = `📍 LIVE GPS LOCATION shared for ${childName || 'your child'}!`;
      const html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #dbeafe; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
          <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 16px;">
            <span style="font-size: 32px; display: inline-block; margin-bottom: 8px;">📍</span>
            <h1 style="color: #1e3a8a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">LoTap Location Shared</h1>
            <p style="color: #2563eb; font-size: 13px; font-weight: bold; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">GPS Coordinates Submitted</p>
          </div>
          
          <div style="background-color: #eff6ff; padding: 18px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #2563eb;">
            <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #1e3a8a; font-weight: bold;">
              A helper has successfully shared the active GPS location of your child's wristband.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Child Name</td>
              <td style="padding: 8px 0; color: #1e3a8a; font-weight: 700; text-align: right;">${childName || 'Unnamed Child'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Latitude / Longitude</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700; font-family: monospace; text-align: right;">${latitude}, ${longitude}</td>
            </tr>
            ${place_name ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Estimated Location</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${place_name}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Shared Time (SAST)</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${formattedTime}</td>
            </tr>
          </table>

          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${mapsLink}" target="_blank" style="display: inline-block; background-color: #051650; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 14px 28px; rounded-radius: 12px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-transform: uppercase; letter-spacing: 0.025em;">
              🗺️ Open in Google Maps
            </a>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #64748b;">
              Note: This location represents the GPS hardware of the device used to scan the wristband. Use the map to navigate to this location as quickly as possible.
            </p>
          </div>

          <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <p style="margin: 0 0 4px 0;">LoTap Smart Safety Wristbands &copy; 2026</p>
            <p style="margin: 0;">Sent automatically via Resend Mailer Integration</p>
          </div>
        </div>
      `;

      let info = null;
      let usedSandbox = false;
      
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const resend = getResendClient();
        const rawFromEmail = process.env.RESEND_FROM_EMAIL;
        const fromEmail = (rawFromEmail && rawFromEmail !== "onboarding@resend.dev")
          ? rawFromEmail
          : "alerts@lotap.co.za";
        const toEmail = email;
        if (fromEmail === "onboarding@resend.dev") {
          usedSandbox = true;
        }

        info = await resend.emails.send({
          from: `LoTap Alerts <${fromEmail}>`,
          to: toEmail,
          subject,
          html
        });
      }

      res.json({
        success: true,
        sent: !!apiKey,
        usedSandbox,
        recipient: email,
        subject,
        html,
        info
      });
    } catch (err: any) {
      console.error("Location notification failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to build cohesive LoTap HTML emails
  function buildLoTapEmailHtml({
    badgeText = "OFFICIAL NOTIFICATION",
    badgeBg = "#C54B8C",
    title = "",
    subtitle = "Smart NFC Child Safety Wristbands",
    introText = "",
    tableRows = [],
    contentBlocks = [],
    ctaButton = null,
    footerNote = "POPIA Compliant • Emergency Contact & Identification System"
  }: {
    badgeText?: string;
    badgeBg?: string;
    title?: string;
    subtitle?: string;
    introText?: string;
    tableRows?: Array<{ label: string; value: string; isMonospace?: boolean; isHighlight?: boolean }>;
    contentBlocks?: Array<{ title: string; items: string[] }>;
    ctaButton?: { text: string; url: string } | null;
    footerNote?: string;
  }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(5,22,80,0.08);">
                
                <!-- Header Banner -->
                <tr>
                  <td style="background-color: #051650; padding: 32px 24px; text-align: center; border-bottom: 4px solid #C54B8C;">
                    <table align="center" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="padding-bottom: 8px;">
                          <span style="font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: -0.03em; font-family: 'Helvetica Neue', Arial, sans-serif;">
                            Lo<span style="color: #FFCFF1;">Tap</span>
                          </span>
                        </td>
                      </tr>
                      ${badgeText ? `
                      <tr>
                        <td align="center">
                          <span style="display: inline-block; background-color: ${badgeBg}; color: #ffffff; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 12px; border-radius: 999px;">
                            ${badgeText}
                          </span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                    <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 12px; font-weight: 600; letter-spacing: 0.02em;">
                      ${subtitle}
                    </p>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 32px 24px;">
                    ${title ? `<h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #051650; line-height: 1.3;">${title}</h1>` : ''}
                    ${introText ? `
                    <div style="background-color: #fcf6fa; border-left: 4px solid #C54B8C; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
                      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #051650; font-weight: 500;">
                        ${introText}
                      </p>
                    </div>
                    ` : ''}

                    <!-- Data Table -->
                    ${tableRows && tableRows.length > 0 ? `
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 24px; background-color: #ffffff; border-radius: 12px; border: 1px solid #f1f5f9; overflow: hidden;">
                      ${tableRows.map((row, idx) => `
                        <tr style="border-bottom: ${idx === tableRows.length - 1 ? 'none' : '1px solid #f1f5f9'};">
                          <td style="padding: 12px 16px; color: #64748b; font-size: 13px; font-weight: 600; width: 40%;">${row.label}</td>
                          <td style="padding: 12px 16px; color: ${row.isHighlight ? '#C54B8C' : '#051650'}; font-size: 13px; font-weight: 700; text-align: right; ${row.isMonospace ? 'font-family: monospace; font-size: 14px;' : ''}">${row.value}</td>
                        </tr>
                      `).join('')}
                    </table>
                    ` : ''}

                    <!-- Instruction Blocks -->
                    ${contentBlocks.map(block => `
                      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px 20px; border-radius: 12px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #051650; text-transform: uppercase; letter-spacing: 0.05em;">${block.title}</h3>
                        <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #334155;">
                          ${block.items.map(item => `<li style="margin-bottom: 6px;">${item}</li>`).join('')}
                        </ul>
                      </div>
                    `).join('')}

                    <!-- Call To Action Button -->
                    ${ctaButton ? `
                    <div style="text-align: center; margin: 28px 0 12px 0;">
                      <a href="${ctaButton.url}" target="_blank" style="display: inline-block; background-color: #051650; color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(5,22,80,0.25);">
                        ${ctaButton.text}
                      </a>
                    </div>
                    ` : ''}

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #f1f5f9;">
                    <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                      LoTap Smart NFC Child Safety Wristbands
                    </p>
                    <p style="margin: 0 0 8px 0; font-size: 11px; color: #94a3b8;">
                      ${footerNote}
                    </p>
                    <p style="margin: 0; font-size: 10px; color: #cbd5e1;">
                      &copy; 2026 LoTap. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  // Send new customer order notification emails (Client Confirmation + Admin Notification)
  app.post("/api/notify/order", async (req, res) => {
    try {
      const {
        customer_name,
        customer_email,
        customer_phone,
        quantity,
        color,
        size,
        shipping_address
      } = req.body;

      if (!customer_name) {
        return res.status(400).json({ error: "customer_name is required" });
      }

      const formattedTime = new Date().toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        dateStyle: "medium",
        timeStyle: "short"
      });

      const apiKey = process.env.RESEND_API_KEY;
      const adminRecipients = ["findmewebapp7@gmail.com", "johannesburgwebstudio@gmail.com"];

      let clientMailInfo = null;
      let adminMailInfo = null;
      let usedSandbox = false;

      if (apiKey) {
        const resend = getResendClient();
        const rawFromEmail = process.env.RESEND_FROM_EMAIL;
        const fromEmail = (rawFromEmail && rawFromEmail !== "onboarding@resend.dev")
          ? rawFromEmail
          : "alerts@lotap.co.za";

        if (fromEmail === "onboarding@resend.dev") {
          usedSandbox = true;
        }

        // 1. Send Order Confirmation Email to the Client
        if (customer_email) {
          const clientSubject = `🎉 Thank You for Your LoTap Order, ${customer_name}!`;
          const clientHtml = buildLoTapEmailHtml({
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
            ctaButton: {
              text: "Visit LoTap Portal",
              url: "https://lotap.co.za"
            },
            footerNote: "Questions about your order? Reply directly to this email or contact customer support."
          });

          try {
            clientMailInfo = await resend.emails.send({
              from: `LoTap Orders <${fromEmail}>`,
              to: customer_email,
              subject: clientSubject,
              html: clientHtml
            });
          } catch (clientErr) {
            console.error("Failed sending client order confirmation email:", clientErr);
          }
        }

        // 2. Send Order Notification Email to Admin Team
        const adminSubject = `📦 NEW ORDER: ${customer_name} (${quantity || 1} Band(s))`;
        const adminHtml = buildLoTapEmailHtml({
          badgeText: "NEW ORDER ALERT",
          badgeBg: "#C54B8C",
          title: `New Wristband Order Received`,
          subtitle: "LoTap Admin Order Notification Service",
          introText: `A new customer order inquiry has been placed on the website. Review details below to process fulfillment:`,
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
          ctaButton: {
            text: "Open Admin Dashboard",
            url: "https://lotap.co.za/admin"
          }
        });

        try {
          adminMailInfo = await resend.emails.send({
            from: `LoTap Admin Alerts <${fromEmail}>`,
            to: adminRecipients,
            subject: adminSubject,
            html: adminHtml
          });
        } catch (adminErr) {
          console.error("Failed sending admin order alert email:", adminErr);
        }
      }

      res.json({
        success: true,
        sent: !!apiKey,
        usedSandbox,
        clientMailInfo,
        adminMailInfo
      });
    } catch (err: any) {
      console.error("Order notification handler failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Send signup welcome notification email (Parent Welcome + Admin Registration Alert)
  app.post("/api/notify/signup", async (req, res) => {
    try {
      const { parent_email, parent_phone, child_name, tag_id } = req.body;
      
      if (!parent_email) {
        return res.status(400).json({ error: "parent_email is required" });
      }

      const formattedTime = new Date().toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        dateStyle: "medium",
        timeStyle: "short"
      });

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
        ctaButton: {
          text: "Open Parent Dashboard",
          url: "https://lotap.co.za/dashboard"
        },
        footerNote: "Your child's privacy and safety are protected under POPIA regulations."
      });

      let info = null;
      let adminInfo = null;
      let usedSandbox = false;
      
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const resend = getResendClient();
        const rawFromEmail = process.env.RESEND_FROM_EMAIL;
        const fromEmail = (rawFromEmail && rawFromEmail !== "onboarding@resend.dev")
          ? rawFromEmail
          : "alerts@lotap.co.za";

        if (fromEmail === "onboarding@resend.dev") {
          usedSandbox = true;
        }

        // 1. Send Parent Welcome Email
        info = await resend.emails.send({
          from: `LoTap Alerts <${fromEmail}>`,
          to: parent_email,
          subject: parentSubject,
          html: parentHtml
        });

        // 2. Send Admin Registration Alert Email
        const adminRecipients = ["findmewebapp7@gmail.com", "johannesburgwebstudio@gmail.com"];
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
          ctaButton: {
            text: "Review in Admin Portal",
            url: "https://lotap.co.za/admin"
          }
        });

        try {
          adminInfo = await resend.emails.send({
            from: `LoTap Admin Alerts <${fromEmail}>`,
            to: adminRecipients,
            subject: adminSubject,
            html: adminHtml
          });
        } catch (adminErr) {
          console.error("Failed sending admin registration alert:", adminErr);
        }
      }

      res.json({
        success: true,
        sent: !!apiKey,
        usedSandbox,
        recipient: parent_email,
        subject: parentSubject,
        info,
        adminInfo
      });
    } catch (err: any) {
      console.error("Signup notification failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  const getAppUrl = (req: any) => {
    if (process.env.APP_URL) {
      return process.env.APP_URL.replace(/\/$/, "");
    }
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    return `${protocol}://${host}`;
  };




  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
