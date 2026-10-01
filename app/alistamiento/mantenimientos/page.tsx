'use client';

import { FormEvent, useEffect, useState } from 'react';
import Navegacion from '@/components/Navegacion';
import ProtegerRuta from '@/components/ProtegerRuta';
import { obtenerClienteSupabase } from '@/lib/auth';
import { MantenimientoMoto } from '@/types/alistamiento';

const fechaHoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const formatoFecha = (fecha: string) => {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
};
const formatoNumero = (valor: number | null) => valor === null ? '—' : new Intl.NumberFormat('es-CO').format(valor);
const formatoValor = (valor: number | null) => valor === null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

export default function MantenimientosPage() {
  const [fecha, setFecha] = useState(fechaHoy());
  const [descripcion, setDescripcion] = useState('');
  const [kilometrajeActual, setKilometrajeActual] = useState('');
  const [kilometrajeProximoCambio, setKilometrajeProximoCambio] = useState('');
  const [valor, setValor] = useState('');
  const [mantenimientos, setMantenimientos] = useState<MantenimientoMoto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [mantenimientoEditandoId, setMantenimientoEditandoId] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const headersAuth = async () => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const supabase = obtenerClienteSupabase();
    const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    return headers;
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const respuesta = await fetch('/api/alistamientos/mantenimientos', { headers: await headersAuth() });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || 'No fue posible cargar los mantenimientos');
      setMantenimientos(datos.mantenimientos || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los mantenimientos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const limpiarFormulario = () => {
    setDescripcion('');
    setKilometrajeActual('');
    setKilometrajeProximoCambio('');
    setValor('');
    setFecha(fechaHoy());
  };

  const replicarMantenimiento = (mantenimiento: MantenimientoMoto) => {
    setMantenimientoEditandoId(null);
    setFecha(fechaHoy());
    setDescripcion(mantenimiento.descripcion);
    setKilometrajeActual(String(mantenimiento.kilometraje_actual));
    setKilometrajeProximoCambio(mantenimiento.kilometraje_proximo_cambio === null ? '' : String(mantenimiento.kilometraje_proximo_cambio));
    setValor(mantenimiento.valor === null ? '' : String(mantenimiento.valor));
    setMensaje('Se cargó el registro para replicarlo. Ajusta los datos y guárdalo.');
    setError('');
  };

  const iniciarEdicion = (mantenimiento: MantenimientoMoto) => {
    setMantenimientoEditandoId(mantenimiento.id);
    setFecha(mantenimiento.fecha.slice(0, 10));
    setDescripcion(mantenimiento.descripcion);
    setKilometrajeActual(String(mantenimiento.kilometraje_actual));
    setKilometrajeProximoCambio(mantenimiento.kilometraje_proximo_cambio === null ? '' : String(mantenimiento.kilometraje_proximo_cambio));
    setValor(mantenimiento.valor === null ? '' : String(mantenimiento.valor));
    setMensaje('');
    setError('');
  };

  const cancelarEdicion = () => {
    setMantenimientoEditandoId(null);
    limpiarFormulario();
    setMensaje('');
    setError('');
  };

  const guardar = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMensaje('');
    setGuardando(true);
    const mantenimientoId = mantenimientoEditandoId;
    try {
      const respuesta = await fetch(mantenimientoId ? `/api/alistamientos/mantenimientos/${mantenimientoId}` : '/api/alistamientos/mantenimientos', {
        method: mantenimientoId ? 'PUT' : 'POST',
        headers: await headersAuth(),
        body: JSON.stringify({
          fecha,
          descripcion,
          kilometraje_actual: kilometrajeActual,
          kilometraje_proximo_cambio: kilometrajeProximoCambio,
          valor,
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || (mantenimientoId ? 'No fue posible actualizar el mantenimiento' : 'No fue posible guardar el mantenimiento'));
      if (mantenimientoId) {
        setMantenimientos((actuales) => actuales.map((item) => item.id === mantenimientoId ? datos.mantenimiento : item));
        setMensaje('Mantenimiento actualizado exitosamente.');
      } else {
        setMantenimientos((actuales) => [datos.mantenimiento, ...actuales]);
        setMensaje('Mantenimiento guardado exitosamente.');
      }
      setMantenimientoEditandoId(null);
      limpiarFormulario();
    } catch (err: any) {
      setError(err.message || (mantenimientoId ? 'Error al actualizar el mantenimiento' : 'Error al guardar el mantenimiento'));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarMantenimiento = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este mantenimiento?')) return;
    setError('');
    setMensaje('');
    setProcesandoId(id);
    try {
      const respuesta = await fetch(`/api/alistamientos/mantenimientos/${id}`, {
        method: 'DELETE',
        headers: await headersAuth(),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || 'No fue posible eliminar el mantenimiento');
      setMantenimientos((actuales) => actuales.filter((item) => item.id !== id));
      if (mantenimientoEditandoId === id) cancelarEdicion();
      setMensaje('Mantenimiento eliminado exitosamente.');
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el mantenimiento');
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <ProtegerRuta>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 overflow-y-auto">
        <Navegacion paginaActual="mantenimientos" />
        <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <section className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-800">Mantenimientos</h1>
            <p className="mt-1 mb-5 text-sm text-gray-600">Registra los trabajos realizados a la motocicleta asignada.</p>
            {error && <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</p>}
            {mensaje && <p className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-green-700">{mensaje}</p>}

            <form onSubmit={guardar} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-b pb-6">
              <label className="text-sm font-medium text-gray-700">Fecha
                <input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1 block w-full rounded border border-gray-300 p-2 text-gray-900" />
              </label>
              <label className="text-sm font-medium text-gray-700 lg:col-span-2">Descripción
                <input required maxLength={1000} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Cambio de aceite y filtro" className="mt-1 block w-full rounded border border-gray-300 p-2 text-gray-900" />
              </label>
              <label className="text-sm font-medium text-gray-700">Kilometraje actual
                <input required min="0" step="1" inputMode="numeric" type="number" value={kilometrajeActual} onChange={(e) => setKilometrajeActual(e.target.value)} className="mt-1 block w-full rounded border border-gray-300 p-2 text-gray-900" />
              </label>
              <label className="text-sm font-medium text-gray-700">Kilometraje próximo cambio <span className="font-normal text-gray-500">(opcional)</span>
                <input min="0" step="1" inputMode="numeric" type="number" value={kilometrajeProximoCambio} onChange={(e) => setKilometrajeProximoCambio(e.target.value)} className="mt-1 block w-full rounded border border-gray-300 p-2 text-gray-900" />
              </label>
              <label className="text-sm font-medium text-gray-700">Valor <span className="font-normal text-gray-500">(opcional)</span>
                <input min="0" step="1" inputMode="decimal" type="number" value={valor} onChange={(e) => setValor(e.target.value)} className="mt-1 block w-full rounded border border-gray-300 p-2 text-gray-900" />
              </label>
              <div className="flex items-end">
                <button disabled={guardando} className="w-full rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50">
                  {guardando ? (mantenimientoEditandoId ? 'Actualizando...' : 'Guardando...') : (mantenimientoEditandoId ? 'Actualizar mantenimiento' : 'Guardar mantenimiento')}
                </button>
              </div>
              {mantenimientoEditandoId && (
                <div className="flex items-end">
                  <button type="button" onClick={cancelarEdicion} className="w-full rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
                    Cancelar edición
                  </button>
                </div>
              )}
            </form>

            <h2 className="mt-6 mb-3 text-lg font-bold text-gray-800">Historial</h2>
            {cargando ? <p className="text-gray-600">Cargando...</p> : mantenimientos.length === 0 ? <p className="text-gray-600">Aún no hay mantenimientos registrados.</p> : (
              <div className="overflow-x-auto border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100"><tr><th className="p-3 text-left">Fecha</th><th className="p-3 text-left">Descripción</th><th className="p-3 text-right">Km actual</th><th className="p-3 text-right">Próximo cambio</th><th className="p-3 text-right">Valor</th><th className="p-3 text-left">Acciones</th></tr></thead>
                  <tbody>{mantenimientos.map((mantenimiento) => <tr className="border-t" key={mantenimiento.id}><td className="p-3 whitespace-nowrap">{formatoFecha(mantenimiento.fecha)}</td><td className="p-3">{mantenimiento.descripcion}</td><td className="p-3 text-right whitespace-nowrap">{formatoNumero(mantenimiento.kilometraje_actual)}</td><td className="p-3 text-right whitespace-nowrap">{formatoNumero(mantenimiento.kilometraje_proximo_cambio)}</td><td className="p-3 text-right whitespace-nowrap">{formatoValor(mantenimiento.valor)}</td><td className="p-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => replicarMantenimiento(mantenimiento)} className="rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50">Replicar</button><button type="button" onClick={() => iniciarEdicion(mantenimiento)} className="rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50">Modificar</button><button type="button" disabled={procesandoId === mantenimiento.id} onClick={() => eliminarMantenimiento(mantenimiento.id)} className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">{procesandoId === mantenimiento.id ? 'Eliminando...' : 'Eliminar'}</button></div></td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </ProtegerRuta>
  );
}
