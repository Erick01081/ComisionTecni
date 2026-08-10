'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtegerRuta from '@/components/ProtegerRuta';
import Navegacion from '@/components/Navegacion';
import { obtenerClienteSupabase } from '@/lib/auth';
import { EstadoAlistamiento } from '@/types/alistamiento';

type Item = { id: number; nombre: string; orden: number };
type Perfil = {
  es_domiciliario: boolean;
  nombre_completo: string | null;
  cedula: string | null;
  placa: string | null;
};

const OPCIONES: EstadoAlistamiento[] = ['BUENO', 'MALO', 'NO_APLICA', 'FESTIVO'];

export default function AlistamientoPage(): JSX.Element {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [fecha, setFecha] = useState('');
  const [estados, setEstados] = useState<Record<number, EstadoAlistamiento | ''>>({});
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [yaRegistrado, setYaRegistrado] = useState(false);

  const obtenerHeaders = async () => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const supabase = obtenerClienteSupabase();
    if (!supabase) return headers;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = 'Bearer ' + session.access_token;
    return headers;
  };

  const cargarDatos = async (fechaConsulta?: string) => {
    setCargando(true);
    setError('');
    try {
      const headers = await obtenerHeaders();
      const url = fechaConsulta
        ? `/api/alistamientos/registro?fecha=${encodeURIComponent(fechaConsulta)}`
        : '/api/alistamientos/registro';
      const resp = await fetch(url, { headers });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'No fue posible cargar el formulario');

      setPerfil(data.perfil);
      setItems(data.items || []);
      setFecha(data.fecha || '');
      setObservaciones(data.alistamientoHoy?.observaciones || '');
      setYaRegistrado(!!data.alistamientoHoy);

      const mapa: Record<number, EstadoAlistamiento | ''> = {};
      for (const item of data.items || []) {
        mapa[item.id] = '';
      }
      if (data.alistamientoHoy?.items) {
        for (const det of data.alistamientoHoy.items) {
          mapa[det.item_id] = det.estado;
        }
      }
      setEstados(mapa);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const faltantes = useMemo(() => {
    return items.filter((item) => !estados[item.id]).length;
  }, [items, estados]);

  const aplicarATodos = (estado: EstadoAlistamiento) => {
    const next: Record<number, EstadoAlistamiento> = {};
    items.forEach((item) => { next[item.id] = estado; });
    setEstados(next);
  };

  const guardar = async () => {
    setError('');
    setExito('');
    if (yaRegistrado) return;
    if (faltantes > 0) {
      setError('Todos los elementos del checklist deben tener estado');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        fecha,
        observaciones,
        items: items.map((item) => ({
          item_id: item.id,
          estado: estados[item.id],
        })),
      };
      const headers = await obtenerHeaders();
      const resp = await fetch('/api/alistamientos/registro', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'No fue posible guardar');
      setExito('Alistamiento guardado exitosamente');
      setYaRegistrado(true);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarFecha = (nuevaFecha: string) => {
    if (!nuevaFecha) return;
    cargarDatos(nuevaFecha);
  };

  return (
    <ProtegerRuta>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 overflow-y-auto">
        <Navegacion paginaActual="alistamiento" />
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Alistamiento diario</h1>

            {cargando && <p className="text-gray-600">Cargando...</p>}
            {!cargando && error && <p className="text-red-600 mb-3">{error}</p>}

            {!cargando && perfil && !perfil.es_domiciliario && (
              <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                Tu usuario no está habilitado como domiciliario.
              </p>
            )}

            {!cargando && perfil?.es_domiciliario && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm mb-4">
                  <div className="bg-gray-50 p-3 rounded"><strong>Nombre:</strong> {perfil.nombre_completo || '—'}</div>
                  <div className="bg-gray-50 p-3 rounded"><strong>Cédula:</strong> {perfil.cedula || '—'}</div>
                  <div className="bg-gray-50 p-3 rounded"><strong>Placa:</strong> {perfil.placa || '—'}</div>
                  <label className="bg-gray-50 p-3 rounded font-medium text-gray-800">
                    Fecha
                    <input
                      type="date"
                      value={fecha}
                      disabled={cargando}
                      onChange={(e) => cambiarFecha(e.target.value)}
                      className="mt-1 block w-full border border-gray-400 rounded p-1 text-sm font-normal"
                    />
                  </label>
                </div>

                {yaRegistrado && (
                  <p className="text-blue-700 bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                    Ya registraste tu alistamiento de hoy.
                  </p>
                )}

                <div className="overflow-x-auto border rounded">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Elemento</th>
                        <th className="p-2">Bueno</th>
                        <th className="p-2">Malo</th>
                        <th className="p-2">No aplica</th>
                        <th className="p-2">Festivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-2">{item.orden}. {item.nombre}</td>
                          {OPCIONES.map((op) => (
                            <td key={op} className="p-2 text-center">
                              <input
                                type="radio"
                                name={`item-${item.id}`}
                                disabled={yaRegistrado}
                                checked={estados[item.id] === op}
                                onChange={() => setEstados((prev) => ({ ...prev, [item.id]: op }))}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
                  <textarea
                    value={observaciones}
                    disabled={yaRegistrado}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={5}
                    className="w-full border rounded p-3"
                    placeholder="Escribe novedades del alistamiento..."
                  />
                </div>

                {exito && <p className="text-green-700 mt-3">{exito}</p>}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button disabled={yaRegistrado} onClick={() => aplicarATodos('BUENO')} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">TODO BIEN</button>
                  <button disabled={yaRegistrado} onClick={() => aplicarATodos('FESTIVO')} className="bg-yellow-600 text-white px-4 py-2 rounded disabled:opacity-50">FESTIVO</button>
                  <button disabled={yaRegistrado} onClick={() => aplicarATodos('NO_APLICA')} className="bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50">NO APLICA</button>
                  <button disabled={yaRegistrado || guardando} onClick={guardar} className="bg-primary-600 text-white px-4 py-2 rounded disabled:opacity-50">
                    {guardando ? 'GUARDANDO...' : 'GUARDAR'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ProtegerRuta>
  );
}
