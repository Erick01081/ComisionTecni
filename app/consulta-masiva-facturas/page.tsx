'use client';

import { useState } from 'react';
import Navegacion from '@/components/Navegacion';
import ProtegerRuta from '@/components/ProtegerRuta';
import { obtenerClienteSupabase } from '@/lib/auth';

interface ResultadoFactura {
  numero_factura: string;
  usuario_email: string;
  forma_pago: string;
  fecha_domicilio: string;
  valor: number;
}

function extraerConsecutivos(texto: string): string[] {
  const conPrefijo = [...texto.matchAll(/FV-2-\s*(\d+)/gi)].map(coincidencia => coincidencia[1]);
  const candidatos = conPrefijo.length > 0
    ? conPrefijo
    : texto.split(/[\s,|]+/).filter(valor => /^\d+$/.test(valor));

  return [...new Set(candidatos)];
}

function ConsultaMasivaFacturasPage(): JSX.Element {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<ResultadoFactura[]>([]);
  const [noEncontradas, setNoEncontradas] = useState<string[]>([]);
  const [totalConsultadas, setTotalConsultadas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const consecutivos = extraerConsecutivos(texto);

  const consultar = async () => {
    if (consecutivos.length === 0) {
      setError('Pega al menos una factura con el formato FV-2-00000.');
      return;
    }

    setCargando(true);
    setError('');
    setResultados([]);
    setNoEncontradas([]);

    try {
      const supabase = obtenerClienteSupabase();
      const { data: { session } } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const respuesta = await fetch('/api/entregas/consulta-masiva-facturas', {
        method: 'POST',
        headers,
        body: JSON.stringify({ facturas: consecutivos }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || 'No fue posible realizar la consulta.');
      }

      setResultados(datos.resultados || []);
      setNoEncontradas(datos.no_encontradas || []);
      setTotalConsultadas(datos.total_consultadas || consecutivos.length);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No fue posible realizar la consulta.');
    } finally {
      setCargando(false);
    }
  };

  const formatearMoneda = (valor: number) => new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(valor);

  return (
    <ProtegerRuta requiereConsultaMasivaFacturas={true}>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
        <Navegacion paginaActual="consulta-masiva-facturas" />
        <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
          <section className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Consulta masiva de facturas</h1>
            <p className="mt-2 text-sm text-gray-600">
              Pega la tabla o lista de facturas. El sistema quitará automáticamente el prefijo <code>FV-2-</code> antes de buscar.
            </p>

            <label htmlFor="facturas" className="block mt-5 text-sm font-medium text-gray-700">
              Facturas
            </label>
            <textarea
              id="facturas"
              value={texto}
              onChange={evento => setTexto(evento.target.value)}
              placeholder={'| FV-2-80065 |\n| FV-2-80067 |'}
              rows={10}
              className="mt-2 w-full px-3 py-3 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            />
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm text-gray-600">{consecutivos.length} consecutivo{consecutivos.length === 1 ? '' : 's'} detectado{consecutivos.length === 1 ? '' : 's'}.</span>
              <button
                onClick={consultar}
                disabled={cargando || consecutivos.length === 0}
                className="sm:ml-auto bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {cargando ? 'Buscando...' : 'Buscar todas'}
              </button>
            </div>
            {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
          </section>

          {totalConsultadas > 0 && (
            <section className="mt-6 bg-white rounded-lg shadow-xl p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-800">Resultados</h2>
              <p className="mt-1 text-sm text-gray-600">{resultados.length} entrega{resultados.length === 1 ? '' : 's'} encontrada{resultados.length === 1 ? '' : 's'} de {totalConsultadas} consecutivos consultados.</p>

              {resultados.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b text-left text-gray-500">
                      <tr><th className="px-3 py-3">Factura</th><th className="px-3 py-3">Entregó</th><th className="px-3 py-3">Pago</th><th className="px-3 py-3">Fecha</th><th className="px-3 py-3 text-right">Valor</th></tr>
                    </thead>
                    <tbody>
                      {resultados.map((resultado, indice) => (
                        <tr key={`${resultado.numero_factura}-${indice}`} className="border-b last:border-0 text-gray-800">
                          <td className="px-3 py-3 font-semibold">{resultado.numero_factura}</td>
                          <td className="px-3 py-3">{resultado.usuario_email}</td>
                          <td className="px-3 py-3">{resultado.forma_pago}</td>
                          <td className="px-3 py-3">{resultado.fecha_domicilio}</td>
                          <td className="px-3 py-3 text-right font-medium text-green-700">{formatearMoneda(resultado.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {noEncontradas.length > 0 && (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h3 className="font-semibold text-amber-900">No encontradas ({noEncontradas.length})</h3>
                  <p className="mt-1 break-words text-sm text-amber-800">{noEncontradas.join(', ')}</p>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </ProtegerRuta>
  );
}

export default ConsultaMasivaFacturasPage;
