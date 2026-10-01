import { NextRequest, NextResponse } from 'next/server';
import { actualizarMantenimientoMoto, eliminarMantenimientoMoto } from '@/lib/alistamientos-database';
import { obtenerAccessTokenDesdeRequest, obtenerUsuarioDesdeRequest } from '@/lib/request-auth';

const ES_FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

function numeroOpcional(valor: unknown, campo: string): number | null {
  if (valor === '' || valor === null || valor === undefined) return null;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 0) throw new Error(`${campo} debe ser un número entero mayor o igual a cero`);
  return numero;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const fecha = String(body.fecha || '').trim();
    const descripcion = String(body.descripcion || '').trim();
    const kilometrajeActual = numeroOpcional(body.kilometraje_actual, 'El kilometraje actual');
    const kilometrajeProximoCambio = numeroOpcional(body.kilometraje_proximo_cambio, 'El kilometraje del próximo cambio');
    const valor = body.valor === '' || body.valor === null || body.valor === undefined ? null : Number(body.valor);

    if (!ES_FECHA_VALIDA.test(fecha)) return NextResponse.json({ error: 'La fecha no es válida' }, { status: 400 });
    if (!descripcion) return NextResponse.json({ error: 'La descripción es obligatoria' }, { status: 400 });
    if (descripcion.length > 1000) return NextResponse.json({ error: 'La descripción no puede superar 1000 caracteres' }, { status: 400 });
    if (kilometrajeActual === null) return NextResponse.json({ error: 'El kilometraje actual es obligatorio' }, { status: 400 });
    if (valor !== null && (!Number.isFinite(valor) || valor < 0)) return NextResponse.json({ error: 'El valor debe ser un número mayor o igual a cero' }, { status: 400 });

    const mantenimiento = await actualizarMantenimientoMoto({
      id: params.id,
      userId: usuario.id,
      fecha,
      descripcion,
      kilometrajeActual,
      kilometrajeProximoCambio,
      valor,
      accessToken: obtenerAccessTokenDesdeRequest(request),
    });

    return NextResponse.json({ mantenimiento });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al actualizar mantenimiento' }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    await eliminarMantenimientoMoto(params.id, usuario.id, obtenerAccessTokenDesdeRequest(request));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al eliminar mantenimiento' }, { status: 400 });
  }
}
