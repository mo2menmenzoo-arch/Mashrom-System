import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendJoinRequestEmail(opts: {
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  role: string;
}) {
  const adminEmails = ["mo2menmenzoo@gmail.com", "mahmoudmenzoo@gmail.com"];
  const roleLabel: Record<string, string> = {
    OPERATOR: "مشغّل",
    ACCOUNTANT: "محاسب",
    VIEWER: "مراقب",
  };

  await transporter.sendMail({
    from: `"نظام الماشروم" <${process.env.SMTP_USER}>`,
    to: adminEmails.join(", "),
    subject: `🍄 طلب انضمام جديد — ${opts.requesterName}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #e8f5ee; border-radius: 12px; overflow: hidden;">
        <div style="background: #1a6b3c; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">🍄 طلب انضمام جديد</h2>
        </div>
        <div style="padding: 24px; background: #f9f9f9;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; color: #666;">الاسم</td><td style="padding: 8px; font-weight: bold;">${opts.requesterName}</td></tr>
            <tr><td style="padding: 8px; color: #666;">الإيميل</td><td style="padding: 8px; font-weight: bold;">${opts.requesterEmail}</td></tr>
            <tr><td style="padding: 8px; color: #666;">التليفون</td><td style="padding: 8px; font-weight: bold;">${opts.requesterPhone}</td></tr>
            <tr><td style="padding: 8px; color: #666;">الدور المطلوب</td><td style="padding: 8px; font-weight: bold;">${roleLabel[opts.role] ?? opts.role}</td></tr>
          </table>
        </div>
        <div style="padding: 16px; background: #f0faf4; text-align: center;">
          <p style="color: #1a6b3c; margin: 0; font-size: 13px;">افتح تطبيق الماشروم → الإعدادات → المستخدمون → فعّل الحساب</p>
        </div>
      </div>
    `,
  });
}
