/**
 * Parámetros para enviar un correo electrónico
 */
export interface ParametrosCorreo {
  destinatario: string;
  asunto: string;
  contenidoHtml: string;
}

/**
 * Envía un correo electrónico usando la API de Resend
 *
 * Se utiliza Resend porque la aplicación no tenía infraestructura de correo
 * y Resend se integra de forma sencilla con Vercel y Next.js mediante una
 * llamada HTTP sin dependencias adicionales.
 *
 * Complejidad: O(1) - Una sola petición HTTP
 *
 * @param parametros - Datos del correo (destinatario, asunto, contenidoHtml)
 * @returns true si el correo se envió correctamente (boolean)
 */
export async function enviarCorreo(parametros: ParametrosCorreo): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const remitente = process.env.EMAIL_FROM;

  if (!apiKey || !remitente) {
    console.error('[enviarCorreo] Faltan RESEND_API_KEY o EMAIL_FROM en variables de entorno');
    return false;
  }

  try {
    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: remitente,
        to: [parametros.destinatario],
        subject: parametros.asunto,
        html: parametros.contenidoHtml,
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.error('[enviarCorreo] Error de Resend:', respuesta.status, detalle);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[enviarCorreo] Error al enviar correo:', error);
    return false;
  }
}
