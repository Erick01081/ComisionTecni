import { NextRequest, NextResponse } from 'next/server';
import { crearMantenimientoMoto, listarMantenimientosPropios } from '@/lib/alistamientos-database';
import { obtenerAccessTokenDesdeRequest, obtenerUsuarioDesdeRequest } from '@/lib/request-auth';

const ES_FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

function numeroOpcional(valor: unknown, campo: string): number | null {
  if (valor === '' || valor === null || valor === undefined) return null;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 0) throw new Error(`${campo} debe ser un número entero mayor o igual a cero`);
  return numero;
}

export async function GET(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const mantenimientos = await listarMantenimientosPropios(usuario.id, obtenerAccessTokenDesdeRequest(request));
    return NextResponse.json({ mantenimientos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al consultar mantenimientos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const mantenimiento = await crearMantenimientoMoto({
      userId: usuario.id,
      fecha,
      descripcion,
      kilometrajeActual,
      kilometrajeProximoCambio,
      valor,
      accessToken: obtenerAccessTokenDesdeRequest(request),
    });
    return NextResponse.json({ mantenimiento }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al guardar mantenimiento' }, { status: 400 });
  }
}
