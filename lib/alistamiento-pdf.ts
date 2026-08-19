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

export function generarPdfMantenimientosMoto(params: {
  perfil: { nombre_completo?: string | null; placa?: string | null };
  mantenimientos: Array<{
    fecha: string;
    descripcion: string;
    kilometraje_actual: number;
    kilometraje_proximo_cambio: number | null;
    valor: number | null;
  }>;
}) {
  const { perfil, mantenimientos } = params;
  const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
  const chunks: Buffer[] = [];
  const ancho = doc.page.width - 72;
  const azul = '#075985';
  const borde = '#94a3b8';
  const texto = '#334155';
  doc.on('data', (chunk) => chunks.push(chunk));

  const formatoNumero = (valor: number | null) => valor === null || valor === undefined ? '—' : new Intl.NumberFormat('es-CO').format(Number(valor));
  const formatoValor = (valor: number | null) => valor === null || valor === undefined ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(valor));
  const formatoFecha = (fecha: string) => {
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
  };

  const dibujarCabecera = (y: number) => {
    doc.rect(36, y, ancho, 58).fill(azul);
    doc.fillColor('#ffffff').fontSize(17).text('Tecnirecargas', 36, y + 11, { width: ancho, align: 'center' });
    doc.fontSize(10).text('Reporte de mantenimientos de motocicleta', 36, y + 33, { width: ancho, align: 'center' });
    doc.fillColor(texto).fontSize(11).text(`Placa: ${perfil.placa || 'N/D'}   |   Responsable: ${perfil.nombre_completo || 'N/D'}`, 36, y + 70, { width: ancho, align: 'center' });
    return y + 98;
  };

  const columnas = [
    { titulo: 'Fecha', ancho: 76 },
    { titulo: 'Descripción', ancho: 310 },
    { titulo: 'Km actual', ancho: 105 },
    { titulo: 'Próximo cambio', ancho: 122 },
    { titulo: 'Valor', ancho: ancho - 76 - 310 - 105 - 122 },
  ];
  const dibujarTitulos = (y: number) => {
    let x = 36;
    for (const columna of columnas) {
      doc.fillColor('#e0f2fe').strokeColor(borde).rect(x, y, columna.ancho, 22).fillAndStroke();
      doc.fillColor(texto).fontSize(8).text(columna.titulo, x + 4, y + 7, { width: columna.ancho - 8, align: columna.titulo === 'Descripción' ? 'left' : 'center' });
      x += columna.ancho;
    }
    return y + 22;
  };

  let y = dibujarCabecera(36);
  y = dibujarTitulos(y);
  if (mantenimientos.length === 0) {
    doc.fillColor(texto).fontSize(10).text('No hay mantenimientos registrados para esta motocicleta.', 36, y + 20, { width: ancho, align: 'center' });
  }
  for (const mantenimiento of mantenimientos) {
    const altoDescripcion = doc.font('Helvetica').fontSize(9).heightOfString(mantenimiento.descripcion, { width: columnas[1].ancho - 8 });
    const altoFila = Math.max(28, altoDescripcion + 12);
    if (y + altoFila > doc.page.height - 42) {
      doc.addPage({ margin: 36, size: 'A4', layout: 'landscape' });
      y = dibujarCabecera(36);
      y = dibujarTitulos(y);
    }
    const valores = [
      formatoFecha(mantenimiento.fecha),
      mantenimiento.descripcion,
      formatoNumero(mantenimiento.kilometraje_actual),
      formatoNumero(mantenimiento.kilometraje_proximo_cambio),
      formatoValor(mantenimiento.valor),
    ];
    let x = 36;
    valores.forEach((valor, indice) => {
      const columna = columnas[indice];
      doc.fillColor('#ffffff').strokeColor(borde).rect(x, y, columna.ancho, altoFila).fillAndStroke();
      doc.fillColor(texto).fontSize(9).text(valor, x + 4, y + 7, { width: columna.ancho - 8, align: indice === 1 ? 'left' : 'center' });
      x += columna.ancho;
    });
    y += altoFila;
  }

  doc.end();
  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
