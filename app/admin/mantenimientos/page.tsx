'use client';

import { useEffect, useMemo, useState } from 'react';
import Navegacion from '@/components/Navegacion';
import ProtegerRuta from '@/components/ProtegerRuta';
import { obtenerClienteSupabase } from '@/lib/auth';

type MantenimientoAdmin = {
  id: string; user_id: string; placa: string; nombre_completo: string | null; fecha: string; descripcion: string;
  kilometraje_actual: number; kilometraje_proximo_cambio: number | null; valor: number | null;
};

const formatoFecha = (fecha: string) => {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
};
const formatoNumero = (valor: number | null) => valor === null ? '—' : new Intl.NumberFormat('es-CO').format(valor);
const formatoValor = (valor: number | null) => valor === null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

export default function AdminMantenimientosPage() {
  const [mantenimientos, setMantenimientos] = useState<MantenimientoAdmin[]>([]);
  const [userId, setUserId] = useState('');
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState('');

  const headersAuth = async () => {
    const headers: HeadersInit = {};
    const supabase = obtenerClienteSupabase();
    if (!supabase) return headers;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    return headers;
  };

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const respuesta = await fetch('/api/alistamientos/admin/mantenimientos', { headers: await headersAuth() });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || 'No fue posible cargar el reporte');
      setMantenimientos(datos.mantenimientos || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el reporte');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const motos = useMemo(() => {
    const mapa = new Map<string, { userId: string; placa: string; nombre: string | null }>();
    mantenimientos.forEach((mantenimiento) => {
      if (!mapa.has(mantenimiento.user_id)) mapa.set(mantenimiento.user_id, { userId: mantenimiento.user_id, placa: mantenimiento.placa, nombre: mantenimiento.nombre_completo });
    });
    return Array.from(mapa.values()).sort((a, b) => a.placa.localeCompare(b.placa));
  }, [mantenimientos]);
  const filas = userId ? mantenimientos.filter((mantenimiento) => mantenimiento.user_id === userId) : mantenimientos;

  const descargarPdf = async () => {
    if (!userId) return;
    setDescargando(true);
    setError('');
    try {
      const respuesta = await fetch(`/api/alistamientos/admin/mantenimientos/pdf?user_id=${encodeURIComponent(userId)}`, { headers: await headersAuth() });
      if (!respuesta.ok) {
        const datos = await respuesta.json();
        throw new Error(datos.error || 'No fue posible descargar el PDF');
      }
      const archivo = await respuesta.blob();
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `mantenimientos-${motos.find((moto) => moto.userId === userId)?.placa || 'moto'}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'No fue posible descargar el PDF');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <ProtegerRuta requiereAdmin={true}>
      <div className="min-h-screen bg-slate-100 text-slate-900 overflow-y-auto">
        <Navegacion paginaActual="admin-mantenimientos" />
        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <section className="rounded-lg border border-slate-300 bg-white p-4 shadow-xl sm:p-6">
            <h1 className="text-2xl font-bold text-slate-950">Reporte de mantenimientos</h1>
            <p className="mt-1 text-sm text-slate-600">Consulta los mantenimientos por motocicleta y descarga su reporte en PDF.</p>
            {error && <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="max-w-md flex-1 text-sm font-bold text-slate-800">Motocicleta
                <select value={userId} onChange={(e) => setUserId(e.target.value)} className="mt-1 block w-full rounded border border-slate-400 bg-white p-2 font-normal text-slate-950">
                  <option value="">Todas las motocicletas</option>
                  {motos.map((moto) => <option key={moto.userId} value={moto.userId}>{moto.placa} {moto.nombre ? `— ${moto.nombre}` : ''}</option>)}
                </select>
              </label>
              <button onClick={descargarPdf} disabled={!userId || descargando} className="rounded bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{descargando ? 'Descargando...' : 'Descargar PDF de la moto'}</button>
            </div>
            {cargando ? <p className="mt-6 text-slate-700">Cargando...</p> : filas.length === 0 ? <p className="mt-6 text-slate-600">No hay mantenimientos para mostrar.</p> : (
              <div className="mt-6 overflow-x-auto rounded border border-slate-300">
                <table className="min-w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-3 text-left">Placa</th><th className="p-3 text-left">Responsable</th><th className="p-3 text-left">Fecha</th><th className="p-3 text-left">Descripción</th><th className="p-3 text-right">Km actual</th><th className="p-3 text-right">Próximo cambio</th><th className="p-3 text-right">Valor</th></tr></thead><tbody>{filas.map((mantenimiento) => <tr key={mantenimiento.id} className="border-t border-slate-200"><td className="p-3 font-semibold">{mantenimiento.placa}</td><td className="p-3">{mantenimiento.nombre_completo || '—'}</td><td className="p-3 whitespace-nowrap">{formatoFecha(mantenimiento.fecha)}</td><td className="p-3">{mantenimiento.descripcion}</td><td className="p-3 text-right whitespace-nowrap">{formatoNumero(mantenimiento.kilometraje_actual)}</td><td className="p-3 text-right whitespace-nowrap">{formatoNumero(mantenimiento.kilometraje_proximo_cambio)}</td><td className="p-3 text-right whitespace-nowrap">{formatoValor(mantenimiento.valor)}</td></tr>)}</tbody></table>
              </div>
            )}
          </section>
        </main>
      </div>
    </ProtegerRuta>
  );
}
