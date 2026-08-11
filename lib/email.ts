/**
 * Parámetros para enviar un correo electrónico
 */
export interface ParametrosCorreo {
  destinatario: string | string[];
  asunto: string;
  contenidoHtml: string;
}

/**
 * Resultado del intento de envío de un correo
 */
export interface ResultadoEnvioCorreo {
  exito: boolean;
  error?: string;
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
 * @returns Resultado con éxito o mensaje de error (ResultadoEnvioCorreo)
 */
export async function enviarCorreo(parametros: ParametrosCorreo): Promise<ResultadoEnvioCorreo> {
  const apiKey = process.env.RESEND_API_KEY;
  const remitente = process.env.EMAIL_FROM;

  if (!apiKey) {
    const error = 'Falta RESEND_API_KEY en variables de entorno';
    console.error(`[enviarCorreo] ${error}`);
    return { exito: false, error };
  }

  if (!remitente) {
    const error = 'Falta EMAIL_FROM en variables de entorno';
    console.error(`[enviarCorreo] ${error}`);
    return { exito: false, error };
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
        to: Array.isArray(parametros.destinatario) ? parametros.destinatario : [parametros.destinatario],
        subject: parametros.asunto,
        html: parametros.contenidoHtml,
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      const error = `Resend ${respuesta.status}: ${detalle}`;
      console.error('[enviarCorreo] Error de Resend:', error);
      return { exito: false, error };
    }

    return { exito: true };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido al enviar correo';
    console.error('[enviarCorreo] Error al enviar correo:', mensaje);
    return { exito: false, error: mensaje };
  }
}
