import { NextRequest, NextResponse } from 'next/server';
import { esGeneradorRecibos } from '@/lib/auth';
import { obtenerUsuarioDesdeRequest } from '@/lib/request-auth';
import { generarPdfRecibo, DatosRecibo } from '@/lib/recibo-pdf';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const usuario = await obtenerUsuarioDesdeRequest(request);
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!esGeneradorRecibos(usuario.email)) {
      return NextResponse.json({ error: 'No tienes permisos para generar recibos.' }, { status: 403 });
    }

    const datos = await request.json() as DatosRecibo;
    if (!datos.cliente?.trim() || !datos.identificacion?.trim() || !datos.numero?.trim() || !datos.fecha || !Array.isArray(datos.productos) || datos.productos.length === 0) {
      return NextResponse.json({ error: 'Completa los datos del cliente y agrega al menos un producto.' }, { status: 400 });
    }
    if (datos.productos.some((producto) => !producto.descripcion?.trim() || !Number.isFinite(producto.valorUnitario) || producto.valorUnitario < 0 || !Number.isInteger(producto.cantidad) || producto.cantidad < 1)) {
      return NextResponse.json({ error: 'Revisa la descripción, el valor y la cantidad de cada producto.' }, { status: 400 });
    }

    const pdf = await generarPdfRecibo(datos);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="recibo-${datos.numero}.pdf"`,
        'Content-Length': String(pdf.length),
      },
    });
  } catch (error) {
    console.error('Error al generar recibo PDF:', error);
    return NextResponse.json({ error: 'No fue posible generar el recibo.' }, { status: 500 });
  }
}
