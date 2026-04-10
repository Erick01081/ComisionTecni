import { NextRequest, NextResponse } from 'next/server';
import { obtenerUsuarioDesdeToken, esConsultaVentas } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

/**
 * Obtiene el cliente de Supabase con servicio admin
 * 
 * Crea un cliente con la service role key para poder consultar entregas
 * de todos los usuarios sin restricciones de RLS. Se necesita porque la
 * consulta por factura debe buscar en todas las entregas del sistema.
 * 
 * Complejidad: O(1)
 * 
 * @returns Cliente de Supabase con permisos admin o null si no está configurado
 */
function obtenerClienteSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return null;
}

/**
 * Obtiene el usuario autenticado desde la petición HTTP
 * 
 * Intenta obtener el usuario primero desde el header Authorization (Bearer token)
 * y luego desde las cookies de Supabase si no hay header.
 * 
 * Complejidad: O(1)
 * 
 * @param request - Objeto de petición de Next.js (NextRequest)
 * @returns Usuario autenticado o null si no se pudo autenticar
 */
async function obtenerUsuarioDesdeRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return await obtenerUsuarioDesdeToken(token);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (accessToken) {
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      if (!error && user) {
        return user;
      }
    }

    if (refreshToken) {
      const { data: { user }, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (!error && user) {
        return user;
      }
    }
  } catch (error) {
    console.error('Error al obtener usuario desde cookies:', error);
  }

  return null;
}

/**
 * Busca entregas por número de factura y retorna el correo del que entregó y la forma de pago
 * 
 * Este endpoint está restringido a los usuarios de ventas autorizados. Busca en todas
 * las entregas del sistema (usando service role para saltar RLS) y resuelve el email
 * del usuario que registró la entrega consultando Supabase Auth.
 * 
 * Complejidad: O(n) donde n es la cantidad de entregas que coinciden con la factura
 * 
 * @param request - Petición con query param `numero_factura` (NextRequest)
 * @returns JSON con array de resultados: { numero_factura, usuario_email, forma_pago } o error
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);

    if (!usuario) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    if (!esConsultaVentas(usuario.email)) {
      return NextResponse.json(
        { error: 'Acceso denegado. No tienes permisos para consultar facturas.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const numeroFactura = searchParams.get('numero_factura');

    if (!numeroFactura || numeroFactura.trim() === '') {
      return NextResponse.json(
        { error: 'El número de factura es obligatorio' },
        { status: 400 }
      );
    }

    const supabaseAdmin = obtenerClienteSupabaseAdmin();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Error de configuración del servidor' },
        { status: 500 }
      );
    }

    const { data: entregas, error: errorEntregas } = await supabaseAdmin
      .from('entregas')
      .select('*')
      .eq('numero_factura', numeroFactura.trim())
      .order('fecha_domicilio', { ascending: false });

    if (errorEntregas) {
      console.error('Error al buscar factura:', errorEntregas);
      return NextResponse.json(
        { error: 'Error al buscar la factura' },
        { status: 500 }
      );
    }

    if (!entregas || entregas.length === 0) {
      return NextResponse.json({
        resultados: [],
        mensaje: 'No se encontraron entregas con ese número de factura',
      });
    }

    const userIds = [...new Set(entregas.map(e => e.user_id))];
    const mapaUsuarios = new Map<string, string>();

    for (const userId of userIds) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!userError && userData?.user) {
        mapaUsuarios.set(userId, userData.user.email || 'Sin email');
      }
    }

    const resultados = entregas.map(entrega => ({
      numero_factura: entrega.numero_factura,
      usuario_email: mapaUsuarios.get(entrega.user_id) || 'Usuario desconocido',
      forma_pago: entrega.forma_pago || 'No especificada',
      fecha_domicilio: entrega.fecha_domicilio,
      valor: entrega.valor,
    }));

    return NextResponse.json({ resultados });
  } catch (error: any) {
    console.error('Error en consulta de factura:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
