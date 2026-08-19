import { NextRequest, NextResponse } from 'next/server';
import { esAdministrador } from '@/lib/auth';
import { listarMantenimientosAdmin } from '@/lib/alistamientos-database';
import { obtenerUsuarioDesdeRequest } from '@/lib/request-auth';

export async function GET(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!esAdministrador(usuario.email)) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    const userId = request.nextUrl.searchParams.get('user_id') || undefined;
    const mantenimientos = await listarMantenimientosAdmin(userId);
    return NextResponse.json({ mantenimientos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al consultar mantenimientos' }, { status: 500 });
  }
}
