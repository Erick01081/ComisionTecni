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
      <div className="min-h-screen bg-slate-100 text-slate-900 overflow-y-auto">
        <Navegacion paginaActual="admin" />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-xl sm:p-6">
            <h1 className="mb-6 text-2xl font-bold text-slate-950">Administración de alistamientos</h1>
            {error && <p className="mb-3 rounded border border-red-300 bg-red-50 p-3 font-medium text-red-800">{error}</p>}
            {mensaje && <p className="mb-3 rounded border border-green-300 bg-green-50 p-3 font-medium text-green-800">{mensaje}</p>}
            {cargando ? <p className="font-medium text-slate-700">Cargando...</p> : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h2 className="mb-2 text-lg font-bold text-slate-950">Usuarios / domiciliarios</h2>
                  <div className="max-h-[560px] overflow-auto rounded border border-slate-300 bg-white">
                    {perfiles.map((p) => (
                      <button
                        key={p.user_id}
                        onClick={() => setSeleccionado({ ...VACIO, ...p })}
                        className={`w-full border-b border-slate-200 p-3 text-left transition-colors last:border-b-0 hover:bg-sky-50 focus:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-700 ${seleccionado.user_id === p.user_id ? 'bg-sky-100' : 'bg-white'}`}
                      >
                        <div className="text-sm font-bold text-slate-950">{p.email || p.user_id}</div>
                        <div className="mt-1 text-xs font-medium text-slate-700">{p.es_domiciliario ? 'Domiciliario' : 'Usuario normal'} {p.placa ? `| Placa: ${p.placa}` : ''}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="mb-2 text-lg font-bold text-slate-950">Perfil seleccionado</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="col-span-2 flex items-center gap-2 text-sm font-bold text-slate-950">
                      <input type="checkbox" checked={!!seleccionado.es_domiciliario} onChange={(e) => setSeleccionado((s) => ({ ...s, es_domiciliario: e.target.checked }))} />
                      Es domiciliario
                    </label>
                    <label className="text-sm font-bold text-slate-900">Nombre completo
                      <input className="mt-1 block w-full rounded border border-slate-400 bg-white p-2 text-sm font-medium text-slate-950 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700" value={seleccionado.nombre_completo || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, nombre_completo: e.target.value }))} />
                    </label>
                    <label className="text-sm font-bold text-slate-900">Cédula
                      <input className="mt-1 block w-full rounded border border-slate-400 bg-white p-2 text-sm font-medium text-slate-950 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700" value={seleccionado.cedula || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, cedula: e.target.value }))} />
                    </label>
                    <label className="text-sm font-bold text-slate-900">Placa
                      <input className="mt-1 block w-full rounded border border-slate-400 bg-white p-2 text-sm font-medium text-slate-950 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700" value={seleccionado.placa || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, placa: e.target.value.toUpperCase() }))} />
                    </label>
                    <label className="text-sm font-bold text-slate-900">SOAT
                      <input className="mt-1 block w-full rounded border border-slate-400 bg-white p-2 text-sm font-medium text-slate-950 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700" value={seleccionado.soat || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, soat: e.target.value }))} />
                    </label>
                    <label className="text-sm font-bold text-slate-900">Vigencia SOAT
                      <input className="mt-1 block w-full rounded border border-slate-400 bg-white p-2 text-sm font-medium text-slate-950 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700" type="date" value={seleccionado.soat_vigencia || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, soat_vigencia: e.target.value }))} />
                    </label>
                    <label className="text-sm font-bold text-slate-900">Tecnomecánica
                      <input className="mt-1 block w-full rounded border border-slate-400 bg-white p-2 text-sm font-medium text-slate-950 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700" type="date" value={seleccionado.revision_tecnico_mecanica || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, revision_tecnico_mecanica: e.target.value }))} />
                    </label>
                    <label className="text-sm font-bold text-slate-900">Certificado de gases
                      <input className="mt-1 block w-full rounded border border-slate-400 bg-white p-2 text-sm font-medium text-slate-950 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700" type="date" value={seleccionado.certificado_gases || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, certificado_gases: e.target.value }))} />
                    </label>
                    <label className="text-sm font-bold text-slate-900">Tarjeta de propiedad
                      <input className="mt-1 block w-full rounded border border-slate-400 bg-white p-2 text-sm font-medium text-slate-950 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700" value={seleccionado.tarjeta_propiedad || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, tarjeta_propiedad: e.target.value }))} />
                    </label>
                    <label className="text-sm font-bold text-slate-900">Vigencia licencia A2
                      <input className="mt-1 block w-full rounded border border-slate-400 bg-white p-2 text-sm font-medium text-slate-950 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700" type="date" value={seleccionado.licencia_a2_vigencia || ''} onChange={(e) => setSeleccionado((s) => ({ ...s, licencia_a2_vigencia: e.target.value }))} />
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={guardar} disabled={!guardadoValido} className="rounded bg-sky-700 px-4 py-2 font-bold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:opacity-100">Guardar perfil</button>
                    <select className="rounded border border-slate-400 bg-white px-2 py-2 text-sm font-bold text-slate-950 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700" value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)}>
                      {meses.length === 0 && <option value="">Sin meses</option>}
                      {meses.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button onClick={descargarPdf} disabled={!guardadoValido || !mesSeleccionado} className="rounded bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:opacity-100">
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
