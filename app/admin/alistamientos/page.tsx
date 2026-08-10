'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtegerRuta from '@/components/ProtegerRuta';
import Navegacion from '@/components/Navegacion';
import { obtenerClienteSupabase } from '@/lib/auth';

type Perfil = {
  user_id: string;
  email: string;
  es_domiciliario: boolean;
  nombre_completo: string | null;
  cedula: string | null;
  placa: string | null;
  soat: string | null;
  soat_vigencia: string | null;
  revision_tecnico_mecanica: string | null;
  certificado_gases: string | null;
  tarjeta_propiedad: string | null;
  licencia_a2_vigencia: string | null;
};

const VACIO: Perfil = {
  user_id: '',
  email: '',
  es_domiciliario: false,
  nombre_completo: '',
  cedula: '',
  placa: '',
  soat: '',
  soat_vigencia: '',
  revision_tecnico_mecanica: '',
  certificado_gases: '',
  tarjeta_propiedad: '',
  licencia_a2_vigencia: '',
};

export default function AdminAlistamientosPage() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [seleccionado, setSeleccionado] = useState<Perfil>(VACIO);
  const [meses, setMeses] = useState<string[]>([]);
  const [mesSeleccionado, setMesSeleccionado] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const headersAuth = async () => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const supabase = obtenerClienteSupabase();
    if (!supabase) return headers;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = 'Bearer ' + session.access_token;
    return headers;
  };

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const headers = await headersAuth();
      const [respPerfiles, respMeses] = await Promise.all([
        fetch('/api/alistamientos/admin/perfiles', { headers }),
        fetch('/api/alistamientos/admin/meses', { headers }),
      ]);
      const dataPerfiles = await respPerfiles.json();
      const dataMeses = await respMeses.json();
      if (!respPerfiles.ok) throw new Error(dataPerfiles.error || 'Error al cargar perfiles');
      setPerfiles(dataPerfiles || []);
      setMeses(dataMeses.meses || []);
      if ((dataMeses.meses || []).length > 0) setMesSeleccionado(dataMeses.meses[0]);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardadoValido = useMemo(() => !!seleccionado.user_id, [seleccionado.user_id]);

  const guardar = async () => {
    if (!guardadoValido) return;
    setMensaje('');
    setError('');
    try {
      const headers = await headersAuth();
      const resp = await fetch('/api/alistamientos/admin/perfiles', {
        method: 'PUT',
        headers,
        body: JSON.stringify(seleccionado),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'No se pudo actualizar el perfil');
      setMensaje('Perfil actualizado');
      await cargar();
    } catch (err: any) {
      setError(err.message || 'Error al guardar perfil');
    }
  };

  const descargarPdf = () => {
    if (!seleccionado.user_id || !mesSeleccionado) return;
    window.open(`/api/alistamientos/admin/pdf?user_id=${seleccionado.user_id}&month=${mesSeleccionado}`, '_blank');
  };

  return (
    <ProtegerRuta requiereAdmin={true}>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 overflow-y-auto">
        <Navegacion paginaActual="admin" />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Administración de alistamientos</h1>
            {error && <p className="text-red-600 mb-2">{error}</p>}
            {mensaje && <p className="text-green-700 mb-2">{mensaje}</p>}
            {cargando ? <p>Cargando...</p> : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h2 className="font-semibold mb-2">Usuarios / domiciliarios</h2>
                  <div className="border rounded max-h-[560px] overflow-auto">
                    {perfiles.map((p) => (
                      <button
                        key={p.user_id}
                        onClick={() => setSeleccionado({ ...VACIO, ...p })}
                        className={`w-full text-left p-3 border-b hover:bg-gray-50 ${seleccionado.user_id === p.user_id ? 'bg-primary-50' : ''}`}
                      >
                        <div className="font-medium text-sm">{p.email || p.user_id}</div>
                        <div className="text-xs text-gray-600">{p.es_domiciliario ? 'Domiciliario' : 'Usuario normal'} {p.placa ? `| Placa: ${p.placa}` : ''}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="font-semibold mb-2">Perfil seleccionado</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-sm col-span-2 flex items-center gap-2 text-gray-900 font-medium">
                      <input type="checkbox" checked={!!seleccionado.es_domiciliario} onChange={(e) => setSeleccionado((s) => ({ ...s, es_domiciliario: e.target.checked }))} />
                      Es domiciliario
                    </label>
                    <label className="text-sm font-medium text-gray-800">Nombre completo
                      <input className="mt-1 block w-full rounded border border-gray-400 bg-white p-2 text-sm text-gray-900 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600" value={seleccionado.nombre_completo || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, nombre_completo: e.target.value }))} />
                    </label>
                    <label className="text-sm font-medium text-gray-800">Cédula
                      <input className="mt-1 block w-full rounded border border-gray-400 bg-white p-2 text-sm text-gray-900 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600" value={seleccionado.cedula || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, cedula: e.target.value }))} />
                    </label>
                    <label className="text-sm font-medium text-gray-800">Placa
                      <input className="mt-1 block w-full rounded border border-gray-400 bg-white p-2 text-sm text-gray-900 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600" value={seleccionado.placa || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, placa: e.target.value.toUpperCase() }))} />
                    </label>
                    <label className="text-sm font-medium text-gray-800">SOAT
                      <input className="mt-1 block w-full rounded border border-gray-400 bg-white p-2 text-sm text-gray-900 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600" value={seleccionado.soat || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, soat: e.target.value }))} />
                    </label>
                    <label className="text-sm font-medium text-gray-800">Vigencia SOAT
                      <input className="mt-1 block w-full rounded border border-gray-400 bg-white p-2 text-sm text-gray-900 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600" type="date" value={seleccionado.soat_vigencia || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, soat_vigencia: e.target.value }))} />
                    </label>
                    <label className="text-sm font-medium text-gray-800">Tecnomecánica
                      <input className="mt-1 block w-full rounded border border-gray-400 bg-white p-2 text-sm text-gray-900 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600" type="date" value={seleccionado.revision_tecnico_mecanica || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, revision_tecnico_mecanica: e.target.value }))} />
                    </label>
                    <label className="text-sm font-medium text-gray-800">Certificado de gases
                      <input className="mt-1 block w-full rounded border border-gray-400 bg-white p-2 text-sm text-gray-900 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600" type="date" value={seleccionado.certificado_gases || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, certificado_gases: e.target.value }))} />
                    </label>
                    <label className="text-sm font-medium text-gray-800">Tarjeta de propiedad
                      <input className="mt-1 block w-full rounded border border-gray-400 bg-white p-2 text-sm text-gray-900 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600" value={seleccionado.tarjeta_propiedad || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, tarjeta_propiedad: e.target.value }))} />
                    </label>
                    <label className="text-sm font-medium text-gray-800">Vigencia licencia A2
                      <input className="mt-1 block w-full rounded border border-gray-400 bg-white p-2 text-sm text-gray-900 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600" type="date" value={seleccionado.licencia_a2_vigencia || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, licencia_a2_vigencia: e.target.value }))} />
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={guardar} disabled={!guardadoValido} className="bg-primary-600 text-white px-4 py-2 rounded disabled:opacity-50">Guardar perfil</button>
                    <select className="border rounded px-2 py-2 text-sm" value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)}>
                      {meses.length === 0 && <option value="">Sin meses</option>}
                      {meses.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button onClick={descargarPdf} disabled={!guardadoValido || !mesSeleccionado} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">
                      Descargar PDF mensual
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtegerRuta>
  );
}
