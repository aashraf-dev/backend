export function registrationWelcomeTemplate(data: {
  firstName: string;
  clinicName: string;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Welcome to ${data.clinicName}'s Pet Portal`;

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
          <td style="background:#059669;padding:32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;">Welcome to ${data.clinicName}!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="color:#374151;font-size:16px;">Hi ${data.firstName},</p>
            <p style="color:#374151;font-size:16px;">
              Your pet owner account has been created. You can now:
            </p>
            <ul style="color:#374151;font-size:15px;line-height:1.8;">
              <li>Register and manage your pets</li>
              <li>Book appointments online</li>
              <li>View medical records and prescriptions</li>
              <li>Track upcoming visits</li>
            </ul>
            <div style="text-align:center;margin:28px 0;">
              <a href="${data.portalUrl}"
                 style="background:#059669;color:#ffffff;text-decoration:none;
                        padding:14px 32px;border-radius:6px;font-size:15px;
                        font-weight:600;display:inline-block;">
                Access Your Portal
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;padding:20px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              ${data.clinicName} · Powered by Vetos
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text =
    `Welcome to ${data.clinicName}!\n\n` +
    `Hi ${data.firstName},\n\n` +
    `Your account is ready. Visit your portal: ${data.portalUrl}\n\n` +
    `${data.clinicName} · Powered by Vetos`;

  return { subject, html, text };
}
