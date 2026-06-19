import { IAppointmentReminderJob } from '../../interfaces';

export function appointmentReminderTemplate(data: IAppointmentReminderJob): {
  subject: string;
  html: string;
  text: string;
} {
  const apptDate = new Date(data.scheduledAt);
  const formattedDate = apptDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = apptDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const when =
    data.reminderHours >= 24
      ? `tomorrow (${formattedDate})`
      : `today in ${data.reminderHours} hours`;

  const subject = `Appointment Reminder — ${data.petName} at ${data.tenantName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;
                    box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <!-- Header -->
        <tr>
          <td style="background:#2563eb;padding:32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:22px;">
              Appointment Reminder
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#374151;font-size:16px;">
              Hi ${data.ownerFirstName},
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:16px;">
              This is a friendly reminder that
              <strong>${data.petName}</strong> has an appointment
              <strong>${when}</strong>.
            </p>

            <!-- Appointment Card -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#eff6ff;border-radius:8px;
                          border:1px solid #bfdbfe;margin-bottom:24px;">
              <tr>
                <td style="padding:24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="color:#6b7280;font-size:13px;
                                 text-transform:uppercase;letter-spacing:.05em;
                                 padding-bottom:4px;">Patient</td>
                      <td style="color:#111827;font-size:15px;
                                 font-weight:600;">${data.petName}</td>
                    </tr>
                    <tr><td colspan="2" style="padding:6px 0;"><hr style="border:none;border-top:1px solid #dbeafe;"/></td></tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;
                                 text-transform:uppercase;letter-spacing:.05em;
                                 padding-bottom:4px;">Veterinarian</td>
                      <td style="color:#111827;font-size:15px;">Dr. ${data.vetName}</td>
                    </tr>
                    <tr><td colspan="2" style="padding:6px 0;"><hr style="border:none;border-top:1px solid #dbeafe;"/></td></tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;
                                 text-transform:uppercase;letter-spacing:.05em;
                                 padding-bottom:4px;">Date</td>
                      <td style="color:#111827;font-size:15px;">${formattedDate}</td>
                    </tr>
                    <tr><td colspan="2" style="padding:6px 0;"><hr style="border:none;border-top:1px solid #dbeafe;"/></td></tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;
                                 text-transform:uppercase;letter-spacing:.05em;
                                 padding-bottom:4px;">Time</td>
                      <td style="color:#111827;font-size:15px;">${formattedTime}</td>
                    </tr>
                    ${
                      data.serviceName
                        ? `
                    <tr><td colspan="2" style="padding:6px 0;"><hr style="border:none;border-top:1px solid #dbeafe;"/></td></tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;
                                 text-transform:uppercase;letter-spacing:.05em;
                                 padding-bottom:4px;">Service</td>
                      <td style="color:#111827;font-size:15px;">${data.serviceName}</td>
                    </tr>`
                        : ''
                    }
                    <tr><td colspan="2" style="padding:6px 0;"><hr style="border:none;border-top:1px solid #dbeafe;"/></td></tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;
                                 text-transform:uppercase;letter-spacing:.05em;
                                 padding-bottom:4px;">Clinic</td>
                      <td style="color:#111827;font-size:15px;">${data.tenantName}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">
              Need to reschedule? Please contact us at least 24 hours in advance
              via your pet portal or by calling the clinic directly.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f3f4f6;padding:20px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              ${data.tenantName} · Powered by Vetos Platform
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text =
    `Hi ${data.ownerFirstName},\n\n` +
    `Reminder: ${data.petName} has an appointment ${when}.\n\n` +
    `Vet: Dr. ${data.vetName}\n` +
    `Date: ${formattedDate} at ${formattedTime}\n` +
    (data.serviceName ? `Service: ${data.serviceName}\n` : '') +
    `\nClinic: ${data.tenantName}\n\n` +
    `To reschedule, contact us at least 24 hours in advance.`;

  return { subject, html, text };
}
