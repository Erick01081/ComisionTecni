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

interface FilaFactura {
  factura: string;
  resultado: ResultadoFactura | null;
}

function extraerConsecutivos(texto: string): string[] {
  const conPrefijo = [...texto.matchAll(/FV-2-\s*(\d+)/gi)].map(coincidencia => coincidencia[1]);
  const candidatos = conPrefijo.length > 0
    ? conPrefijo
    : texto.split(/[\s,|]+/).filter(valor => /^\d+$/.test(valor));

  return candidatos;
}

function ConsultaMasivaFacturasPage(): JSX.Element {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<ResultadoFactura[]>([]);
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
    setTotalConsultadas(0);

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

  const resultadosPorFactura = resultados.reduce((acumulado, resultado) => {
    const resultadosFactura = acumulado.get(resultado.numero_factura) || [];
    resultadosFactura.push(resultado);
    acumulado.set(resultado.numero_factura, resultadosFactura);
    return acumulado;
  }, new Map<string, ResultadoFactura[]>());

  const filas: FilaFactura[] = consecutivos.flatMap<FilaFactura>(factura => {
    const resultadosFactura = resultadosPorFactura.get(factura);
    return resultadosFactura?.length
      ? resultadosFactura.map(resultado => ({ factura, resultado }))
      : [{ factura, resultado: null }];
  });

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
              <p className="mt-1 text-sm text-gray-600">{resultados.length} entrega{resultados.length === 1 ? '' : 's'} encontrada{resultados.length === 1 ? '' : 's'} de {totalConsultadas} consecutivos consultados. Las filas conservan el orden en que se pegaron.</p>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b text-left text-gray-500">
                    <tr><th className="px-3 py-3">Factura</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Entregó</th><th className="px-3 py-3">Pago</th><th className="px-3 py-3">Fecha</th><th className="px-3 py-3 text-right">Valor</th></tr>
                  </thead>
                  <tbody>
                    {filas.map(({ factura, resultado }, indice) => {
                      return resultado ? (
                        <tr key={`${resultado.numero_factura}-${indice}`} className="border-b last:border-0 text-gray-800">
                          <td className="px-3 py-3 font-semibold">{factura}</td>
                          <td className="px-3 py-3"><span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Encontrada</span></td>
                          <td className="px-3 py-3">{resultado.usuario_email}</td>
                          <td className="px-3 py-3">{resultado.forma_pago}</td>
                          <td className="px-3 py-3">{resultado.fecha_domicilio}</td>
                          <td className="px-3 py-3 text-right font-medium text-green-700">{formatearMoneda(resultado.valor)}</td>
                        </tr>
                      ) : (
                        <tr key={`no-encontrada-${factura}-${indice}`} className="border-b last:border-0 bg-red-50 text-red-900">
                          <td className="px-3 py-3 font-semibold">{factura}</td>
                          <td className="px-3 py-3"><span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">No encontrada</span></td>
                          <td className="px-3 py-3 text-red-700" colSpan={4}>No hay una entrega registrada para este consecutivo.</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>
    </ProtegerRuta>
  );
}

export default ConsultaMasivaFacturasPage;
