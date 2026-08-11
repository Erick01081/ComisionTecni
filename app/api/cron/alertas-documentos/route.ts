import { NextRequest, NextResponse } from 'next/server';
import { enviarAlertasDocumentos } from '@/lib/alertas-documentos';

export const dynamic = 'force-dynamic';

function esPeticionAutorizada(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/alertas-documentos] CRON_SECRET no configurado');
    return false;
  }
  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

/** Ejecuta la revisión diaria de vencimientos de SOAT y técnico-mecánica. */
export async function GET(request: NextRequest) {
  if (!esPeticionAutorizada(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const resultado = await enviarAlertasDocumentos();
    return NextResponse.json({
      mensaje: resultado.enviado ? 'Alertas de documentos enviadas' : 'No hay documentos próximos a vencer',
      cantidad_alertas: resultado.alertas.length,
      alertas: resultado.alertas,
    });
  } catch (error) {
    console.error('[cron/alertas-documentos] Error:', error);
    return NextResponse.json({ error: 'Error al procesar alertas de documentos' }, { status: 500 });
  }
}
