import nodemailer from 'nodemailer';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SMTP_FROM = process.env.SMTP_FROM || '"PickCrane" <no-reply@pickcrane.local>';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function obtenerTransportador() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    console.warn(
      '[email] No hay SMTP_HOST configurado en .env — los correos NO se van a enviar de verdad, solo se van a imprimir en esta consola.'
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

async function enviar(destinatario: string, asunto: string, html: string) {
  const t = obtenerTransportador();
  if (!t) {
    // Sin SMTP configurado (ej: primeras pruebas locales) — no rompe el
    // flujo de registro/recuperación, solo avisa por consola para poder
    // seguir probando (el link de verificación/recuperación queda en el html).
    console.log(`\n[email] (SMTP no configurado) Para: ${destinatario} | Asunto: ${asunto}\n${html}\n`);
    return;
  }

  try {
    await t.sendMail({ from: SMTP_FROM, to: destinatario, subject: asunto, html });
  } catch (err) {
    // Un correo que falla nunca debe tumbar el registro/login del usuario.
    console.error('[email] Error enviando correo:', err);
  }
}

const plantillaBase = (contenido: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background:#121212; color:#ffffff; border-radius: 12px;">
    <h1 style="color:#FFC107; font-size: 20px; margin-bottom: 4px;">🚛 PickCrane</h1>
    ${contenido}
    <p style="color:#888; font-size: 12px; margin-top: 32px;">Si no reconoces esta acción, puedes ignorar este correo.</p>
  </div>
`;

export async function enviarCorreoBienvenidaYVerificacion(email: string, nombre: string, token: string) {
  const link = `${FRONTEND_URL}/verificar?token=${token}`;
  await enviar(
    email,
    '¡Bienvenido a PickCrane! Verifica tu cuenta',
    plantillaBase(`
      <p>Hola ${nombre},</p>
      <p>Gracias por registrarte en <strong>PickCrane</strong>. Para activar tu cuenta, confirma tu correo con el siguiente botón:</p>
      <p style="text-align:center; margin: 24px 0;">
        <a href="${link}" style="background:#FFC107; color:#000; padding: 12px 24px; border-radius: 8px; text-decoration:none; font-weight:bold;">Verificar mi cuenta</a>
      </p>
      <p style="font-size:12px; color:#aaa;">O copia y pega este enlace en tu navegador:<br>${link}</p>
    `)
  );
}

export async function enviarCorreoRecuperacion(email: string, nombre: string, token: string) {
  const link = `${FRONTEND_URL}/restablecer?token=${token}`;
  await enviar(
    email,
    'Recupera tu contraseña de PickCrane',
    plantillaBase(`
      <p>Hola ${nombre},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Este enlace vale por 1 hora:</p>
      <p style="text-align:center; margin: 24px 0;">
        <a href="${link}" style="background:#FFC107; color:#000; padding: 12px 24px; border-radius: 8px; text-decoration:none; font-weight:bold;">Restablecer contraseña</a>
      </p>
      <p style="font-size:12px; color:#aaa;">O copia y pega este enlace en tu navegador:<br>${link}</p>
    `)
  );
}
