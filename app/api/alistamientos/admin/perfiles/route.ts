import { NextRequest, NextResponse } from 'next/server';
import { actualizarPerfilDomiciliarioAdmin, listarPerfilesDomiciliariosAdmin } from '@/lib/alistamientos-database';
import { esAdministrador } from '@/lib/auth';
import { obtenerUsuarioDesdeRequest } from '@/lib/request-auth';

export async function GET(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!esAdministrador(usuario.email)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    const perfiles = await listarPerfilesDomiciliariosAdmin();
    return NextResponse.json(perfiles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al listar perfiles' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!esAdministrador(usuario.email)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    const body = await request.json();
    const userId = String(body.user_id || '').trim();
    if (!userId) return NextResponse.json({ error: 'user_id es obligatorio' }, { status: 400 });
    const actualizado = await actualizarPerfilDomiciliarioAdmin(userId, body);
    return NextResponse.json(actualizado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al actualizar perfil' }, { status: 500 });
  }
}
