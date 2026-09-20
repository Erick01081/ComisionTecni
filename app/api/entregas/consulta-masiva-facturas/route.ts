import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { esConsultaMasivaFacturas, obtenerUsuarioDesdeToken } from '@/lib/auth';

const MAX_FACTURAS = 200;

function obtenerClienteSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) return null;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Consulta en bloque los consecutivos de factura enviados por el usuario autorizado. */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const usuario = token ? await obtenerUsuarioDesdeToken(token) : null;

    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!esConsultaMasivaFacturas(usuario.email)) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const body = await request.json();
    if (!Array.isArray(body?.facturas)) {
      return NextResponse.json({ error: 'Debes enviar una lista de facturas.' }, { status: 400 });
    }

    const facturasSolicitadas: string[] = body.facturas
      .map((factura: unknown): string => String(factura).trim())
      .filter((factura: string) => /^\d+$/.test(factura))
      .slice(0, MAX_FACTURAS);
    const facturas = [...new Set(facturasSolicitadas)];

    if (facturasSolicitadas.length === 0) {
      return NextResponse.json({ error: 'No se encontraron consecutivos válidos.' }, { status: 400 });
    }

    const supabaseAdmin = obtenerClienteSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 });
    }

    const { data: entregas, error: errorEntregas } = await supabaseAdmin
      .from('entregas')
      .select('numero_factura, user_id, forma_pago, fecha_domicilio, valor')
      .in('numero_factura', facturas)
      .order('fecha_domicilio', { ascending: false });

    if (errorEntregas) {
      console.error('Error en consulta masiva de facturas:', errorEntregas);
      return NextResponse.json({ error: 'No fue posible buscar las facturas.' }, { status: 500 });
    }

    const userIds = [...new Set((entregas || []).map(entrega => entrega.user_id))];
    const usuarios = await Promise.all(userIds.map(async userId => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
      return [userId, data.user?.email || 'Usuario desconocido'] as const;
    }));
    const emailsPorUsuario = new Map(usuarios);

    const resultados = (entregas || []).map(entrega => ({
      numero_factura: entrega.numero_factura,
      usuario_email: emailsPorUsuario.get(entrega.user_id) || 'Usuario desconocido',
      forma_pago: entrega.forma_pago || 'No especificada',
      fecha_domicilio: entrega.fecha_domicilio,
      valor: entrega.valor,
    }));
    const encontradas = new Set(resultados.map(resultado => resultado.numero_factura));

    return NextResponse.json({
      resultados,
      no_encontradas: facturasSolicitadas.filter(factura => !encontradas.has(factura)),
      total_consultadas: facturasSolicitadas.length,
    });
  } catch (error) {
    console.error('Error en consulta masiva de facturas:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
