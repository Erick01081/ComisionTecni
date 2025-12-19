import { NextRequest, NextResponse } from 'next/server';
import { obtenerEntregasPorRangoFechas, calcularTotalesPorUsuario, calcularTotalGeneral } from '@/lib/database';
import { obtenerUsuarioDesdeToken, esAdministrador } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { EntregaConUsuario } from '@/types/entrega';

/**
 * Obtiene el cliente de Supabase con servicio admin
 * 
 * Esta función crea un cliente de Supabase usando la service role key
 * para acceder a funciones administrativas como listar usuarios.
 * 
 * Complejidad: O(1)
 * 
 * @returns Cliente de Supabase con permisos admin o null
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
 * Obtiene el usuario autenticado desde la petición
 * 
 * Esta función extrae el token de autorización del header de la petición
 * y verifica el usuario asociado.
 * 
 * Complejidad: O(1)
 * 
 * @param request - Objeto de petición de Next.js
 * @returns Usuario autenticado o null
 */
async function obtenerUsuarioDesdeRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return await obtenerUsuarioDesdeToken(token);
  }

  // Si no hay token en el header, intentar obtener la sesión desde cookies
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

    // Obtener el token de las cookies
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (accessToken) {
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      if (!error && user) {
        return user;
      }
    }

    // Intentar con el refresh token
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
 * Maneja las peticiones GET para consultar entregas en un rango de fechas (solo administradores)
 * 
 * Esta función verifica que el usuario sea administrador y retorna todas las entregas
 * en el rango de fechas especificado, junto con los totales calculados.
 * Obtiene los emails de los usuarios usando el servicio admin de Supabase.
 * 
 * Complejidad: O(n) donde n es el número de entregas en el rango
 * 
 * @param request - Objeto de petición de Next.js con los parámetros de fecha
 * @returns Respuesta con las entregas, totales por usuario y total general
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

    if (!esAdministrador(usuario.email)) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de administrador' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fecha_inicio');
    const fechaFin = searchParams.get('fecha_fin');

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: 'Las fechas de inicio y fin son obligatorias' },
        { status: 400 }
      );
    }

    // Usar las fechas directamente sin agregar hora (la columna es DATE)
    // Las fechas vienen en formato YYYY-MM-DD que es compatible con DATE de PostgreSQL
    // Usar servicio admin (usarAdmin=true) para evitar restricciones de RLS
    console.log('Consultando entregas con fechas:', { fechaInicio, fechaFin });
    
    const entregas = await obtenerEntregasPorRangoFechas(fechaInicio, fechaFin, true);
    console.log('Entregas encontradas:', entregas.length, entregas);
    
    const totalesPorUserId = await calcularTotalesPorUsuario(fechaInicio, fechaFin, true);
    const totalGeneral = await calcularTotalGeneral(fechaInicio, fechaFin, true);

    // Obtener emails de usuarios usando servicio admin
    const supabaseAdmin = obtenerClienteSupabaseAdmin();
    const mapaUsuarios = new Map<string, string>();

    if (supabaseAdmin) {
      try {
        const userIds = [...new Set(entregas.map(e => e.user_id))];
        
        // Obtener usuarios en lotes
        for (const userId of userIds) {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (!userError && userData?.user) {
            mapaUsuarios.set(userId, userData.user.email || 'Sin email');
          }
        }
      } catch (error) {
        console.error('Error al obtener usuarios:', error);
      }
    }

    // Combinar entregas con emails de usuarios
    const entregasConUsuario: EntregaConUsuario[] = entregas.map(entrega => ({
      ...entrega,
      usuario_email: mapaUsuarios.get(entrega.user_id) || 'Usuario desconocido',
    }));

    // Combinar totales con emails de usuarios
    const totalesPorUsuario = totalesPorUserId.map(item => ({
      usuario_email: mapaUsuarios.get(item.user_id) || 'Usuario desconocido',
      total: item.total,
    }));

    console.log('Respuesta final:', {
      cantidadEntregas: entregasConUsuario.length,
      cantidadTotales: totalesPorUsuario.length,
      totalGeneral,
      entregas: entregasConUsuario,
    });

    return NextResponse.json({
      entregas: entregasConUsuario,
      totales_por_usuario: totalesPorUsuario,
      total_general: totalGeneral,
      debug: {
        fechaInicio,
        fechaFin,
        cantidadEntregas: entregas.length,
        cantidadEntregasConUsuario: entregasConUsuario.length,
      },
    });
  } catch (error: any) {
    console.error('Error al consultar entregas:', error);
    return NextResponse.json(
      { error: 'Error al consultar entregas' },
      { status: 500 }
    );
  }
}

