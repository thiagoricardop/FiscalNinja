import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'FiscalNinja <fiscalninjaco@gmail.com>';

// ═══════════════════════════════════════════════════════
// TEAM INVITE EMAIL
// ═══════════════════════════════════════════════════════

interface InviteEmailParams {
  to: string;
  inviteUrl: string;
  role: 'manager' | 'driver';
  companyName: string;
  ownerName: string | null;
}

export async function sendTeamInviteEmail({
  to,
  inviteUrl,
  role,
  companyName,
  ownerName,
}: InviteEmailParams) {
  const roleName = role === 'manager' ? 'Manager' : 'Driver';
  const inviter = ownerName ?? companyName;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've been invited to join ${companyName} on FiscalNinja`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">FiscalNinja</h1>
              <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">AI-Powered Receipt Management</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:600;">
                You're invited to join ${companyName}
              </h2>
              <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                ${inviter} has invited you to join their team on FiscalNinja as a <strong style="color:#1e293b;">${roleName}</strong>.
              </p>

              <!-- Role info box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#eff6ff;border-radius:8px;padding:16px 20px;border:1px solid #dbeafe;">
                    <p style="margin:0 0 4px;color:#1e40af;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                      Your Role: ${roleName}
                    </p>
                    <p style="margin:0;color:#3b82f6;font-size:13px;line-height:1.5;">
                      ${role === 'driver'
                        ? 'Upload receipts, view your own expenses, and track spending on the go.'
                        : 'View reports, manage receipts, and help run day-to-day operations.'}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a
                      href="${inviteUrl}"
                      style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;letter-spacing:0.02em;"
                    >
                      Accept Invite &amp; Get Started
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;text-align:center;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:4px 0 0;word-break:break-all;font-size:12px;color:#64748b;text-align:center;">
                <a href="${inviteUrl}" style="color:#2563eb;text-decoration:underline;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
                This invite was sent to ${to}. If you weren't expecting this email, you can safely ignore it.
              </p>
              <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px;text-align:center;">
                &copy; ${new Date().getFullYear()} FiscalNinja. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) {
    console.error('[email/invite] Resend error:', error);
    throw new Error(`Failed to send invite email: ${error.message}`);
  }

  return data;
}
