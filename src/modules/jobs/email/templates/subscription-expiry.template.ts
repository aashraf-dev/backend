import { ISubscriptionExpiryJob } from '../../interfaces';

export function subscriptionExpiryTemplate(data: ISubscriptionExpiryJob): {
  subject: string;
  html: string;
  text: string;
} {
  const urgency = data.daysRemaining <= 3 ? 'urgent' : 'upcoming';
  const colorMap = {
    urgent: { bg: '#fef2f2', border: '#fecaca', badge: '#dc2626' },
    upcoming: { bg: '#fffbeb', border: '#fde68a', badge: '#d97706' },
  };
  const colors = colorMap[urgency];

  const expiresAt = new Date(data.expiresAt);
  const formattedDate = expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject =
    data.daysRemaining <= 1
      ? `⚠️ URGENT: Your Vetos subscription expires TODAY — ${data.tenantName}`
      : `Action Required: Your Vetos subscription expires in ${data.daysRemaining} day(s) — ${data.tenantName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;
                    box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr>
          <td style="background:${colors.badge};padding:32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:22px;">
              Subscription Expiry Notice
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 24px;color:#374151;font-size:16px;">
              Dear ${data.tenantName} team,
            </p>

            <table width="100%" cellpadding="16"
                   style="background:${colors.bg};border:1px solid ${colors.border};
                          border-radius:8px;margin-bottom:24px;">
              <tr>
                <td>
                  <p style="margin:0 0 8px;color:#374151;font-size:16px;font-weight:600;">
                    Your <strong>${data.subscriptionPlan}</strong> subscription expires
                    ${data.daysRemaining === 0 ? 'today' : `in <strong>${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''}</strong>`}.
                  </p>
                  <p style="margin:0;color:#6b7280;font-size:14px;">
                    Expiry date: <strong>${formattedDate}</strong>
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              To continue providing uninterrupted service to your clients,
              please renew your subscription before the expiry date.
            </p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
              If your subscription lapses, your clinic portal will be suspended
              until renewed.
            </p>

            <div style="text-align:center;margin-bottom:24px;">
              <a href="https://admin.vetos.com"
                 style="display:inline-block;background:#2563eb;color:#ffffff;
                        text-decoration:none;padding:14px 32px;border-radius:6px;
                        font-size:15px;font-weight:600;">
                Renew Now
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;padding:20px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              Vetos Platform · admin@vetos.com
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text =
    `Subscription Expiry Notice\n\n` +
    `Dear ${data.tenantName} team,\n\n` +
    `Your ${data.subscriptionPlan} subscription expires ` +
    (data.daysRemaining === 0 ? 'today' : `in ${data.daysRemaining} day(s)`) +
    ` (${formattedDate}).\n\n` +
    `Please renew at https://admin.vetos.com to avoid service interruption.\n\n` +
    `Vetos Platform`;

  return { subject, html, text };
}
