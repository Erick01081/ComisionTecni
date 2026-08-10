'use client';

import { useEffect, useState } from 'react';
import ProtegerRuta from '@/components/ProtegerRuta';
import Navegacion from '@/components/Navegacion';
import { obtenerClienteSupabase } from '@/lib/auth';

type Registro = {
  id: string;
  fecha: string;
  es_festivo: boolean;
  observaciones: string | null;
};

export default function MisAlistamientosPage(): JSX.Element {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [detalle, setDetalle] = useState<any>(null);
  const [error, setError] = useState('');

  const obtenerHeaders = async () => {
    const headers: HeadersInit = {};
    const supabase = obtenerClienteSupabase();
    if (!supabase) return headers;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `******;
    return headers;
  };

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const headers = await obtenerHeaders();
      const resp = await fetch('/api/alistamientos/mis', { headers });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al consultar');
      setRegistros(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al consultar histórico');
    } finally {
      setCargando(false);
    }
  };

  const verDetalle = async (id: string) => {
    try {
      const headers = await obtenerHeaders();
      const resp = await fetch(`/api/alistamientos/mis/${id}`, { headers });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al consultar detalle');
      setDetalle(data);
    } catch (err: any) {
      setError(err.message || 'Error al consultar detalle');
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <ProtegerRuta>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 overflow-y-auto">
        <Navegacion paginaActual="mis-alistamientos" />
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Mis alistamientos</h1>
            {error && <p className="text-red-600 mb-3">{error}</p>}
            {cargando ? (
              <p className="text-gray-600">Cargando...</p>
            ) : (
              <div className="overflow-x-auto border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Estado</th>
                      <th className="p-2 text-left">Observaciones</th>
                      <th className="p-2 text-left">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2">{r.fecha}</td>
                        <td className="p-2">{r.es_festivo ? 'Festivo' : 'Completado'}</td>
                        <td className="p-2">{r.observaciones?.trim() || '—'}</td>
                        <td className="p-2">
                          <button onClick={() => verDetalle(r.id)} className="text-primary-700 underline">Ver</button>
                        </td>
                      </tr>
                    ))}
                    {registros.length === 0 && (
                      <tr>
                        <td className="p-3 text-gray-500" colSpan={4}>No hay alistamientos registrados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {detalle && (
              <div className="mt-6 border rounded p-4 bg-gray-50">
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold text-gray-800">Detalle del {detalle.alistamiento.fecha}</h2>
                  <button className="text-sm text-gray-700 underline" onClick={() => setDetalle(null)}>Cerrar</button>
                </div>
                <div className="mt-3 grid gap-1 text-sm">
                  {detalle.items.map((item: any) => {
                    const estado = detalle.alistamiento.items.find((d: any) => d.item_id === item.id)?.estado || '—';
                    return (
                      <div key={item.id} className="flex justify-between border-b py-1 gap-3">
                        <span>{item.orden}. {item.nombre}</span>
                        <strong>{estado}</strong>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm"><strong>Observaciones:</strong> {detalle.alistamiento.observaciones || '—'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtegerRuta>
  );
}
