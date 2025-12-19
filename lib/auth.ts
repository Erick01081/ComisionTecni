import { createClient } from '@supabase/supabase-js';

/**
 * Obtiene el cliente de Supabase para autenticación
 * 
 * Esta función crea y retorna un cliente de Supabase configurado
 * para operaciones de autenticación. Utiliza las variables de entorno
 * para la configuración.
 * 
 * Complejidad: O(1)
 * 
 * @returns Cliente de Supabase o null si no está configurado
 */
export function obtenerClienteSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    return createClient(supabaseUrl, supabaseKey);
  }

  return null;
}

/**
 * Verifica si un usuario está autenticado (para uso en cliente)
 * 
 * Esta función consulta la sesión actual del usuario en Supabase Auth.
 * Se utiliza para proteger rutas y verificar acceso a funcionalidades.
 * 
 * Complejidad: O(1) - Solo consulta la sesión almacenada
 * 
 * @returns Objeto con el usuario autenticado o null si no hay sesión
 */
export async function obtenerUsuarioActual() {
  const supabase = obtenerClienteSupabase();
  
  if (!supabase) {
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    return null;
  }
}

/**
 * Obtiene el usuario desde un token de acceso (para uso en servidor/API routes)
 * 
 * Esta función verifica un token de acceso de Supabase y retorna el usuario asociado.
 * Se utiliza en las rutas de API del servidor para autenticar peticiones.
 * 
 * Complejidad: O(1) - Solo verifica el token
 * 
 * @param token - Token de acceso de Supabase (string)
 * @returns Objeto con el usuario autenticado o null si el token es inválido
 */
export async function obtenerUsuarioDesdeToken(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error al obtener usuario desde token:', error);
    return null;
  }
}

/**
 * Verifica si un usuario es administrador
 * 
 * Esta función verifica si el email del usuario está en la lista de
 * administradores. La lista de administradores se define mediante
 * la variable de entorno ADMIN_EMAILS (separados por comas).
 * 
 * Complejidad: O(1) - Verificación simple de array
 * 
 * @param email - Email del usuario a verificar (string)
 * @returns true si el usuario es administrador, false en caso contrario (boolean)
 */
export function esAdministrador(email: string | undefined): boolean {
  if (!email) {
    return false;
  }

  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
  const listaAdmins = adminEmails.split(',').map(e => e.trim().toLowerCase());
  
  return listaAdmins.includes(email.toLowerCase());
}

/**
 * Inicia sesión con email y contraseña
 * 
 * Esta función autentica al usuario usando Supabase Auth.
 * Si la autenticación es exitosa, se establece la sesión.
 * 
 * Complejidad: O(1) - Solo realiza una llamada de autenticación
 * 
 * @param email - Email del usuario (string)
 * @param password - Contraseña del usuario (string)
 * @returns Objeto con el usuario autenticado o null si falla
 */
export async function iniciarSesion(email: string, password: string) {
  const supabase = obtenerClienteSupabase();
  
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data.user;
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    throw error;
  }
}

/**
 * Registra un nuevo usuario
 * 
 * Esta función crea un nuevo usuario en Supabase Auth con email y contraseña.
 * 
 * Complejidad: O(1) - Solo realiza una llamada de registro
 * 
 * @param email - Email del nuevo usuario (string)
 * @param password - Contraseña del nuevo usuario (string)
 * @returns Objeto con el usuario creado o null si falla
 */
export async function registrarUsuario(email: string, password: string) {
  const supabase = obtenerClienteSupabase();
  
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data.user;
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    throw error;
  }
}

/**
 * Cierra la sesión del usuario actual
 * 
 * Esta función cierra la sesión activa en Supabase Auth.
 * 
 * Complejidad: O(1) - Solo realiza una llamada de cierre de sesión
 * 
 * @returns true si se cerró correctamente, false en caso contrario
 */
export async function cerrarSesion(): Promise<boolean> {
  const supabase = obtenerClienteSupabase();
  
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error al cerrar sesión:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return false;
  }
}

/**
 * Envía un email de recuperación de contraseña
 * 
 * Esta función envía un email al usuario con un enlace para restablecer su contraseña.
 * Supabase maneja el envío del email y la validación del token.
 * 
 * Complejidad: O(1) - Solo realiza una llamada a la API de Supabase
 * 
 * @param email - Email del usuario que quiere recuperar su contraseña (string)
 * @returns Promise que se resuelve cuando se envía el email
 * @throws Error si el email no es válido o si hay un problema al enviar el email
 */
export async function recuperarContrasena(email: string): Promise<void> {
  const supabase = obtenerClienteSupabase();
  
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
  });

  if (error) {
    throw new Error(error.message || 'Error al enviar el email de recuperación');
  }
}

