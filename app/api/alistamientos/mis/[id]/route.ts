import { NextRequest, NextResponse } from 'next/server';
import { obtenerAlistamientoPorId, obtenerItemsChecklist } from '@/lib/alistamientos-database';
import { obtenerAccessTokenDesdeRequest, obtenerUsuarioDesdeRequest } from '@/lib/request-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const accessToken = obtenerAccessTokenDesdeRequest(request);
    const alistamiento = await obtenerAlistamientoPorId(usuario.id, params.id, accessToken);
    if (!alistamiento) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const items = await obtenerItemsChecklist();
    return NextResponse.json({ alistamiento, items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al consultar alistamiento' }, { status: 500 });
  }
}
