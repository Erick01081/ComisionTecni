import { NextRequest, NextResponse } from 'next/server';
import { esAdministrador } from '@/lib/auth';
import { obtenerUsuarioDesdeRequest } from '@/lib/request-auth';
import { listarMesesConAlistamientoAdmin } from '@/lib/alistamientos-database';

export async function GET(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!esAdministrador(usuario.email)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    const meses = await listarMesesConAlistamientoAdmin();
    return NextResponse.json({ meses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al listar meses' }, { status: 500 });
  }
}
