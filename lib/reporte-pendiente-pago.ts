import { obtenerEmailsAdministradores } from '@/lib/auth';
import { obtenerEntregasPendientePagoPorRangoCreacion } from '@/lib/database';
import { enviarCorreo } from '@/lib/email';
import { EntregaConUsuario, FORMA_PAGO_PENDIENTE } from '@/types/entrega';
import { createClient } from '@supabase/supabase-js';

const ZONA_HORARIA = 'America/Bogota';

/**
 * Rango de fechas del corte semanal de facturas pendientes de pago
 */
export interface RangoCorteViernes {
  inicio: Date;
  fin: Date;
  inicioISO: string;
  finISO: string;
  inicioTexto: string;
  finTexto: string;
}

/**
 * Resultado del envío del reporte semanal
 */
export interface ErrorEnvioCorreo {
  correo: string;
  error: string;
}

export interface ResultadoReportePendientePago {
  rango: RangoCorteViernes;
  cantidadFacturas: number;
  totalValor: number;
  correosEnviados: string[];
  correosFallidos: string[];
  erroresEnvio: ErrorEnvioCorreo[];
}

/**
 * Obtiene los componentes de una fecha en la zona horaria de Bogotá
 *
 * Se usa Intl para evitar dependencias externas y manejar correctamente
 * la hora local de Colombia en el servidor.
 *
 * Complejidad: O(1)
 *
 * @param fecha - Fecha a convertir (Date)
 * @returns Componentes de la fecha en Bogotá (objeto con year, month, day, hour, minute, second)
 */
function obtenerComponentesFechaBogota(fecha: Date) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(fecha);

  const obtenerValor = (tipo: string) => partes.find(parte => parte.type === tipo)?.value || '0';

  return {
    year: Number(obtenerValor('year')),
    month: Number(obtenerValor('month')),
    day: Number(obtenerValor('day')),
    hour: Number(obtenerValor('hour')),
    minute: Number(obtenerValor('minute')),
    second: Number(obtenerValor('second')),
  };
}

/**
 * Crea una fecha en hora de Bogotá (UTC-5)
 *
 * Colombia no tiene horario de verano, por lo que el offset -05:00 es fijo.
 *
 * Complejidad: O(1)
 *
 * @param anio - Año (number)
 * @param mes - Mes 1-12 (number)
 * @param dia - Día del mes (number)
 * @param hora - Hora 0-23 (number)
 * @param minuto - Minuto 0-59 (number)
 * @param segundo - Segundo 0-59 (number)
 * @returns Fecha en UTC equivalente a la hora de Bogotá (Date)
 */
function crearFechaBogota(
  anio: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  segundo: number
): Date {
  const mesTexto = String(mes).padStart(2, '0');
  const diaTexto = String(dia).padStart(2, '0');
  const horaTexto = String(hora).padStart(2, '0');
  const minutoTexto = String(minuto).padStart(2, '0');
  const segundoTexto = String(segundo).padStart(2, '0');

  return new Date(
    `${anio}-${mesTexto}-${diaTexto}T${horaTexto}:${minutoTexto}:${segundoTexto}-05:00`
  );
}

/**
 * Formatea una fecha para mostrarla en el correo
 *
 * Complejidad: O(1)
 *
 * @param fecha - Fecha a formatear (Date)
 * @returns Texto legible en español (string)
 */
function formatearFechaTexto(fecha: Date): string {
  return fecha.toLocaleString('es-CO', {
    timeZone: ZONA_HORARIA,
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

/**
 * Calcula el rango del corte semanal de viernes
 *
 * El reporte cubre desde el viernes anterior a las 2:01 p.m. hasta el viernes
 * actual a las 2:00 p.m. (hora de Bogotá). Se ejecuta los viernes a las 2:00 p.m.
 *
 * Complejidad: O(1)
 *
 * @param fechaReferencia - Fecha de referencia, normalmente el momento de ejecución (Date, opcional)
 * @returns Rango de inicio y fin del corte (RangoCorteViernes)
 */
export function obtenerRangoCorteViernes(fechaReferencia: Date = new Date()): RangoCorteViernes {
  const componentes = obtenerComponentesFechaBogota(fechaReferencia);

  const fin = crearFechaBogota(
    componentes.year,
    componentes.month,
    componentes.day,
    14,
    0,
    0
  );

  const inicio = new Date(fin.getTime() - 7 * 24 * 60 * 60 * 1000 + 60 * 1000);

  return {
    inicio,
    fin,
    inicioISO: inicio.toISOString(),
    finISO: fin.toISOString(),
    inicioTexto: formatearFechaTexto(inicio),
    finTexto: formatearFechaTexto(fin),
  };
}

/**
 * Obtiene el cliente de Supabase con permisos de servicio admin
 *
 * Complejidad: O(1)
 *
 * @returns Cliente admin de Supabase o null si no está configurado
 */
function obtenerClienteSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Enriquece las entregas con el correo del usuario que las registró
 *
 * Complejidad: O(n * u) donde n es entregas y u usuarios únicos
 *
 * @param entregas - Entregas a enriquecer (array de entregas)
 * @returns Entregas con usuario_email (EntregaConUsuario[])
 */
async function enriquecerEntregasConUsuario(
  entregas: Awaited<ReturnType<typeof obtenerEntregasPendientePagoPorRangoCreacion>>
): Promise<EntregaConUsuario[]> {
  const supabaseAdmin = obtenerClienteSupabaseAdmin();
  const mapaUsuarios = new Map<string, string>();

  if (supabaseAdmin) {
    const userIds = [...new Set(entregas.map(entrega => entrega.user_id))];

    for (const userId of userIds) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!userError && userData?.user) {
        mapaUsuarios.set(userId, userData.user.email || 'Sin email');
      }
    }
  }

  return entregas.map(entrega => ({
    ...entrega,
    usuario_email: mapaUsuarios.get(entrega.user_id) || 'Usuario desconocido',
  }));
}

/**
 * Formatea un valor monetario en pesos colombianos
 *
 * Complejidad: O(1)
 *
 * @param valor - Valor numérico (number)
 * @returns Texto formateado (string)
 */
function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

/**
 * Construye el contenido HTML del correo del reporte
 *
 * Complejidad: O(n) donde n es la cantidad de facturas
 *
 * @param entregas - Facturas del periodo (EntregaConUsuario[])
 * @param rango - Rango del corte semanal (RangoCorteViernes)
 * @returns HTML del correo (string)
 */
function construirContenidoHtmlCorreo(
  entregas: EntregaConUsuario[],
  rango: RangoCorteViernes
): string {
  const totalValor = entregas.reduce((acumulado, entrega) => acumulado + entrega.valor, 0);

  const filasTabla = entregas
    .map(entrega => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${entrega.numero_factura}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatearMoneda(entrega.valor)}</td>
        </tr>
      `)
    .join('');

  const mensajeSinFacturas = entregas.length === 0
    ? '<p>No se registraron facturas con forma de pago "Pendiente de Pago" en este periodo.</p>'
    : '';

  return `
    <div style="font-family:Arial,sans-serif;color:#222;max-width:900px;">
      <h2>Reporte semanal: Pendiente de Pago</h2>
      <p><strong>Periodo del corte:</strong> ${rango.inicioTexto} — ${rango.finTexto}</p>
      <p><strong>Total de facturas:</strong> ${entregas.length}</p>
      <p><strong>Valor total:</strong> ${formatearMoneda(totalValor)}</p>
      ${mensajeSinFacturas}
      ${
        entregas.length > 0
          ? `
        <table style="border-collapse:collapse;width:100%;max-width:480px;margin-top:16px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Número de factura</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${filasTabla}
            <tr style="background:#f9f9f9;font-weight:bold;">
              <td style="padding:8px;border:1px solid #ddd;">Total (${entregas.length} facturas)</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatearMoneda(totalValor)}</td>
            </tr>
          </tbody>
        </table>
      `
          : ''
      }
    </div>
  `;
}

/**
 * Genera y envía el reporte semanal de facturas pendientes de pago a los administradores
 *
 * Consulta las entregas con forma de pago "PENDIENTE DE PAGO" registradas en el rango
 * semanal y envía un correo a cada administrador configurado en NEXT_PUBLIC_ADMIN_EMAILS.
 *
 * Complejidad: O(n + a) donde n es entregas y a es cantidad de administradores
 *
 * @param fechaReferencia - Fecha de referencia para calcular el corte (Date, opcional)
 * @returns Resumen del envío del reporte (ResultadoReportePendientePago)
 */
export async function enviarReportePendientePagoAdministradores(
  fechaReferencia: Date = new Date()
): Promise<ResultadoReportePendientePago> {
  const rango = obtenerRangoCorteViernes(fechaReferencia);
  const entregas = await obtenerEntregasPendientePagoPorRangoCreacion(
    rango.inicioISO,
    rango.finISO,
    FORMA_PAGO_PENDIENTE
  );
  const entregasConUsuario = await enriquecerEntregasConUsuario(entregas);
  const totalValor = entregasConUsuario.reduce((acumulado, entrega) => acumulado + entrega.valor, 0);

  const contenidoHtml = construirContenidoHtmlCorreo(entregasConUsuario, rango);
  const asunto = `Reporte Pendiente de Pago - ${rango.finTexto}`;

  const correosAdministradores = obtenerEmailsAdministradores();
  const correosEnviados: string[] = [];
  const correosFallidos: string[] = [];
  const erroresEnvio: ErrorEnvioCorreo[] = [];

  for (const correo of correosAdministradores) {
    const resultadoEnvio = await enviarCorreo({
      destinatario: correo,
      asunto,
      contenidoHtml,
    });

    if (resultadoEnvio.exito) {
      correosEnviados.push(correo);
    } else {
      correosFallidos.push(correo);
      erroresEnvio.push({
        correo,
        error: resultadoEnvio.error || 'Error desconocido',
      });
    }
  }

  return {
    rango,
    cantidadFacturas: entregasConUsuario.length,
    totalValor,
    correosEnviados,
    correosFallidos,
    erroresEnvio,
  };
}
