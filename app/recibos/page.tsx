'use client';

import { useMemo, useState } from 'react';
import ProtegerRuta from '@/components/ProtegerRuta';
import Navegacion from '@/components/Navegacion';
import { obtenerClienteSupabase } from '@/lib/auth';

interface Producto {
  id: number;
  descripcion: string;
  valorUnitario: string;
  cantidad: string;
}

const moneda = (valor: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
const hoy = () => new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
const MAX_PRODUCTOS = 35;

export default function RecibosPage(): JSX.Element {
  const [cliente, setCliente] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [productos, setProductos] = useState<Producto[]>([{ id: 1, descripcion: '', valorUnitario: '', cantidad: '1' }]);
  const [pdfUrl, setPdfUrl] = useState('');
  const [numero, setNumero] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const total = useMemo(() => productos.reduce((suma, producto) => suma + (Number(producto.valorUnitario) || 0) * (Number(producto.cantidad) || 0), 0), [productos]);
  const actualizar = (id: number, campo: keyof Producto, valor: string) => setProductos((actuales) => actuales.map((producto) => producto.id === id ? { ...producto, [campo]: valor } : producto));
  const agregar = () => setProductos((actuales) => actuales.length < MAX_PRODUCTOS ? [...actuales, { id: Date.now(), descripcion: '', valorUnitario: '', cantidad: '1' }] : actuales);
  const eliminar = (id: number) => setProductos((actuales) => actuales.length > 1 ? actuales.filter((producto) => producto.id !== id) : actuales);

  const generar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setError('');
    if (!cliente.trim() || !identificacion.trim() || productos.some((producto) => !producto.descripcion.trim() || Number(producto.valorUnitario) < 0 || !producto.valorUnitario || !Number.isInteger(Number(producto.cantidad)) || Number(producto.cantidad) < 1)) {
      setError('Completa el cliente, la identificación y todos los datos de los productos.');
      return;
    }
    setCargando(true);
    try {
      const supabase = obtenerClienteSupabase();
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const respuesta = await fetch('/api/recibos/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({
          cliente: cliente.trim(),
          identificacion: identificacion.trim(),
          fecha: hoy(),
          productos: productos.map((producto) => ({ descripcion: producto.descripcion.trim(), valorUnitario: Number(producto.valorUnitario), cantidad: Number(producto.cantidad) })),
        }),
      });
      if (!respuesta.ok) throw new Error((await respuesta.json()).error || 'No fue posible generar el recibo.');
      const numeroRecibo = respuesta.headers.get('X-Recibo-Numero');
      if (!numeroRecibo) throw new Error('El recibo se generó sin número consecutivo.');
      const url = URL.createObjectURL(await respuesta.blob());
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
      setNumero(numeroRecibo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible generar el recibo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ProtegerRuta requiereGeneradorRecibos>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
        <Navegacion paginaActual="recibos" />
        <main className="max-w-6xl mx-auto px-3 py-5 sm:px-6 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <form onSubmit={generar} className="rounded-xl bg-white p-4 shadow-xl sm:p-6">
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Toner y Cartuchos</p>
                <h1 className="text-2xl font-bold text-gray-900">Generar recibo comercial</h1>
                <p className="mt-1 text-sm text-gray-500">El recibo se genera en una sola página tamaño carta.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">Nombre del cliente
                  <input required value={cliente} onChange={(e) => setCliente(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3" />
                </label>
                <label className="text-sm font-medium text-gray-700">Número de identificación
                  <input required value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3" />
                </label>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Productos</h2>
                <button type="button" onClick={agregar} disabled={productos.length >= MAX_PRODUCTOS} className="rounded-lg bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50">+ Agregar producto</button>
              </div>
              <div className="mt-3 space-y-3">
                {productos.map((producto, indice) => (
                  <div key={producto.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_100px_auto] sm:items-end">
                      <label className="text-xs font-semibold text-gray-600">Producto
                        <input required value={producto.descripcion} onChange={(e) => actualizar(producto.id, 'descripcion', e.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-2" />
                      </label>
                      <label className="text-xs font-semibold text-gray-600">Valor unitario
                        <input required min="0" step="1" type="number" value={producto.valorUnitario} onChange={(e) => actualizar(producto.id, 'valorUnitario', e.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-2" />
                      </label>
                      <label className="text-xs font-semibold text-gray-600">Cantidad
                        <input required min="1" step="1" type="number" value={producto.cantidad} onChange={(e) => actualizar(producto.id, 'cantidad', e.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-2" />
                      </label>
                      <button type="button" onClick={() => eliminar(producto.id)} disabled={productos.length === 1} className="rounded border border-red-200 px-3 py-2 text-sm text-red-600 disabled:cursor-not-allowed disabled:opacity-40">Eliminar</button>
                    </div>
                    <p className="mt-2 text-right text-sm font-semibold text-gray-700">Total: {moneda((Number(producto.valorUnitario) || 0) * (Number(producto.cantidad) || 0))}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <span className="font-semibold text-gray-700">Total a pagar</span>
                <span className="text-xl font-bold text-primary-700">{moneda(total)}</span>
              </div>
              {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <button disabled={cargando} type="submit" className="mt-5 w-full rounded-lg bg-primary-700 px-4 py-3 font-semibold text-white hover:bg-primary-800 disabled:opacity-50">{cargando ? 'Generando...' : 'Generar recibo'}</button>
            </form>
            <section className="rounded-xl bg-white p-4 shadow-xl sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Vista previa</h2>
                {pdfUrl && <a href={pdfUrl} download={`recibo-${numero}.pdf`} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">Descargar PDF</a>}
              </div>
              {pdfUrl ? <iframe title="Vista previa del recibo" src={pdfUrl} className="mt-4 h-[620px] w-full rounded border border-gray-200" /> : <div className="mt-4 flex h-[620px] items-center justify-center rounded border-2 border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">Genera el recibo para visualizarlo aquí antes de descargarlo.</div>}
            </section>
          </div>
        </main>
      </div>
    </ProtegerRuta>
  );
}
