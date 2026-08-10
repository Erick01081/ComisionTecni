import { NextRequest, NextResponse } from 'next/server';
import {
  crearAlistamientoDiario,
  crearPerfilDomiciliarioSiNoExiste,
  obtenerAlistamientoPorFecha,
  obtenerItemsChecklist,
  obtenerPerfilDomiciliario,
} from '@/lib/alistamientos-database';
import { EstadoAlistamiento } from '@/types/alistamiento';
import { obtenerAccessTokenDesdeRequest, obtenerUsuarioDesdeRequest } from '@/lib/request-auth';

const ESTADOS_VALIDOS: EstadoAlistamiento[] = ['BUENO', 'MALO', 'NO_APLICA', 'FESTIVO'];

function fechaHoyBogota() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
}

export async function GET(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const accessToken = obtenerAccessTokenDesdeRequest(request);
    await crearPerfilDomiciliarioSiNoExiste(usuario.id, accessToken);
    const perfil = await obtenerPerfilDomiciliario(usuario.id, accessToken);
    const items = await obtenerItemsChecklist();
    const fecha = request.nextUrl.searchParams.get('fecha') || fechaHoyBogota();
    const alistamientoHoy = await obtenerAlistamientoPorFecha(usuario.id, fecha, accessToken);

    return NextResponse.json({ perfil, items, fecha, alistamientoHoy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al cargar datos del alistamiento' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const fecha = String(body.fecha || '').trim();
    const observaciones = typeof body.observaciones === 'string' ? body.observaciones : null;
    const items = Array.isArray(body.items) ? body.items : [];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    }

    const catalogo = await obtenerItemsChecklist();
    if (catalogo.length === 0) {
      return NextResponse.json({ error: 'No hay catálogo de checklist configurado' }, { status: 500 });
    }

    if (items.length !== catalogo.length) {
      return NextResponse.json({ error: 'Todos los elementos del checklist deben tener estado' }, { status: 400 });
    }

    const idsCatalogo = new Set(catalogo.map((i) => i.id));
    const idsRecibidos = new Set<number>();
    for (const item of items) {
      if (!idsCatalogo.has(item.item_id)) {
        return NextResponse.json({ error: 'Ítem de checklist inválido' }, { status: 400 });
      }
      if (!ESTADOS_VALIDOS.includes(item.estado)) {
        return NextResponse.json({ error: 'Estado inválido en checklist' }, { status: 400 });
      }
      idsRecibidos.add(item.item_id);
    }

    if (idsRecibidos.size !== catalogo.length) {
      return NextResponse.json({ error: 'Todos los ítems deben estar presentes una sola vez' }, { status: 400 });
    }

    const accessToken = obtenerAccessTokenDesdeRequest(request);
    const existente = await obtenerAlistamientoPorFecha(usuario.id, fecha, accessToken);
    if (existente) {
      return NextResponse.json({ error: 'Ya existe un alistamiento para esta fecha' }, { status: 409 });
    }

    const creado = await crearAlistamientoDiario({
      userId: usuario.id,
      fecha,
      observaciones,
      estadosPorItem: items,
      accessToken,
    });

    return NextResponse.json(creado, { status: 201 });
  } catch (error: any) {
    const status = error.message?.includes('Ya existe un alistamiento') ? 409 : 500;
    return NextResponse.json({ error: error.message || 'Error al guardar alistamiento' }, { status });
  }
}
