const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

export interface EmailTemplate {
  name: string;
  subject: string;
  body: string;
}

export const EMAIL_TEMPLATES = {
  DOCTOR_APPROVED: {
    name: 'doctor_approved',
    subject: 'Your Vyasa Doctor Account Has Been Approved! 🎉',
    body: `Dear {doctorName},

Congratulations! Your doctor account on Vyasa Integrated Healthcare has been approved.

You can now:
- Manage patient records and medical history
- Write prescriptions and share via WhatsApp
- Schedule consultations
- Access the full HMIS suite
- Connect with other doctors in the network

Login here: https://app.vyasaa.com/login

Your doctor profile is now live on our platform. Patients can book consultations with you directly.

If you have any questions, please contact our support team.

Best regards,
Vyasa Team
Integrated Healthcare Platform
vyasaa.com`
  },

  DOCTOR_REJECTED: {
    name: 'doctor_rejected',
    subject: 'Vyasa Account Registration Update',
    body: `Dear {doctorName},

Thank you for registering with Vyasa Integrated Healthcare.

Unfortunately, your account could not be approved at this time. The reason for rejection is:

{rejectionReason}

You can reapply with corrected information, or contact our support team for more details.

Support: support@vyasaa.com

Best regards,
Vyasa Team
Integrated Healthcare Platform`
  },

  BULK_EMAIL: {
    name: 'bulk_email',
    subject: '{subject}',
    body: `Dear {doctorName},

{body}

Best regards,
Vyasa Team
Integrated Healthcare Platform
vyasaa.com`
  }
};

export async function sendEmail(
  email: string,
  templateName: string,
  variables: Record<string, string>
): Promise<boolean> {
  try {
    const template = EMAIL_TEMPLATES[templateName as keyof typeof EMAIL_TEMPLATES];
    if (!template) throw new Error(`Unknown template: ${templateName}`);

    // Replace variables in template
    let subject = template.subject;
    let body = template.body;

    Object.entries(variables).forEach(([key, value]) => {
      subject = subject.replace(`{${key}}`, value);
      body = body.replace(`{${key}}`, value);
    });

    const response = await fetch(`${API_BASE}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject,
        body,
        templateName
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export async function sendBulkEmail(
  doctorEmails: Array<{ email: string; name: string }>,
  subject: string,
  body: string
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  for (const doctor of doctorEmails) {
    const sent = await sendEmail(doctor.email, 'BULK_EMAIL', {
      doctorName: doctor.name,
      subject,
      body
    });
    if (sent) succeeded++;
    else failed++;
  }

  return { succeeded, failed };
}
