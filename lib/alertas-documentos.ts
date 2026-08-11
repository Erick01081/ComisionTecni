import { obtenerClienteSupabaseAdmin } from '@/lib/alistamientos-database';
import { enviarCorreo } from '@/lib/email';

const DESTINATARIOS_ALERTAS = ['e.santiagom.s@gmail.com', 'ventas@tecnirecargas.com'];
const DIAS_AVISO = 15;

interface PerfilConDocumentos {
  nombre_completo: string | null;
  placa: string | null;
  soat_vigencia: string | null;
  revision_tecnico_mecanica: string | null;
}

export interface AlertaDocumento {
  documento: 'SOAT' | 'Técnico-mecánica';
  nombre: string;
  placa: string;
  vencimiento: string;
  diasRestantes: number;
}

function fechaActualBogota(): Date {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value;

  return new Date(Date.UTC(Number(valor('year')), Number(valor('month')) - 1, Number(valor('day'))));
}

function diasHastaVencimiento(fecha: string, hoy: Date): number {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return Math.round((Date.UTC(anio, mes - 1, dia) - hoy.getTime()) / 86_400_000);
}

function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
}

function escaparHtml(valor: string): string {
  return valor.replace(/[&<>"']/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[caracter] || caracter));
}

function construirContenidoHtml(alertas: AlertaDocumento[]): string {
  const filas = alertas.map((alerta) => `
    <tr>
      <td style="padding:8px;border:1px solid #d1d5db">${escaparHtml(alerta.documento)}</td>
      <td style="padding:8px;border:1px solid #d1d5db">${escaparHtml(alerta.nombre)}</td>
      <td style="padding:8px;border:1px solid #d1d5db">${escaparHtml(alerta.placa)}</td>
      <td style="padding:8px;border:1px solid #d1d5db">${formatearFecha(alerta.vencimiento)}</td>
      <td style="padding:8px;border:1px solid #d1d5db;text-align:center">${alerta.diasRestantes}</td>
    </tr>`).join('');

  return `<h2>Alertas de vencimiento de documentos</h2>
    <p>Los siguientes documentos vencen en menos de ${DIAS_AVISO} días:</p>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif">
      <thead><tr style="background:#e5e7eb"><th style="padding:8px;border:1px solid #d1d5db">Documento</th><th style="padding:8px;border:1px solid #d1d5db">Domiciliario</th><th style="padding:8px;border:1px solid #d1d5db">Placa</th><th style="padding:8px;border:1px solid #d1d5db">Vencimiento</th><th style="padding:8px;border:1px solid #d1d5db">Días restantes</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>`;
}

/** Busca documentos vigentes que vencen entre hoy y los próximos 14 días. */
export async function obtenerAlertasDocumentos(): Promise<AlertaDocumento[]> {
  const supabase = obtenerClienteSupabaseAdmin();
  if (!supabase) throw new Error('No hay configuración admin de Supabase');

  const { data, error } = await supabase
    .from('domiciliario_perfiles')
    .select('nombre_completo, placa, soat_vigencia, revision_tecnico_mecanica')
    .eq('es_domiciliario', true);
  if (error) throw new Error(error.message);

  const hoy = fechaActualBogota();
  const alertas: AlertaDocumento[] = [];
  for (const perfil of (data || []) as PerfilConDocumentos[]) {
    const documentos: Array<[AlertaDocumento['documento'], string | null]> = [
      ['SOAT', perfil.soat_vigencia],
      ['Técnico-mecánica', perfil.revision_tecnico_mecanica],
    ];
    for (const [documento, vencimiento] of documentos) {
      if (!vencimiento) continue;
      const diasRestantes = diasHastaVencimiento(vencimiento, hoy);
      if (diasRestantes < 0 || diasRestantes >= DIAS_AVISO) continue;
      alertas.push({
        documento,
        nombre: perfil.nombre_completo || 'Sin nombre',
        placa: perfil.placa || 'Sin placa',
        vencimiento,
        diasRestantes,
      });
    }
  }
  return alertas.sort((a, b) => a.diasRestantes - b.diasRestantes || a.placa.localeCompare(b.placa));
}

/** Envía una alerta diaria a los correos definidos para documentos próximos a vencer. */
export async function enviarAlertasDocumentos() {
  const alertas = await obtenerAlertasDocumentos();
  if (alertas.length === 0) return { alertas, enviado: false };

  const resultado = await enviarCorreo({
    destinatario: DESTINATARIOS_ALERTAS,
    asunto: `Alerta: ${alertas.length} documento(s) próximo(s) a vencer`,
    contenidoHtml: construirContenidoHtml(alertas),
  });
  if (!resultado.exito) throw new Error(resultado.error || 'No fue posible enviar la alerta');
  return { alertas, enviado: true };
}
