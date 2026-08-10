import { createClient } from '@supabase/supabase-js';
import { ItemChecklist, PerfilDomiciliario, EstadoAlistamiento } from '@/types/alistamiento';

function obtenerClienteSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function obtenerClienteSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function obtenerClienteAutenticado(accessToken?: string) {
  if (!accessToken) return obtenerClienteSupabase();
  const supabase = obtenerClienteSupabase();
  if (!supabase) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `******
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function obtenerPerfilDomiciliario(userId: string, accessToken?: string): Promise<PerfilDomiciliario | null> {
  const supabase = await obtenerClienteAutenticado(accessToken);
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('domiciliario_perfiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return data as PerfilDomiciliario | null;
}

export async function crearPerfilDomiciliarioSiNoExiste(userId: string, accessToken?: string): Promise<void> {
  const existente = await obtenerPerfilDomiciliario(userId, accessToken);
  if (existente) return;
  const supabase = await obtenerClienteAutenticado(accessToken);
  if (!supabase) return;
  await supabase.from('domiciliario_perfiles').insert([{ user_id: userId, es_domiciliario: false }]);
}

export async function obtenerItemsChecklist(): Promise<ItemChecklist[]> {
  const supabase = obtenerClienteSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('alistamiento_items_catalogo')
    .select('*')
    .order('orden', { ascending: true });
  if (error) return [];
  return (data || []) as ItemChecklist[];
}

export async function obtenerAlistamientoPorFecha(
  userId: string,
  fecha: string,
  accessToken?: string
) {
  const supabase = await obtenerClienteAutenticado(accessToken);
  if (!supabase) return null;
  const { data: alistamiento } = await supabase
    .from('alistamientos_diarios')
    .select('*')
    .eq('user_id', userId)
    .eq('fecha', fecha)
    .maybeSingle();
  if (!alistamiento) return null;
  const { data: detalles } = await supabase
    .from('alistamiento_detalles')
    .select('item_id, estado')
    .eq('alistamiento_id', alistamiento.id);
  return {
    ...alistamiento,
    items: (detalles || []) as Array<{ item_id: number; estado: EstadoAlistamiento }>,
  };
}

export async function obtenerAlistamientoPorId(userId: string, alistamientoId: string, accessToken?: string) {
  const supabase = await obtenerClienteAutenticado(accessToken);
  if (!supabase) return null;
  const { data: alistamiento } = await supabase
    .from('alistamientos_diarios')
    .select('*')
    .eq('user_id', userId)
    .eq('id', alistamientoId)
    .maybeSingle();
  if (!alistamiento) return null;
  const { data: detalles } = await supabase
    .from('alistamiento_detalles')
    .select('item_id, estado')
    .eq('alistamiento_id', alistamiento.id);
  return {
    ...alistamiento,
    items: (detalles || []) as Array<{ item_id: number; estado: EstadoAlistamiento }>,
  };
}

export async function crearAlistamientoDiario(params: {
  userId: string;
  fecha: string;
  observaciones?: string | null;
  estadosPorItem: Array<{ item_id: number; estado: EstadoAlistamiento }>;
  accessToken?: string;
}) {
  const { userId, fecha, observaciones, estadosPorItem, accessToken } = params;
  const supabase = await obtenerClienteAutenticado(accessToken);
  if (!supabase) {
    throw new Error('No se pudo inicializar cliente de base de datos');
  }

  const perfil = await obtenerPerfilDomiciliario(userId, accessToken);
  if (!perfil || !perfil.es_domiciliario || !perfil.placa) {
    throw new Error('El usuario no tiene un perfil de domiciliario habilitado con placa asignada');
  }

  const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
  const esFestivo = estadosPorItem.every((it) => it.estado === 'FESTIVO');

  const { data: cabecera, error: errorCabecera } = await supabase
    .from('alistamientos_diarios')
    .insert([
      {
        id,
        user_id: userId,
        fecha,
        placa_snapshot: perfil.placa,
        es_festivo: esFestivo,
        observaciones: observaciones?.trim() || null,
      },
    ])
    .select('*')
    .single();

  if (errorCabecera) {
    if (errorCabecera.code === '23505') {
      throw new Error('Ya existe un alistamiento para este usuario/motocicleta en la fecha seleccionada');
    }
    throw new Error(errorCabecera.message || 'No fue posible crear el alistamiento');
  }

  const detalles = estadosPorItem.map((item) => ({
    alistamiento_id: id,
    item_id: item.item_id,
    estado: item.estado,
  }));

  const { error: errorDetalles } = await supabase.from('alistamiento_detalles').insert(detalles);
  if (errorDetalles) {
    await supabase.from('alistamientos_diarios').delete().eq('id', id);
    throw new Error(errorDetalles.message || 'No fue posible crear los detalles del alistamiento');
  }

  return cabecera;
}

export async function obtenerHistorialAlistamientos(userId: string, accessToken?: string) {
  const supabase = await obtenerClienteAutenticado(accessToken);
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('alistamientos_diarios')
    .select('id, fecha, es_festivo, observaciones, created_at')
    .eq('user_id', userId)
    .order('fecha', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function listarPerfilesDomiciliariosAdmin() {
  const supabase = obtenerClienteSupabaseAdmin();
  if (!supabase) return [];

  const { data: perfiles, error } = await supabase
    .from('domiciliario_perfiles')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) return [];

  const mapaPerfiles = new Map<string, any>();
  for (const perfil of perfiles || []) {
    mapaPerfiles.set(perfil.user_id, perfil);
  }

  const mapaEmail = new Map<string, string>();
  const userIds: string[] = [];
  let page = 1;
  while (true) {
    const { data, error: errorUsers } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (errorUsers || !data?.users?.length) break;
    for (const user of data.users) {
      mapaEmail.set(user.id, user.email || '');
      userIds.push(user.id);
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  const salida = userIds.map((userId) => {
    const perfil = mapaPerfiles.get(userId);
    return {
      user_id: userId,
      es_domiciliario: perfil?.es_domiciliario || false,
      nombre_completo: perfil?.nombre_completo || null,
      cedula: perfil?.cedula || null,
      placa: perfil?.placa || null,
      soat: perfil?.soat || null,
      soat_vigencia: perfil?.soat_vigencia || null,
      revision_tecnico_mecanica: perfil?.revision_tecnico_mecanica || null,
      certificado_gases: perfil?.certificado_gases || null,
      tarjeta_propiedad: perfil?.tarjeta_propiedad || null,
      licencia_a2_vigencia: perfil?.licencia_a2_vigencia || null,
      created_at: perfil?.created_at || null,
      updated_at: perfil?.updated_at || null,
      email: mapaEmail.get(userId) || '',
    };
  });

  return salida.sort((a, b) => Number(b.es_domiciliario) - Number(a.es_domiciliario) || (a.email || '').localeCompare(b.email || ''));
}

export async function actualizarPerfilDomiciliarioAdmin(
  userId: string,
  cambios: Partial<PerfilDomiciliario>
) {
  const supabase = obtenerClienteSupabaseAdmin();
  if (!supabase) throw new Error('No hay configuración admin');

  const payload = {
    es_domiciliario: !!cambios.es_domiciliario,
    nombre_completo: cambios.nombre_completo || null,
    cedula: cambios.cedula || null,
    placa: cambios.placa || null,
    soat: cambios.soat || null,
    soat_vigencia: cambios.soat_vigencia || null,
    revision_tecnico_mecanica: cambios.revision_tecnico_mecanica || null,
    certificado_gases: cambios.certificado_gases || null,
    tarjeta_propiedad: cambios.tarjeta_propiedad || null,
    licencia_a2_vigencia: cambios.licencia_a2_vigencia || null,
  };

  const { data, error } = await supabase
    .from('domiciliario_perfiles')
    .upsert([{ user_id: userId, ...payload }], { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function obtenerResumenMensualAdmin(userId: string, year: number, month: number) {
  const supabase = obtenerClienteSupabaseAdmin();
  if (!supabase) throw new Error('No hay configuración admin');
  const inicio = `${year}-${String(month).padStart(2, '0')}-01`;
  const finDate = new Date(year, month, 0);
  const fin = `${year}-${String(month).padStart(2, '0')}-${String(finDate.getDate()).padStart(2, '0')}`;

  const { data: perfil } = await supabase
    .from('domiciliario_perfiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: alistamientos } = await supabase
    .from('alistamientos_diarios')
    .select('*')
    .eq('user_id', userId)
    .gte('fecha', inicio)
    .lte('fecha', fin)
    .order('fecha', { ascending: true });

  const ids = (alistamientos || []).map((a: any) => a.id);
  let detalles: any[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from('alistamiento_detalles')
      .select('alistamiento_id, item_id, estado')
      .in('alistamiento_id', ids);
    detalles = data || [];
  }

  const { data: catalogo } = await supabase
    .from('alistamiento_items_catalogo')
    .select('*')
    .order('orden', { ascending: true });

  return {
    perfil,
    alistamientos: alistamientos || [],
    detalles,
    catalogo: catalogo || [],
  };
}

export async function listarMesesConAlistamientoAdmin() {
  const supabase = obtenerClienteSupabaseAdmin();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('alistamientos_diarios')
    .select('fecha')
    .order('fecha', { ascending: false })
    .limit(5000);
  if (error) return [];

  const meses = new Set<string>();
  for (const row of data || []) {
    const fecha = String(row.fecha);
    meses.add(fecha.slice(0, 7));
  }
  return Array.from(meses).sort((a, b) => b.localeCompare(a));
}
