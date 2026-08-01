const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

const EMAIL_HEADER = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;background:#f1f5f9;padding:20px 16px;">
  <div style="background:#0a1628;padding:36px 28px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <img src="https://app.vyasaa.com/email-assets/vyasa-email-logo-v1.jpg" width="92" alt="Vyasa" style="display:block;width:92px;height:92px;margin:0 auto 18px;border:6px solid #ffffff;border-radius:16px;box-sizing:border-box;background:#000000;" />
    <div style="color:#ffffff;font-size:34px;font-weight:900;letter-spacing:12px;font-family:Georgia,'Times New Roman',serif;line-height:1;text-transform:uppercase;margin-bottom:14px;">VYASA</div>
    <div style="display:inline-block;width:48px;height:2px;background:#0d9488;border-radius:2px;margin-bottom:12px;"></div>
    <div style="color:#94a3b8;font-size:10px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;">Integrated Healthcare Pvt. Ltd.</div>
  </div>
  <div style="background:#ffffff;padding:28px 28px 24px;border:1px solid #e2e8f0;border-top:3px solid #0d9488;border-radius:0 0 12px 12px;font-size:14px;color:#1e293b;line-height:1.7;">
`;

const EMAIL_FOOTER = `
  </div>
  <div style="text-align:center;padding:16px 0 4px;font-size:11px;color:#94a3b8;">
    © 2025 Vyasa Integrated Healthcare Pvt. Ltd. &nbsp;·&nbsp;
    <a href="https://vyasaa.com" style="color:#0d9488;text-decoration:none;">vyasaa.com</a> &nbsp;·&nbsp;
    <a href="mailto:support@vyasaa.com" style="color:#0d9488;text-decoration:none;">support@vyasaa.com</a>
  </div>
</div>
`;

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
  },

  INACTIVE_30_DAYS: {
    name: 'inactive_30_days',
    subject: 'We miss you on Vyasa, {doctorName} 👋',
    body: `Dear Dr. {doctorName},

We noticed you haven't logged into Vyasa Health OS in a while, and we wanted to check in.

Your digital clinic is still here, fully set up and ready to go. Here's what's waiting for you:

• Your patient records are safe and intact
• Any pending OPD bookings are queued for your review
• New prescription features have been added since your last visit

Thousands of doctors across India are using Vyasa daily to:
✓ Write and share prescriptions via WhatsApp in seconds
✓ Manage their complete OPD digitally
✓ Accept bookings from new patients online

Log in now and pick up right where you left off:
https://app.vyasaa.com/login

If you're facing any issues or have feedback, reply to this email — we'd love to hear from you.

Warm regards,
Vyasa Health Support Team
support@vyasaa.com | vyasaa.com`
  },

  INACTIVE_60_DAYS: {
    name: 'inactive_60_days',
    subject: 'Your Vyasa account hasn\'t been used in 2 months — action needed',
    body: `Dear Dr. {doctorName},

Your Vyasa Health OS account has been inactive for over 60 days.

We want to make sure your account continues to serve you well. To maintain your active status and ensure your profile remains visible to patients, we encourage you to log in and update your availability.

What you may be missing:
• Patients may be searching for you on vyasaa.com/doctors
• New features: IPD management, Lab orders, Digital OPD queue
• Referral and specialist network access

Please log in at your earliest convenience:
https://app.vyasaa.com/login

If you're experiencing any difficulties or would like a one-on-one walkthrough of the platform, simply reply to this email or WhatsApp us and we'll schedule a support call.

If you no longer wish to use Vyasa, please let us know so we can update your account status accordingly.

Best regards,
Vyasa Health Support Team
support@vyasaa.com`
  },

  FEATURE_HIGHLIGHT: {
    name: 'feature_highlight',
    subject: 'New on Vyasa — Features you haven\'t tried yet, Dr. {doctorName}',
    body: `Dear Dr. {doctorName},

We've been working hard on Vyasa Health OS, and there's a lot that's new since you last logged in.

🆕 What's new on Vyasa:

1. IPD Discharge Summaries — Generate professional discharge notes with one click. Includes vitals trend, lab results, prescriptions, and follow-up instructions, all formatted on your prescription pad.

2. Instant WhatsApp Prescriptions — Share prescriptions directly to patient's WhatsApp with your clinic branding, signature, and QR code.

3. Lab Orders & Results — Order investigations digitally, attach PDF reports, and flag critical values.

4. OPD Queue Management — Manage your waiting room in real time. Nurses can update vitals and patients can be triaged before you see them.

5. Booking Page — Your personal page at vyasaa.com/dr/{profileSlug} lets patients book appointments online directly.

Log in and explore:
https://app.vyasaa.com/login

Questions or feedback? We're always listening.
reply to this email or reach us at support@vyasaa.com

Best,
Vyasa Product Team
vyasaa.com`
  },

  PATIENT_WAITING: {
    name: 'patient_waiting',
    subject: 'Patients are looking for doctors like you on Vyasa',
    body: `Dear Dr. {doctorName},

We wanted to let you know that patients in your area are actively searching for specialists on Vyasa.

Your profile at vyasaa.com is set up and can start receiving booking requests today — but we've noticed you haven't logged in recently to review them.

To ensure you don't miss out on new patients:

1. Log in to Vyasa: https://app.vyasaa.com/login
2. Go to Bookings → Review any pending requests
3. Set your availability under Schedule → Today's Slots

Patients trust doctors who are actively maintaining their digital presence. A complete profile with recent activity ranks higher in search results on our platform.

If you'd like help completing your profile or setting up your public booking page, we're happy to assist.

Reach us: support@vyasaa.com

Best regards,
Vyasa Health Team
vyasaa.com`
  },

  ACCOUNT_REVIEW: {
    name: 'account_review',
    subject: 'Your Vyasa account is scheduled for review — Dr. {doctorName}',
    body: `Dear Dr. {doctorName},

This is an important notice regarding your Vyasa Health OS account.

Due to extended inactivity, your account has been flagged for periodic review. This is a routine process we carry out to ensure our platform serves only active, practicing medical professionals.

No action is needed if you plan to continue using Vyasa — simply log in to confirm your account is active:
https://app.vyasaa.com/login

If you've stopped practicing, changed your contact details, or wish to close your account, please reply to this email with your request.

Your patient data and account settings will remain intact as long as your account is active.

We value your presence on Vyasa and hope to continue supporting your practice.

For any queries: support@vyasaa.com

Regards,
Vyasa Administration
Vyasa Integrated Healthcare Pvt. Ltd.
vyasaa.com`
  },

  FIRST_NUDGE: {
    name: 'first_nudge',
    subject: 'How was your day at the clinic, Dr {doctorName}? ☀️',
    body: `Dear Dr. {doctorName},

I'll keep this short — this is a personal note, not an automated blast.

How has your day at the clinic been?

We built Vyasa for one reason: to take the boring, repetitive parts of your day — writing prescriptions, hunting for an old patient's file, managing the OPD queue — and make them take seconds instead of minutes. So you get more time for the part that actually matters: your patients.

Your account is already set up and waiting. If you have just 2 minutes today, log in and write your very first prescription — I genuinely think you'll feel the difference the moment you hit print:

👉 https://app.vyasaa.com/login

And honestly? I'd love to hear back from you. Reply to this email and tell me one thing — what slows you down the most in your clinic every day? It comes straight to our team, and we read every single reply.

Here whenever you need us.

Warmly,
Nilanjan & the Vyasa team
support@vyasaa.com | vyasaa.com`
  },

  CUSTOM: {
    name: 'custom',
    subject: '{subject}',
    body: `Dear Dr. {doctorName},

{body}

Best regards,
Vyasa Health Support Team
support@vyasaa.com | vyasaa.com`
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

    // Wrap plain-text body in branded HTML email shell
    const htmlBody = EMAIL_HEADER + body.replace(/\n/g, '<br>') + EMAIL_FOOTER;

    const response = await fetch(`${API_BASE}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject,
        body: htmlBody,
        templateName
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Send a pre-composed subject+body directly — HTML wrapper applied, no template substitution
export async function sendDirectEmail(
  email: string,
  subject: string,
  body: string
): Promise<boolean> {
  try {
    const htmlBody = EMAIL_HEADER + body.replace(/\n/g, '<br>') + EMAIL_FOOTER;
    const response = await fetch(`${API_BASE}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, subject, body: htmlBody, templateName: 'direct' })
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
