import { NextRequest, NextResponse } from 'next/server';
import { esAdministrador } from '@/lib/auth';
import { obtenerUsuarioDesdeRequest } from '@/lib/request-auth';
import { generarPdfAlistamientoMensual } from '@/lib/alistamiento-pdf';
import { obtenerResumenMensualAdmin } from '@/lib/alistamientos-database';

export async function GET(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!esAdministrador(usuario.email)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const userId = request.nextUrl.searchParams.get('user_id');
    const monthParam = request.nextUrl.searchParams.get('month');
    if (!userId || !monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return NextResponse.json({ error: 'Parámetros user_id y month (YYYY-MM) son obligatorios' }, { status: 400 });
    }

    const [yearStr, monthStr] = monthParam.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'Mes inválido' }, { status: 400 });
    }

    const resumen = await obtenerResumenMensualAdmin(userId, year, month);
    const pdf = await generarPdfAlistamientoMensual({
      perfil: resumen.perfil,
      catalogo: resumen.catalogo,
      alistamientos: resumen.alistamientos,
      detalles: resumen.detalles,
      month,
      year,
    });

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="alistamiento-${monthParam}-${userId}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al generar PDF' }, { status: 500 });
  }
}
