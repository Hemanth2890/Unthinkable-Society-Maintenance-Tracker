import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Society Tracker <notices@yoursociety.app>";

export async function sendStatusChangeEmail(params: {
  to: string;
  residentName: string;
  complaintId: string;
  category: string;
  newStatus: string;
  note?: string | null;
}) {
  const { to, residentName, complaintId, category, newStatus, note } = params;
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Complaint #${complaintId.slice(-6).toUpperCase()} — status updated to ${newStatus}`,
      html: `
        <p>Hi ${residentName},</p>
        <p>Your complaint in category <strong>${category}</strong> has been updated to
        <strong>${newStatus.replace("_", " ")}</strong>.</p>
        ${note ? `<p><em>Admin note:</em> ${note}</p>` : ""}
        <p>Log in to the resident portal to view the full history.</p>
      `,
    });
  } catch (err) {
    // Email failures must never block the underlying DB transaction result.
    console.error("Failed to send status-change email:", err);
  }
}

export async function sendImportantNoticeEmail(params: {
  to: string[];
  title: string;
  body: string;
}) {
  const { to, title, body } = params;
  if (to.length === 0) return;
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `[Important Notice] ${title}`,
      html: `<h2>${title}</h2><p>${body}</p>`,
    });
  } catch (err) {
    console.error("Failed to send important-notice email:", err);
  }
}
