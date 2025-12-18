import { NextRequest, NextResponse } from 'next/server';
import { crearEntrega, obtenerEntregasPorUsuario } from '@/lib/database';
import { obtenerUsuarioDesdeToken } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

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
 * Maneja las peticiones GET para obtener las entregas del usuario autenticado
 * 
 * Esta función verifica la autenticación del usuario y retorna todas sus entregas.
 * 
 * Complejidad: O(n) donde n es el número de entregas del usuario
 * 
 * @param request - Objeto de petición de Next.js
 * @returns Respuesta con las entregas del usuario o error
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

    // Obtener el token de acceso del header
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    const entregas = await obtenerEntregasPorUsuario(usuario.id, accessToken);

    return NextResponse.json(entregas);
  } catch (error: any) {
    console.error('Error al obtener entregas:', error);
    return NextResponse.json(
      { error: 'Error al obtener entregas' },
      { status: 500 }
    );
  }
}

/**
 * Maneja las peticiones POST para crear una nueva entrega
 * 
 * Esta función verifica la autenticación, valida los datos y crea una nueva entrega
 * asociada al usuario autenticado.
 * 
 * Complejidad: O(1) - Solo realiza una inserción
 * 
 * @param request - Objeto de petición de Next.js con los datos de la entrega
 * @returns Respuesta con la entrega creada o error
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);

    if (!usuario) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fecha_domicilio, numero_factura, valor } = body;

    // Validaciones
    if (!fecha_domicilio || !numero_factura || valor === undefined) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      return NextResponse.json(
        { error: 'El valor debe ser un número mayor a cero' },
        { status: 400 }
      );
    }

    const numeroFacturaTrim = numero_factura.trim();
    if (!numeroFacturaTrim) {
      return NextResponse.json(
        { error: 'El número de factura no puede estar vacío' },
        { status: 400 }
      );
    }

    // Obtener el token de acceso del header
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    
    // Intentar obtener el refresh token de las cookies
    const refreshToken = request.cookies.get('sb-refresh-token')?.value || '';

    const entrega = await crearEntrega(
      usuario.id,
      fecha_domicilio,
      numeroFacturaTrim,
      valorNumerico,
      accessToken,
      refreshToken
    );

    return NextResponse.json(entrega, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear entrega:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear entrega' },
      { status: 500 }
    );
  }
}
