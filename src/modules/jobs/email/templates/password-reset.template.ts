export function passwordResetTemplate(data: {
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): { subject: string; html: string; text: string } {
  const subject = 'Reset Your Vetos Password';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#2563eb;padding:32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;">Password Reset Request</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="color:#374151;font-size:16px;">Hi ${data.firstName},</p>
            <p style="color:#374151;font-size:16px;">
              We received a request to reset your password.
              This link will expire in <strong>${data.expiresInMinutes} minutes</strong>.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${data.resetUrl}"
                 style="background:#2563eb;color:#ffffff;text-decoration:none;
                        padding:14px 32px;border-radius:6px;font-size:15px;
                        font-weight:600;display:inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color:#6b7280;font-size:14px;">
              If you did not request this, you can safely ignore this email.
              Your password will not change.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;padding:20px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              Vetos Platform · This link expires in ${data.expiresInMinutes} minutes.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text =
    `Hi ${data.firstName},\n\n` +
    `Reset your password: ${data.resetUrl}\n` +
    `This link expires in ${data.expiresInMinutes} minutes.\n\n` +
    `If you did not request this, ignore this email.`;

  return { subject, html, text };
}
