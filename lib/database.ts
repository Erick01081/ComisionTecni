import { createClient } from '@supabase/supabase-js';
import { Entrega, EntregaConUsuario } from '@/types/entrega';

const TABLA_ENTREGAS = 'entregas';

/**
 * Obtiene el cliente de Supabase si está configurado
 * 
 * Esta función verifica si las variables de entorno de Supabase están configuradas
 * y retorna una instancia del cliente. Si no están configuradas, retorna null.
 * Se utiliza para todas las operaciones de base de datos.
 * 
 * Complejidad: O(1)
 * 
 * @returns Cliente de Supabase o null si no está configurado
 */
function obtenerClienteSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    return createClient(supabaseUrl, supabaseKey);
  }

  return null;
}

/**
 * Crea una nueva entrega en la base de datos
 * 
 * Esta función crea un nuevo registro de entrega asociado al usuario autenticado.
 * El ID se genera usando timestamp y un string aleatorio para garantizar unicidad.
 * La fecha de creación se genera automáticamente.
 * Requiere un token de acceso para autenticar la petición y cumplir con RLS.
 * 
 * Complejidad: O(1) - Solo realiza una inserción
 * 
 * @param user_id - ID del usuario autenticado (string)
 * @param fecha_domicilio - Fecha del domicilio en formato ISO (string)
 * @param numero_factura - Número de factura (string)
 * @param valor - Valor de la entrega (number)
 * @param accessToken - Token de acceso de Supabase para autenticar la petición (string, opcional)
 * @param refreshToken - Token de refresco de Supabase (string, opcional)
 * @returns La entrega creada (Entrega)
 */
export async function crearEntrega(
  user_id: string,
  fecha_domicilio: string,
  numero_factura: string,
  valor: number,
  accessToken?: string,
  refreshToken?: string
): Promise<Entrega> {
  // Normalizar la fecha para que solo contenga YYYY-MM-DD (sin hora ni zona horaria)
  // Esto es necesario porque la columna en la BD es de tipo DATE
  // El input de tipo date devuelve YYYY-MM-DD directamente, así que solo necesitamos
  // extraer la parte de la fecha si viene con hora (por si acaso)
  let fechaNormalizada = fecha_domicilio.trim();
  
  // Si la fecha viene con hora o zona horaria, extraer solo la parte de la fecha
  if (fechaNormalizada.includes('T')) {
    fechaNormalizada = fechaNormalizada.split('T')[0];
  }
  
  // Si la fecha viene con espacio (formato alternativo), extraer solo la parte de la fecha
  if (fechaNormalizada.includes(' ')) {
    fechaNormalizada = fechaNormalizada.split(' ')[0];
  }
  
  // Validar que la fecha esté en formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNormalizada)) {
    throw new Error(`Formato de fecha inválido: ${fecha_domicilio}. Se espera YYYY-MM-DD`);
  }

  const nuevaEntrega: Entrega = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    user_id,
    fecha_domicilio: fechaNormalizada,
    numero_factura,
    valor,
    created_at: new Date().toISOString(),
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase no está configurado');
  }

  // Crear cliente autenticado si se proporciona el token
  let supabase;
  if (accessToken) {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    // Establecer la sesión con ambos tokens para que RLS funcione
    if (refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } else {
      // Si no hay refresh token, intentar usar solo el access token
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '',
      });
    }
  } else {
    supabase = obtenerClienteSupabase();
  }

  if (!supabase) {
    throw new Error('No se pudo crear el cliente de Supabase');
  }

  try {
    const { data, error } = await supabase
      .from(TABLA_ENTREGAS)
      .insert([nuevaEntrega])
      .select()
      .single();

    if (error) {
      console.error('Error al crear entrega en Supabase:', error);
      throw new Error(`Error de Supabase: ${error.message}`);
    }

    return data as Entrega;
  } catch (error) {
    console.error('Error al crear entrega:', error);
    throw error;
  }
}

/**
 * Obtiene todas las entregas de un usuario específico
 * 
 * Esta función consulta la tabla de entregas y retorna todas las entregas
 * asociadas al usuario autenticado, ordenadas por fecha de domicilio descendente.
 * Requiere un token de acceso para autenticar la petición y cumplir con RLS.
 * 
 * Complejidad: O(n) donde n es el número de entregas del usuario
 * 
 * @param user_id - ID del usuario (string)
 * @param accessToken - Token de acceso de Supabase para autenticar la petición (string, opcional)
 * @returns Array de entregas ordenadas por fecha de domicilio descendente (Entrega[])
 */
export async function obtenerEntregasPorUsuario(user_id: string, accessToken?: string): Promise<Entrega[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    console.error('[obtenerEntregasPorUsuario] No hay URL de Supabase configurada');
    return [];
  }

  if (!supabaseKey) {
    console.error('[obtenerEntregasPorUsuario] No hay clave de Supabase configurada');
    return [];
  }

  // Crear cliente autenticado si se proporciona el token
  let supabase;
  if (accessToken) {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } else {
    supabase = obtenerClienteSupabase();
  }

  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(TABLA_ENTREGAS)
      .select('*')
      .eq('user_id', user_id)
      .order('fecha_domicilio', { ascending: false });

    if (error) {
      console.error('Error al leer entregas desde Supabase:', error);
      return [];
    }

    return (data || []) as Entrega[];
  } catch (error) {
    console.error('Error al leer entregas desde Supabase:', error);
    return [];
  }
}

/**
 * Obtiene todas las entregas dentro de un rango de fechas usando servicio admin
 * 
 * Esta función consulta todas las entregas del sistema dentro del rango especificado.
 * Se utiliza en el panel de administrador. Requiere usar el servicio admin para
 * evitar restricciones de RLS. Los emails de los usuarios se obtienen
 * en la ruta de API usando el servicio admin de Supabase.
 * 
 * Complejidad: O(n) donde n es el número de entregas en el rango
 * 
 * @param fecha_inicio - Fecha de inicio del rango en formato YYYY-MM-DD (string)
 * @param fecha_fin - Fecha de fin del rango en formato YYYY-MM-DD (string)
 * @param usarAdmin - Si es true, usa el servicio admin para evitar RLS (boolean, opcional)
 * @returns Array de entregas (Entrega[])
 */
export async function obtenerEntregasPorRangoFechas(
  fecha_inicio: string,
  fecha_fin: string,
  usarAdmin: boolean = false
): Promise<Entrega[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = usarAdmin 
    ? process.env.SUPABASE_SERVICE_ROLE_KEY 
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('[obtenerEntregasPorRangoFechas] Iniciando consulta:', {
    fecha_inicio,
    fecha_fin,
    usarAdmin,
    tieneServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    tieneAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!supabaseUrl) {
    console.error('[obtenerEntregasPorRangoFechas] No hay URL de Supabase');
    return [];
  }

  if (!supabaseKey) {
    console.error('[obtenerEntregasPorRangoFechas] No hay clave de Supabase. usarAdmin:', usarAdmin);
    return [];
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Normalizar las fechas para asegurar que estén en formato YYYY-MM-DD
    // Si vienen con hora, extraer solo la fecha
    const fechaInicioNormalizada = fecha_inicio.split('T')[0];
    const fechaFinNormalizada = fecha_fin.split('T')[0];

    console.log('[obtenerEntregasPorRangoFechas] Fechas normalizadas:', {
      fechaInicioNormalizada,
      fechaFinNormalizada,
    });

    // Primero, hacer una consulta de prueba para ver todas las entregas (solo para debug)
    const { data: todasEntregas, error: errorTodas } = await supabase
      .from(TABLA_ENTREGAS)
      .select('*')
      .limit(10);
    
    console.log('[obtenerEntregasPorRangoFechas] Todas las entregas (primeras 10):', {
      cantidad: todasEntregas?.length || 0,
      entregas: todasEntregas,
      error: errorTodas,
    });

    // Si hay error al obtener todas, puede ser un problema de permisos
    if (errorTodas) {
      console.error('[obtenerEntregasPorRangoFechas] Error al obtener todas las entregas:', errorTodas);
    }

    // Obtener todas las entregas en el rango
    // Usar >= y <= para incluir ambas fechas límite
    const { data: entregas, error: errorEntregas } = await supabase
      .from(TABLA_ENTREGAS)
      .select('*')
      .gte('fecha_domicilio', fechaInicioNormalizada)
      .lte('fecha_domicilio', fechaFinNormalizada)
      .order('fecha_domicilio', { ascending: false });

    if (errorEntregas) {
      console.error('[obtenerEntregasPorRangoFechas] Error al leer entregas desde Supabase:', errorEntregas);
      console.error('[obtenerEntregasPorRangoFechas] Fechas usadas:', { fechaInicioNormalizada, fechaFinNormalizada });
      console.error('[obtenerEntregasPorRangoFechas] Usando admin:', usarAdmin);
      return [];
    }

    console.log('[obtenerEntregasPorRangoFechas] Entregas encontradas en rango:', {
      cantidad: entregas?.length || 0,
      entregas: entregas,
    });

    return (entregas || []) as Entrega[];
  } catch (error) {
    console.error('[obtenerEntregasPorRangoFechas] Error al leer entregas desde Supabase:', error);
    return [];
  }
}

/**
 * Calcula los totales por usuario dentro de un rango de fechas
 * 
 * Esta función agrupa las entregas por user_id y calcula el total
 * de cada usuario. Se utiliza en el panel de administrador.
 * Los emails se obtienen en la ruta de API usando el servicio admin.
 * 
 * Complejidad: O(n) donde n es el número de entregas en el rango
 * 
 * @param fecha_inicio - Fecha de inicio del rango en formato ISO (string)
 * @param fecha_fin - Fecha de fin del rango en formato ISO (string)
 * @returns Array de totales por user_id (Array<{user_id: string, total: number}>)
 */
export async function calcularTotalesPorUsuario(
  fecha_inicio: string,
  fecha_fin: string,
  usarAdmin: boolean = false
): Promise<Array<{ user_id: string; total: number }>> {
  const entregas = await obtenerEntregasPorRangoFechas(fecha_inicio, fecha_fin, usarAdmin);

  // Agrupar por user_id y sumar valores
  const totalesMap = new Map<string, number>();

  entregas.forEach(entrega => {
    const userId = entrega.user_id;
    const totalActual = totalesMap.get(userId) || 0;
    totalesMap.set(userId, totalActual + entrega.valor);
  });

  // Convertir a array y ordenar por total descendente
  const totales = Array.from(totalesMap.entries()).map(([user_id, total]) => ({
    user_id,
    total,
  }));

  totales.sort((a, b) => b.total - a.total);

  return totales;
}

/**
 * Calcula el total general dentro de un rango de fechas
 * 
 * Esta función suma todos los valores de las entregas en el rango especificado.
 * Se utiliza en el panel de administrador.
 * 
 * Complejidad: O(n) donde n es el número de entregas en el rango
 * 
 * @param fecha_inicio - Fecha de inicio del rango en formato ISO (string)
 * @param fecha_fin - Fecha de fin del rango en formato ISO (string)
 * @returns Total general (number)
 */
export async function calcularTotalGeneral(
  fecha_inicio: string,
  fecha_fin: string,
  usarAdmin: boolean = false
): Promise<number> {
  const entregas = await obtenerEntregasPorRangoFechas(fecha_inicio, fecha_fin, usarAdmin);

  return entregas.reduce((total, entrega) => total + entrega.valor, 0);
}

