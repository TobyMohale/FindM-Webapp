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
      const { tag_id, finder_name, finder_phone, custom_note, timestamp } = req.body;
      
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

  // Send signup welcome notification email
  app.post("/api/notify/signup", async (req, res) => {
    try {
      const { parent_email, parent_phone, child_name, tag_id } = req.body;
      
      if (!parent_email) {
        return res.status(400).json({ error: "parent_email is required" });
      }

      const subject = `🎉 Welcome to LoTap: ${child_name}'s Safety Profile is Active!`;
      const html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
          <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #FFCFF1; padding-bottom: 16px;">
            <span style="font-size: 36px; display: inline-block; margin-bottom: 8px;">🎉</span>
            <h1 style="color: #051650; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Welcome to LoTap!</h1>
            <p style="color: #c54b8c; font-size: 13px; font-weight: bold; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">Your Parent Portal is Ready</p>
          </div>
          
          <div style="background-color: #fcf6fa; padding: 18px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #c54b8c;">
            <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #051650; font-weight: bold;">
              Hello Parent,
            </p>
            <p style="margin: 6px 0 0 0; font-size: 14px; line-height: 1.5; color: #334155;">
              Thank you for registering with LoTap. Your child's physical safety wristband has been successfully linked and configured under your secure parent profile!
            </p>
          </div>

          <h3 style="color: #051650; font-size: 14px; margin: 0 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Registered Profile Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Parent Email</td>
              <td style="padding: 10px 0; color: #051650; font-weight: 700; text-align: right;">${parent_email}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Registered Phone / WhatsApp</td>
              <td style="padding: 10px 0; color: #051650; font-weight: 700; text-align: right;">${parent_phone || 'Not Provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Child's Name</td>
              <td style="padding: 10px 0; color: #c54b8c; font-weight: 700; text-align: right;">👧 ${child_name}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Unique Tag Code (ID)</td>
              <td style="padding: 10px 0; color: #051650; font-weight: 700; font-family: monospace; text-align: right; background-color: #f1f5f9; padding: 4px 10px; border-radius: 6px; display: inline-block;">${tag_id}</td>
            </tr>
          </table>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 12px; margin-bottom: 24px;">
            <h4 style="color: #051650; margin: 0 0 8px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">How to use your LoTap band:</h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #334155;">
              <li style="margin-bottom: 6px;"><strong>Update at Any Time:</strong> If you change phone numbers, move, or need to update medical notes, simply log back into your LoTap Portal. The physical wristband will instantly pull the newest information!</li>
              <li style="margin-bottom: 6px;"><strong>Emergency Mode:</strong> In case your child is separated from you, toggle <strong>Emergency Broadcast Mode</strong> in your portal to display prominent, high-priority contact buttons on the public profile.</li>
              <li><strong>Scan Verification:</strong> Test scanning the QR code or tapping the physical NFC chip with a mobile phone. Verify that the contacts and medical guidelines look correct.</li>
            </ul>
          </div>

          <div style="background-color: #fcf6fa; border: 1px solid #FFCFF1; padding: 16px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #051650; font-weight: 600;">
              Your child's safety is our highest priority. All data is handled in strict compliance with the Protection of Personal Information Act (POPIA).
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
        const toEmail = parent_email;
        if (fromEmail === "onboarding@resend.dev") {
          usedSandbox = true;
        }

        info = await resend.emails.send({
          from: `LoTap Alerts <${fromEmail}>`,
          to: toEmail,
          subject,
          html
        });

        // Automatically send a registration confirmation alert to the LoTap administrators!
        const adminRecipients = ["findmewebapp7@gmail.com", "johannesburgwebstudio@gmail.com"];

        const adminSubject = `📢 NEW REGISTRATION: ${child_name}'s Profile Linked (${tag_id})`;
        const adminHtml = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #dce6f5; border-radius: 16px; background-color: #f8fafc; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #051650; padding-bottom: 12px;">
              <span style="font-size: 28px;">📢</span>
              <h2 style="color: #051650; margin: 6px 0 0 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.015em;">LoTap Admin Portal Alert</h2>
              <p style="color: #64748b; font-size: 11px; font-weight: bold; margin: 2px 0 0 0; text-transform: uppercase;">New User Account Connected</p>
            </div>
            
            <p style="font-size: 14px; line-height: 1.5; color: #334155;">
              A parent has successfully created a secure account and linked their child's safety wristband on the platform.
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px; font-weight: 600; color: #64748b;">Parent Email:</td>
                <td style="padding: 12px; font-weight: 700; color: #051650; text-align: right;">${parent_email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px; font-weight: 600; color: #64748b;">Contact / WhatsApp:</td>
                <td style="padding: 12px; font-weight: 700; color: #051650; text-align: right;">${parent_phone || 'Not Provided'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px; font-weight: 600; color: #64748b;">Child Name:</td>
                <td style="padding: 12px; font-weight: 700; color: #c54b8c; text-align: right;">👧 ${child_name}</td>
              </tr>
              <tr>
                <td style="padding: 12px; font-weight: 600; color: #64748b;">Wristband Code (Tag ID):</td>
                <td style="padding: 12px; font-weight: 700; color: #051650; text-align: right; font-family: monospace; font-size: 14px;">${tag_id}</td>
              </tr>
            </table>

            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 12px; border-radius: 8px; text-align: center; margin-top: 16px;">
              <p style="margin: 0; font-size: 11px; line-height: 1.4; color: #b45309; font-weight: 600;">
                Action Required: Check this child's medical info and profile label inside your secure Admin Dashboard.
              </p>
            </div>

            <div style="text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 20px;">
              LoTap Admin Notification Service &copy; 2026
            </div>
          </div>
        `;

        try {
          // Send confirmation alert directly to the admin addresses
          await resend.emails.send({
            from: `LoTap Admin Alerts <${fromEmail}>`,
            to: adminRecipients,
            subject: adminSubject,
            html: adminHtml
          });
        } catch (adminErr) {
          console.error("Failed to send administrative signup confirmation:", adminErr);
        }
      }

      res.json({
        success: true,
        sent: !!apiKey,
        usedSandbox,
        recipient: parent_email,
        subject,
        html,
        info
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
