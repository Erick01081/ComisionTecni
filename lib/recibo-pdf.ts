import fs from 'node:fs';
import path from 'node:path';
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
  style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(valor);

const margen = 42;
const tinta = '#18212f';
const gris = '#64748b';
const linea = '#e2e8f0';
const acento = '#0f766e';
const fondoSuave = '#f1f5f9';

function dibujarEncabezado(doc: PDFKit.PDFDocument, datos: DatosRecibo) {
  const ancho = doc.page.width - margen * 2;
  const logo = path.join(process.cwd(), 'public', 'logo-toner-premium.jpeg');
  if (fs.existsSync(logo)) doc.image(logo, margen, 34, { fit: [174, 84], align: 'left', valign: 'center' });

  const bloqueX = margen + 194;
  const bloqueAncho = ancho - 194;
  doc.fillColor(acento).font('Helvetica-Bold').fontSize(9).text('RECIBO COMERCIAL', bloqueX, 42, { width: bloqueAncho, align: 'right', characterSpacing: 1.2 });
  doc.fillColor(tinta).font('Helvetica-Bold').fontSize(20).text('Comprobante de venta', bloqueX, 59, { width: bloqueAncho, align: 'right' });
  doc.fillColor(gris).font('Helvetica').fontSize(9).text(`No. ${datos.numero}`, bloqueX, 87, { width: bloqueAncho, align: 'right' });
  doc.text(`Fecha de emisión  ·  ${datos.fecha}`, bloqueX, 102, { width: bloqueAncho, align: 'right' });
  doc.moveTo(margen, 132).lineTo(doc.page.width - margen, 132).lineWidth(1).strokeColor(linea).stroke();
}

function dibujarCabeceraTabla(doc: PDFKit.PDFDocument, y: number, ancho: number) {
  const columnas = [
    { titulo: 'ÍTEM', ancho: 42, align: 'center' as const },
    { titulo: 'DESCRIPCIÓN', ancho: ancho - 42 - 74 - 104 - 112, align: 'left' as const },
    { titulo: 'CANT.', ancho: 74, align: 'center' as const },
    { titulo: 'VALOR UNITARIO', ancho: 104, align: 'right' as const },
    { titulo: 'VALOR TOTAL', ancho: 112, align: 'right' as const },
  ];
  doc.roundedRect(margen, y, ancho, 27, 4).fill(fondoSuave);
  let x = margen;
  for (const columna of columnas) {
    doc.fillColor(gris).font('Helvetica-Bold').fontSize(7.5).text(columna.titulo, x + 7, y + 9, { width: columna.ancho - 14, align: columna.align, characterSpacing: 0.35 });
    x += columna.ancho;
  }
  return columnas;
}

export function generarPdfRecibo(datos: DatosRecibo): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margin: margen, bufferPages: true, info: { Title: `Recibo ${datos.numero}`, Author: 'Toner Premium' } });
  const chunks: Buffer[] = [];
  const ancho = doc.page.width - margen * 2;
  doc.on('data', (chunk) => chunks.push(chunk));

  dibujarEncabezado(doc, datos);
  doc.fillColor(gris).font('Helvetica-Bold').fontSize(8).text('DATOS DEL CLIENTE', margen, 151, { characterSpacing: 0.7 });
  const tarjetaY = 167;
  doc.roundedRect(margen, tarjetaY, ancho, 58, 5).fill('#f8fafc').strokeColor(linea).lineWidth(0.8).stroke();
  const mitad = ancho / 2;
  doc.fillColor(gris).font('Helvetica-Bold').fontSize(7.5).text('CLIENTE', margen + 14, tarjetaY + 11);
  doc.fillColor(tinta).font('Helvetica').fontSize(10).text(datos.cliente, margen + 14, tarjetaY + 26, { width: mitad - 28, height: 24, ellipsis: true });
  doc.fillColor(gris).font('Helvetica-Bold').fontSize(7.5).text('IDENTIFICACIÓN', margen + mitad + 10, tarjetaY + 11);
  doc.fillColor(tinta).font('Helvetica').fontSize(10).text(datos.identificacion, margen + mitad + 10, tarjetaY + 26, { width: mitad - 24, height: 24, ellipsis: true });

  doc.fillColor(gris).font('Helvetica-Bold').fontSize(8).text('DETALLE DE LA COMPRA', margen, 245, { characterSpacing: 0.7 });
  let y = 261;
  const columnas = dibujarCabeceraTabla(doc, y, ancho);
  y += 27;
  const total = datos.productos.reduce((suma, producto) => suma + producto.cantidad * producto.valorUnitario, 0);
  datos.productos.forEach((producto, indice) => {
    const alturaDescripcion = doc.font('Helvetica').fontSize(9).heightOfString(producto.descripcion, { width: columnas[1].ancho - 16 });
    const alto = Math.max(34, alturaDescripcion + 18);
    if (y + alto > doc.page.height - 112) {
      doc.addPage();
      dibujarEncabezado(doc, datos);
      y = 154;
      dibujarCabeceraTabla(doc, y, ancho);
      y += 27;
    }
    if (indice % 2 === 1) doc.rect(margen, y, ancho, alto).fill('#fafcfd');
    doc.fillColor(linea).lineWidth(0.6).moveTo(margen, y + alto).lineTo(margen + ancho, y + alto).stroke();
    let x = margen;
    const values = [String(indice + 1).padStart(2, '0'), producto.descripcion, String(producto.cantidad), formatoCOP(producto.valorUnitario), formatoCOP(producto.cantidad * producto.valorUnitario)];
    columnas.forEach((columna, columnIndex) => {
      const fontSize = columnIndex === 1 ? 9 : 8.5;
      doc.fillColor(columnIndex === 4 ? tinta : (columnIndex === 1 ? tinta : gris))
        .font(columnIndex === 4 ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize)
        .text(values[columnIndex], x + 8, y + (columnIndex === 1 ? 9 : Math.max(10, (alto - fontSize) / 2)), {
          width: columna.ancho - 16, height: alto - 12, align: columna.align, ellipsis: columnIndex !== 1,
        });
      x += columna.ancho;
    });
    y += alto;
  });

  if (y + 100 > doc.page.height - margen) {
    doc.addPage();
    dibujarEncabezado(doc, datos);
    y = 160;
  }
  y += 22;
  doc.fillColor(gris).font('Helvetica').fontSize(9).text(`${datos.productos.length} ${datos.productos.length === 1 ? 'producto' : 'productos'}`, margen, y);
  const totalBoxX = margen + ancho - 250;
  doc.roundedRect(totalBoxX, y - 10, 250, 66, 6).fill('#ecfdf5');
  doc.fillColor(acento).font('Helvetica-Bold').fontSize(8).text('TOTAL A PAGAR', totalBoxX + 14, y + 2, { characterSpacing: 0.8 });
  doc.fillColor('#115e59').font('Helvetica-Bold').fontSize(17).text(formatoCOP(total), totalBoxX + 14, y + 20, { width: 222, align: 'right' });

  const pieY = doc.page.height - 58;
  doc.moveTo(margen, pieY - 12).lineTo(doc.page.width - margen, pieY - 12).lineWidth(0.8).strokeColor(linea).stroke();
  doc.fillColor(gris).font('Helvetica').fontSize(7.5)
    .text('Gracias por tu compra. Para consultas sobre este recibo, comunícate con Toner Premium.', margen, pieY, { width: ancho, align: 'center' });
  doc.fillColor('#94a3b8').fontSize(7)
    .text('Recibo comercial · No constituye factura electrónica ni documento tributario', margen, pieY + 13, { width: ancho, align: 'center' });

  doc.end();
  return new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
}
