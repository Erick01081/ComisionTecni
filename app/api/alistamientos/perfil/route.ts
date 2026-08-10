import { NextRequest, NextResponse } from 'next/server';
import { crearPerfilDomiciliarioSiNoExiste, obtenerPerfilDomiciliario } from '@/lib/alistamientos-database';
import { obtenerAccessTokenDesdeRequest, obtenerUsuarioDesdeRequest } from '@/lib/request-auth';

export async function GET(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const accessToken = obtenerAccessTokenDesdeRequest(request);
    await crearPerfilDomiciliarioSiNoExiste(usuario.id, accessToken);
    const perfil = await obtenerPerfilDomiciliario(usuario.id, accessToken);
    return NextResponse.json(perfil);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al obtener perfil' }, { status: 500 });
  }
}
