import nodemailer from 'nodemailer';

type SuperMoodPayload = {
  mood: string;
  note?: string | null;
  isUpdate: boolean;
};

const ALERT_EMAIL_TO =
  process.env.SUPER_INTENSITY_ALERT_EMAIL ?? '2681158691@qq.com';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const connectionUrl = process.env.SMTP_URL;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const service = process.env.SMTP_SERVICE;
  const explicitHost = process.env.SMTP_HOST;
  const explicitPort = process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT, 10)
    : undefined;
  const explicitSecure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : undefined;

  try {
    if (connectionUrl) {
      transporter = nodemailer.createTransport(connectionUrl);
      return transporter;
    }

    if (!user || !pass) {
      console.warn(
        '[email] Missing SMTP_USER/SMTP_PASS, skip sending alert emails.'
      );
      return null;
    }

    if (service) {
      transporter = nodemailer.createTransport({
        service,
        auth: { user, pass },
      });
      return transporter;
    }

    const inferredHost =
      explicitHost ||
      (user.endsWith('@qq.com') || user.endsWith('@foxmail.com')
        ? 'smtp.qq.com'
        : undefined);
    const host = inferredHost;
    const port =
      explicitPort ??
      (host === 'smtp.qq.com' ? 465 : host ? 587 : undefined);
    const secure =
      explicitSecure ?? (typeof port === 'number' ? port === 465 : true);

    if (!host || !port) {
      console.warn(
        '[email] Missing SMTP host/port configuration, skip sending alert emails.'
      );
      return null;
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  } catch (error) {
    console.error('[email] Failed to create SMTP transporter', error);
    return null;
  }

  return transporter;
}

export async function sendSuperMoodAlert(payload: SuperMoodPayload) {
  const mailer = getTransporter();
  if (!mailer) return;

  const subjectPrefix = payload.isUpdate ? '更新' : '新建';
  const smtpUser = process.env.SMTP_USER!;
  const customFrom = process.env.SMTP_FROM;

  // 只在自定义发件人看起来像邮箱地址或 "Name <email>" 时才使用，避免无效 MAIL FROM
  const validFrom =
    customFrom &&
    (/@/.test(customFrom) || /<[^>]+@[^>]+>/.test(customFrom))
      ? customFrom
      : smtpUser;

  const fromAddress = validFrom;

  const textLines = [
    `Piggy 刚刚${subjectPrefix}了一条情绪记录。`,
    `情绪：${payload.mood}`,
    `强度：超级`,
  ];

  if (payload.note) {
    textLines.push('', `留言：${payload.note}`);
  }

  await mailer.sendMail({
    from: fromAddress,
    to: ALERT_EMAIL_TO,
    subject: `Piggy 情绪提醒（${subjectPrefix}）`,
    text: textLines.join('\n'),
  });
}

