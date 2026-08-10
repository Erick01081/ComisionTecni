import { NextRequest, NextResponse } from 'next/server';
import { obtenerHistorialAlistamientos } from '@/lib/alistamientos-database';
import { obtenerAccessTokenDesdeRequest, obtenerUsuarioDesdeRequest } from '@/lib/request-auth';

export async function GET(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const accessToken = obtenerAccessTokenDesdeRequest(request);
    const historial = await obtenerHistorialAlistamientos(usuario.id, accessToken);
    return NextResponse.json(historial);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al consultar histórico' }, { status: 500 });
  }
}
