import PDFDocument from 'pdfkit';

export interface ProductoRecibo {
  descripcion: string;
  valorUnitario: number;
  cantidad: number;
}

export interface DatosRecibo {
  cliente: string;
  identificacion: string;
  fecha: string;
  numero: string;
  productos: ProductoRecibo[];
}

const formatoCOP = (valor: number) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}).format(valor);

function ajustarTexto(doc: PDFKit.PDFDocument, texto: string, ancho: number, fuente: string, tamano: number) {
  doc.font(fuente).fontSize(tamano);
  if (doc.widthOfString(texto) <= ancho) return texto;
  let resultado = texto;
  while (resultado.length > 1 && doc.widthOfString(`${resultado}...`) > ancho) {
    resultado = resultado.slice(0, -1);
  }
  return `${resultado.trim()}...`;
}

export function generarPdfRecibo(datos: DatosRecibo): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margin: 34, autoFirstPage: true });
  const chunks: Buffer[] = [];
  const ancho = doc.page.width - 68;
  const azul = '#075985';
  const azulClaro = '#e0f2fe';
  const gris = '#475569';
  const borde = '#cbd5e1';
  const cantidad = datos.productos.length;
  const altoFila = Math.max(5, Math.min(25, 420 / Math.max(1, cantidad)));
  const fuenteTabla = Math.max(4.5, Math.min(9, altoFila * 0.38));

  doc.on('data', (chunk) => chunks.push(chunk));

  doc.roundedRect(34, 34, ancho, 67, 6).fill(azul);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text('Toner y Cartuchos', 34, 47, { width: ancho, align: 'center' });
  doc.font('Helvetica').fontSize(9).text('Cra 13 59-24 local 102  ·  321 967 1908', 34, 75, { width: ancho, align: 'center' });

  let y = 116;
  doc.fillColor(azul).font('Helvetica-Bold').fontSize(10).text('RECIBO COMERCIAL', 34, y);
  doc.fillColor(gris).font('Helvetica').fontSize(8).text(`No. ${datos.numero}`, 34, y + 15);
  doc.text(`Fecha: ${datos.fecha}`, 34, y + 15, { width: ancho, align: 'right' });
  y += 42;

  doc.fillColor(azulClaro).strokeColor(borde).roundedRect(34, y, ancho, 48, 4).fillAndStroke();
  doc.fillColor(gris).font('Helvetica-Bold').fontSize(8).text('CLIENTE', 44, y + 9);
  doc.font('Helvetica').fontSize(9).text(datos.cliente, 44, y + 22, { width: ancho / 2 - 54 });
  doc.font('Helvetica-Bold').fontSize(8).text('IDENTIFICACIÓN', 34 + ancho / 2, y + 9);
  doc.font('Helvetica').fontSize(9).text(datos.identificacion, 34 + ancho / 2, y + 22);
  y += 64;

  const columnas = [
    { titulo: 'Ítem', ancho: 33, alineacion: 'center' as const },
    { titulo: 'Descripción del producto', ancho: ancho - 33 - 72 - 92 - 92, alineacion: 'left' as const },
    { titulo: 'Cantidad', ancho: 72, alineacion: 'center' as const },
    { titulo: 'Valor unitario', ancho: 92, alineacion: 'right' as const },
    { titulo: 'Valor total', ancho: 92, alineacion: 'right' as const },
  ];
  let x = 34;
  for (const columna of columnas) {
    doc.fillColor(azul).strokeColor(azul).rect(x, y, columna.ancho, 22).fillAndStroke();
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(fuenteTabla).text(columna.titulo, x + 3, y + 7, { width: columna.ancho - 6, align: columna.alineacion });
    x += columna.ancho;
  }
  y += 22;

  datos.productos.forEach((producto, indice) => {
    x = 34;
    const valores = [
      String(indice + 1),
      ajustarTexto(doc, producto.descripcion, columnas[1].ancho - 8, 'Helvetica', fuenteTabla),
      String(producto.cantidad),
      formatoCOP(producto.valorUnitario),
      formatoCOP(producto.cantidad * producto.valorUnitario),
    ];
    columnas.forEach((columna, columnaIndice) => {
      doc.fillColor(indice % 2 === 0 ? '#ffffff' : '#f8fafc').strokeColor(borde).rect(x, y, columna.ancho, altoFila).fillAndStroke();
      doc.fillColor(gris).font('Helvetica').fontSize(fuenteTabla).text(valores[columnaIndice], x + 4, y + Math.max(3, (altoFila - fuenteTabla) / 2), {
        width: columna.ancho - 8,
        height: altoFila - 4,
        align: columna.alineacion,
        ellipsis: true,
      });
      x += columna.ancho;
    });
    y += altoFila;
  });

  const total = datos.productos.reduce((suma, producto) => suma + producto.cantidad * producto.valorUnitario, 0);
  y += 12;
  const resumenX = 34 + ancho - 230;
  doc.fillColor(gris).font('Helvetica').fontSize(9).text('Total de productos:', resumenX, y, { width: 130 });
  doc.font('Helvetica-Bold').text(formatoCOP(total), resumenX + 130, y, { width: 100, align: 'right' });
  doc.moveTo(resumenX, y + 17).lineTo(34 + ancho, y + 17).strokeColor(borde).stroke();
  doc.fillColor(azul).font('Helvetica-Bold').fontSize(11).text('TOTAL A PAGAR:', resumenX, y + 26, { width: 130 });
  doc.text(formatoCOP(total), resumenX + 130, y + 26, { width: 100, align: 'right' });
  doc.fillColor(gris).font('Helvetica').fontSize(7).text('Recibo comercial de venta · No constituye factura electrónica ni documento tributario', 34, 742, { width: ancho, align: 'center' });

  doc.end();
  return new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
}
