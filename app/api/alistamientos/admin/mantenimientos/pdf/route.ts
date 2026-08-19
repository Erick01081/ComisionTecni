import { NextRequest, NextResponse } from 'next/server';
import { esAdministrador } from '@/lib/auth';
import { obtenerReporteMantenimientosAdmin } from '@/lib/alistamientos-database';
import { generarPdfMantenimientosMoto } from '@/lib/alistamiento-pdf';
import { obtenerUsuarioDesdeRequest } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!esAdministrador(usuario.email)) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    const userId = request.nextUrl.searchParams.get('user_id');
    if (!userId) return NextResponse.json({ error: 'user_id es obligatorio' }, { status: 400 });

    const reporte = await obtenerReporteMantenimientosAdmin(userId);
    const pdf = await generarPdfMantenimientosMoto(reporte);
    const placa = String(reporte.perfil.placa).replace(/[^a-zA-Z0-9-]/g, '');
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="mantenimientos-${placa || userId}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al generar PDF' }, { status: 500 });
  }
}
