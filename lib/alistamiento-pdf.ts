import PDFDocument from 'pdfkit';

const ESTADO_ABREVIADO: Record<string, string> = {
  BUENO: 'B',
  MALO: 'M',
  NO_APLICA: 'NA',
  FESTIVO: 'F',
};

export function generarPdfAlistamientoMensual(params: {
  perfil: any;
  catalogo: Array<{ id: number; nombre: string; orden: number }>;
  alistamientos: Array<{ id: string; fecha: string; observaciones: string | null }>;
  detalles: Array<{ alistamiento_id: string; item_id: number; estado: string }>;
  month: number;
  year: number;
}) {
  const { perfil, catalogo, alistamientos, detalles, month, year } = params;
  const doc = new PDFDocument({ margin: 24, size: 'A4', layout: 'landscape' });
  const chunks: Buffer[] = [];
  const azul = '#075985';
  const azulClaro = '#e0f2fe';
  const grisBorde = '#94a3b8';
  const grisTexto = '#334155';
  doc.on('data', (chunk) => chunks.push(chunk));

  const diasMes = new Date(year, month, 0).getDate();
  const anchoPagina = doc.page.width - 48;
  const mapaDiaPorAlistamiento = new Map<string, number>();
  for (const al of alistamientos) {
    const dia = parseInt(String(al.fecha).slice(8, 10), 10);
    mapaDiaPorAlistamiento.set(al.id, dia);
  }

  const matriz = new Map<string, string>();
  for (const d of detalles) {
    const dia = mapaDiaPorAlistamiento.get(d.alistamiento_id);
    if (!dia) continue;
    matriz.set(`${d.item_id}-${dia}`, ESTADO_ABREVIADO[d.estado] || '-');
  }

  doc.rect(24, 24, anchoPagina, 54).fill(azul);
  doc.fillColor('#ffffff').fontSize(16).text('Tecnirecargas', 24, 32, { width: anchoPagina, align: 'center' });
  doc.fontSize(10).text('NIT 900714987-3 · Alistamiento Diario de Motocicleta', 24, 54, { width: anchoPagina, align: 'center' });
  doc.fillColor(grisTexto).fontSize(10).text(`Consolidado mensual · ${String(month).padStart(2, '0')}/${year}`, 24, 88, { width: anchoPagina, align: 'center' });
  doc.fontSize(9).text(`Nombre: ${perfil?.nombre_completo || 'N/D'}   |   Cédula: ${perfil?.cedula || 'N/D'}   |   Placa: ${perfil?.placa || 'N/D'}`, 24, 106, { width: anchoPagina, align: 'center' });
  doc.text(`SOAT: ${perfil?.soat || 'N/D'} (${perfil?.soat_vigencia || 'N/D'})   |   Tecnomecánica: ${perfil?.revision_tecnico_mecanica || 'N/D'}   |   Licencia A2: ${perfil?.licencia_a2_vigencia || 'N/D'}`, 24, 120, { width: anchoPagina, align: 'center' });
  doc.fillColor(azul).fontSize(8).text('Leyenda: B = Bueno · M = Malo · NA = No aplica · F = Festivo', 24, 136, { width: anchoPagina, align: 'center' });

  const startX = 24;
  let y = 154;
  const nombreAncho = 240;
  const diaAncho = (anchoPagina - nombreAncho) / diasMes;
  const filaAlto = 16;

  const pintarEncabezado = () => {
    doc.fillColor(azulClaro).strokeColor(grisBorde).rect(startX, y, nombreAncho, filaAlto).fillAndStroke();
    doc.fillColor(grisTexto).fontSize(8).text('Elemento', startX + 4, y + 4, { width: nombreAncho - 8 });
    for (let d = 1; d <= diasMes; d += 1) {
      const x = startX + nombreAncho + (d - 1) * diaAncho;
      doc.fillColor(azulClaro).strokeColor(grisBorde).rect(x, y, diaAncho, filaAlto).fillAndStroke();
      doc.fillColor(grisTexto).fontSize(7).text(String(d), x + 3, y + 4, { width: diaAncho - 2, align: 'center' });
    }
    y += filaAlto;
  };

  pintarEncabezado();
  for (const item of catalogo) {
    if (y > 520) {
      doc.addPage({ margin: 24, size: 'A4', layout: 'landscape' });
      y = 24;
      pintarEncabezado();
    }
    doc.fillColor('#ffffff').strokeColor(grisBorde).rect(startX, y, nombreAncho, filaAlto).fillAndStroke();
    doc.fillColor(grisTexto).fontSize(7).text(item.nombre, startX + 3, y + 4, { width: nombreAncho - 6 });
    for (let d = 1; d <= diasMes; d += 1) {
      const x = startX + nombreAncho + (d - 1) * diaAncho;
      doc.fillColor('#ffffff').strokeColor(grisBorde).rect(x, y, diaAncho, filaAlto).fillAndStroke();
      doc.fillColor(grisTexto).fontSize(7).text(matriz.get(`${item.id}-${d}`) || '-', x + 1, y + 4, { width: diaAncho - 2, align: 'center' });
    }
    y += filaAlto;
  }

  // La segunda página queda en formato horizontal: continuación de la tabla,
  // observaciones y firma se presentan juntas para facilitar la impresión.
  const centroX = startX;
  const ancho = anchoPagina;
  const inicioResumenY = y + 18;
  doc.fillColor(azul).fontSize(14).text('Observaciones del mes', centroX, inicioResumenY, { width: ancho, align: 'center' });
  doc.fillColor(grisTexto).fontSize(9).text(`Consolidado de ${String(month).padStart(2, '0')}/${year}`, centroX, inicioResumenY + 20, { width: ancho, align: 'center' });
  const observaciones = alistamientos
    .filter((a) => a.observaciones && a.observaciones.trim() !== '')
    .map((a) => `${a.fecha}: ${a.observaciones}`);

  if (observaciones.length === 0) {
    doc.fillColor(grisTexto).fontSize(10).text('Sin observaciones registradas.', centroX, inicioResumenY + 58, { width: ancho, align: 'center' });
  } else {
    const altoCaja = Math.max(54, Math.min(120, 22 + observaciones.length * 18));
    doc.roundedRect(centroX, inicioResumenY + 48, ancho, altoCaja, 8).fillAndStroke('#f8fafc', grisBorde);
    doc.fillColor(grisTexto).fontSize(9).text(observaciones.map((o) => `• ${o}`).join('\n'), centroX + 24, inicioResumenY + 64, { width: ancho - 48, align: 'center', lineGap: 5 });
  }

  const firmaY = observaciones.length === 0
    ? inicioResumenY + 126
    : inicioResumenY + 48 + Math.max(54, Math.min(120, 22 + observaciones.length * 18)) + 54;
  doc.strokeColor(grisBorde).moveTo(centroX + 220, firmaY).lineTo(centroX + ancho - 220, firmaY).stroke();
  doc.fillColor(grisTexto).fontSize(11).text('Firma del responsable', centroX, firmaY + 12, { width: ancho, align: 'center' });
  doc.fontSize(10).text('Nombre: ____________________________________', centroX, firmaY + 48, { width: ancho, align: 'center' });
  doc.text('Cédula: _____________________________________', centroX, firmaY + 70, { width: ancho, align: 'center' });

  doc.on('end', () => {});
  doc.end();

  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}
