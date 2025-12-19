import { NextRequest, NextResponse } from 'next/server';
import { actualizarEntrega, eliminarEntrega } from '@/lib/database';
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
 * Maneja las peticiones PUT para actualizar una entrega
 * 
 * Esta función verifica la autenticación del usuario y actualiza la entrega
 * solo si el usuario es el propietario.
 * 
 * Complejidad: O(1) - Solo realiza una actualización
 * 
 * @param request - Objeto de petición de Next.js con los datos actualizados
 * @param params - Parámetros de la ruta con el ID de la entrega
 * @returns Respuesta con la entrega actualizada o error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);

    if (!usuario) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const entregaId = params.id;
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

    // Normalizar la fecha
    let fechaNormalizada = String(fecha_domicilio).trim();
    if (fechaNormalizada.includes('T')) {
      fechaNormalizada = fechaNormalizada.split('T')[0];
    }
    if (fechaNormalizada.includes(' ')) {
      fechaNormalizada = fechaNormalizada.split(' ')[0];
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNormalizada)) {
      return NextResponse.json(
        { error: `Formato de fecha inválido: ${fecha_domicilio}. Se espera YYYY-MM-DD` },
        { status: 400 }
      );
    }

    // Obtener el token de acceso del header
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    const entrega = await actualizarEntrega(
      entregaId,
      usuario.id,
      fechaNormalizada,
      numeroFacturaTrim,
      valorNumerico,
      accessToken
    );

    return NextResponse.json(entrega);
  } catch (error: any) {
    console.error('Error al actualizar entrega:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar entrega' },
      { status: 500 }
    );
  }
}

/**
 * Maneja las peticiones DELETE para eliminar una entrega
 * 
 * Esta función verifica la autenticación del usuario y elimina la entrega
 * solo si el usuario es el propietario.
 * 
 * Complejidad: O(1) - Solo realiza una eliminación
 * 
 * @param request - Objeto de petición de Next.js
 * @param params - Parámetros de la ruta con el ID de la entrega
 * @returns Respuesta de éxito o error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);

    if (!usuario) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const entregaId = params.id;

    // Obtener el token de acceso del header
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    await eliminarEntrega(entregaId, usuario.id, accessToken);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar entrega:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar entrega' },
      { status: 500 }
    );
  }
}

