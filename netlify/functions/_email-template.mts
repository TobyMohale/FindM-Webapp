// Shared by netlify/functions/notify-order.mts and notify-signup.mts.
// Deliberately kept separate from server.ts's copy of this same template -
// these standalone functions have zero dependency on the shared Express
// app/bundle on purpose.

export function buildLoTapEmailHtml({
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
                  ${contentBlocks.map(block => `
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px 20px; border-radius: 12px; margin-bottom: 24px;">
                      <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #051650; text-transform: uppercase; letter-spacing: 0.05em;">${block.title}</h3>
                      <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #334155;">
                        ${block.items.map(item => `<li style="margin-bottom: 6px;">${item}</li>`).join('')}
                      </ul>
                    </div>
                  `).join('')}
                  ${ctaButton ? `
                  <div style="text-align: center; margin: 28px 0 12px 0;">
                    <a href="${ctaButton.url}" target="_blank" style="display: inline-block; background-color: #051650; color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(5,22,80,0.25);">
                      ${ctaButton.text}
                    </a>
                  </div>
                  ` : ''}
                </td>
              </tr>
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

export function getFromEmail() {
  const rawFromEmail = process.env.RESEND_FROM_EMAIL;
  return (rawFromEmail && rawFromEmail !== "onboarding@resend.dev") ? rawFromEmail : "alerts@lotap.co.za";
}

export const ADMIN_RECIPIENTS = ["findmewebapp7@gmail.com", "johannesburgwebstudio@gmail.com"];

export function formattedNowSAST() {
  return new Date().toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    dateStyle: "medium",
    timeStyle: "short"
  });
}
