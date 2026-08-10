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
  doc.on('data', (chunk) => chunks.push(chunk));

  const diasMes = new Date(year, month, 0).getDate();
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

  doc.fontSize(14).text('Alistamiento Diario de Motocicleta - Consolidado Mensual', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Mes/Año: ${String(month).padStart(2, '0')}/${year}`);
  doc.text(`Nombre: ${perfil?.nombre_completo || 'N/D'}`);
  doc.text(`Cédula: ${perfil?.cedula || 'N/D'}`);
  doc.text(`Placa: ${perfil?.placa || 'N/D'}`);
  doc.text(`SOAT: ${perfil?.soat || 'N/D'} | Vigencia SOAT: ${perfil?.soat_vigencia || 'N/D'}`);
  doc.text(`Tecnomecánica: ${perfil?.revision_tecnico_mecanica || 'N/D'} | Gases: ${perfil?.certificado_gases || 'N/D'}`);
  doc.text(`Tarjeta propiedad: ${perfil?.tarjeta_propiedad || 'N/D'} | Licencia A2: ${perfil?.licencia_a2_vigencia || 'N/D'}`);
  doc.moveDown(0.5);
  doc.text('Leyenda: B=Bueno, M=Malo, NA=No aplica, F=Festivo', { underline: true });
  doc.moveDown(0.4);

  const startX = 24;
  let y = doc.y;
  const nombreAncho = 220;
  const diaAncho = 16;
  const filaAlto = 16;

  const pintarEncabezado = () => {
    doc.rect(startX, y, nombreAncho, filaAlto).stroke();
    doc.fontSize(8).text('Elemento', startX + 4, y + 4, { width: nombreAncho - 8 });
    for (let d = 1; d <= diasMes; d += 1) {
      const x = startX + nombreAncho + (d - 1) * diaAncho;
      doc.rect(x, y, diaAncho, filaAlto).stroke();
      doc.fontSize(7).text(String(d), x + 3, y + 4, { width: diaAncho - 2, align: 'center' });
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
    doc.rect(startX, y, nombreAncho, filaAlto).stroke();
    doc.fontSize(7).text(item.nombre, startX + 3, y + 4, { width: nombreAncho - 6 });
    for (let d = 1; d <= diasMes; d += 1) {
      const x = startX + nombreAncho + (d - 1) * diaAncho;
      doc.rect(x, y, diaAncho, filaAlto).stroke();
      doc.fontSize(7).text(matriz.get(`${item.id}-${d}`) || '-', x + 1, y + 4, { width: diaAncho - 2, align: 'center' });
    }
    y += filaAlto;
  }

  doc.moveDown();
  doc.fontSize(11).text('Observaciones del mes');
  const observaciones = alistamientos
    .filter((a) => a.observaciones && a.observaciones.trim() !== '')
    .map((a) => `${a.fecha}: ${a.observaciones}`);

  if (observaciones.length === 0) {
    doc.fontSize(9).text('Sin observaciones registradas.');
  } else {
    observaciones.forEach((o) => doc.fontSize(9).text(`• ${o}`));
  }

  doc.moveDown(2);
  doc.fontSize(10).text('Firma del responsable: ____________________________________');
  doc.moveDown(1);
  doc.text('Nombre: _________________________');
  doc.text('Cédula: _________________________');

  doc.on('end', () => {});
  doc.end();

  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}
