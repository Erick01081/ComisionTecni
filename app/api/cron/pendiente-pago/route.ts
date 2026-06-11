import { NextRequest, NextResponse } from 'next/server';
import { enviarReportePendientePagoAdministradores } from '@/lib/reporte-pendiente-pago';

export const dynamic = 'force-dynamic';

/**
 * Verifica que la petición provenga del cron de Vercel o de un llamado autorizado
 *
 * Vercel envía el header Authorization: Bearer CRON_SECRET en las ejecuciones
 * programadas. También se permite invocar manualmente con el mismo secreto.
 *
 * Complejidad: O(1)
 *
 * @param request - Petición HTTP (NextRequest)
 * @returns true si la petición está autorizada (boolean)
 */
function esPeticionAutorizada(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[cron/pendiente-pago] CRON_SECRET no configurado');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Ejecuta el reporte semanal de facturas pendientes de pago
 *
 * Se programa para los viernes a las 2:00 p.m. (hora de Bogotá) mediante Vercel Cron.
 * Envía un correo a cada administrador con las facturas registradas entre el viernes
 * anterior a las 2:01 p.m. y el viernes actual a las 2:00 p.m.
 *
 * Complejidad: O(n + a) donde n es entregas y a es administradores
 *
 * @param request - Petición HTTP del cron (NextRequest)
 * @returns Respuesta JSON con el resultado del envío
 */
export async function GET(request: NextRequest) {
  if (!esPeticionAutorizada(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const resultado = await enviarReportePendientePagoAdministradores();

    return NextResponse.json({
      mensaje: 'Reporte de pendiente de pago procesado',
      cantidad_facturas: resultado.cantidadFacturas,
      total_valor: resultado.totalValor,
      correos_enviados: resultado.correosEnviados,
      correos_fallidos: resultado.correosFallidos,
      rango: {
        inicio: resultado.rango.inicioISO,
        fin: resultado.rango.finISO,
        inicio_texto: resultado.rango.inicioTexto,
        fin_texto: resultado.rango.finTexto,
      },
    });
  } catch (error) {
    console.error('[cron/pendiente-pago] Error:', error);
    return NextResponse.json(
      { error: 'Error al generar el reporte de pendiente de pago' },
      { status: 500 }
    );
  }
}
