'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtegerRuta from '@/components/ProtegerRuta';
import Navegacion from '@/components/Navegacion';
import { obtenerUsuarioActual } from '@/lib/auth';

/**
 * Tipo que representa el resultado de una consulta de factura
 * 
 * Contiene la información relevante de la entrega asociada a un número de factura:
 * quién la entregó, la forma de pago, la fecha y el valor.
 */
interface ResultadoFactura {
  numero_factura: string;
  usuario_email: string;
  forma_pago: string;
  fecha_domicilio: string;
  valor: number;
}

/**
 * Página de consulta de facturas para usuarios de ventas autorizados
 * 
 * Permite buscar por número de factura y obtener el correo del usuario
 * que registró la entrega junto con la forma de pago. Solo accesible para
 * los correos autorizados en la función esConsultaVentas.
 * 
 * Complejidad: O(n) donde n es la cantidad de resultados
 */
function ConsultaFacturaPage(): JSX.Element {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [numeroFactura, setNumeroFactura] = useState('');
  const [resultados, setResultados] = useState<ResultadoFactura[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [consultaRealizada, setConsultaRealizada] = useState(false);

  useEffect(() => {
    async function cargarUsuario() {
      const user = await obtenerUsuarioActual();
      setUsuario(user);
    }
    cargarUsuario();
  }, [router]);

  /**
   * Consulta la API para buscar entregas asociadas al número de factura ingresado
   * 
   * Obtiene el token de sesión del usuario actual, realiza la petición al endpoint
   * de consulta de factura y actualiza los estados de resultados y mensajes.
   * 
   * Complejidad: O(1) - Solo realiza una llamada HTTP
   */
  const consultarFactura = async () => {
    if (!numeroFactura.trim()) {
      alert('Por favor ingresa un número de factura');
      return;
    }

    setCargando(true);
    setResultados([]);
    setMensaje('');
    setConsultaRealizada(false);

    try {
      const { obtenerClienteSupabase } = await import('@/lib/auth');
      const supabase = obtenerClienteSupabase();
      let token = null;

      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      }

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const respuesta = await fetch(
        `/api/entregas/consulta-factura?numero_factura=${encodeURIComponent(numeroFactura.trim())}`,
        { headers }
      );

      const datos = await respuesta.json();

      if (respuesta.ok) {
        setResultados(datos.resultados || []);
        setMensaje(datos.mensaje || '');
      } else {
        alert(datos.error || 'Error al consultar la factura');
      }
    } catch (error) {
      console.error('Error al consultar factura:', error);
      alert('Error al consultar la factura');
    } finally {
      setCargando(false);
      setConsultaRealizada(true);
    }
  };

  /**
   * Maneja el evento de tecla presionada en el input para buscar con Enter
   * 
   * Complejidad: O(1)
   * 
   * @param evento - Evento de teclado del input (React.KeyboardEvent)
   */
  const manejarTeclaPresionada = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'Enter') {
      consultarFactura();
    }
  };

  /**
   * Formatea un valor numérico como moneda colombiana
   * 
   * Complejidad: O(1)
   * 
   * @param valor - Valor numérico a formatear (number)
   * @returns Valor formateado como moneda COP (string)
   */
  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor);
  };

  /**
   * Formatea una fecha en formato legible sin problemas de zona horaria
   * 
   * Parsea la fecha manualmente desde el string YYYY-MM-DD para evitar
   * que el constructor de Date aplique conversión de zona horaria.
   * 
   * Complejidad: O(1)
   * 
   * @param fecha - Fecha en formato YYYY-MM-DD o ISO (string)
   * @returns Fecha formateada en español (string)
   */
  const formatearFecha = (fecha: string): string => {
    const fechaStr = String(fecha);
    const fechaSolo = fechaStr.split('T')[0].split(' ')[0];

    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaSolo)) {
      const partes = fechaSolo.split('-');
      const year = parseInt(partes[0], 10);
      const month = parseInt(partes[1], 10);
      const day = parseInt(partes[2], 10);

      const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
      ];
      return `${day} de ${meses[month - 1]} de ${year}`;
    }

    return new Date(fechaStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ProtegerRuta requiereConsultaVentas={true}>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
        <Navegacion paginaActual="consulta-factura" />

        <div className="max-w-3xl mx-auto px-4 py-4 sm:py-8">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
              Consulta de Factura
            </h2>

            <div className="mb-4 sm:mb-6">
              <label htmlFor="numero_factura" className="block text-sm font-medium text-gray-700 mb-2">
                Número de Factura *
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="numero_factura"
                  type="text"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  onKeyDown={manejarTeclaPresionada}
                  placeholder="Ingresa el número de factura"
                  className="flex-1 px-3 sm:px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
                <button
                  onClick={consultarFactura}
                  disabled={cargando || !numeroFactura.trim()}
                  className="bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base font-medium"
                >
                  {cargando ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>

            {resultados.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  Resultados ({resultados.length})
                </h3>
                {resultados.map((resultado, indice) => (
                  <div
                    key={indice}
                    className="bg-gray-50 rounded-lg p-4 sm:p-5 border border-gray-200 shadow-sm"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Factura
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {resultado.numero_factura}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Correo del que Entregó
                        </p>
                        <p className="text-sm font-semibold text-primary-700">
                          {resultado.usuario_email}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Forma de Pago
                        </p>
                        <span className="inline-block px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-full">
                          {resultado.forma_pago}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Fecha Domicilio
                        </p>
                        <p className="text-sm text-gray-900">
                          {formatearFecha(resultado.fecha_domicilio)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Valor
                        </p>
                        <p className="text-sm font-bold text-green-700">
                          {formatearMoneda(resultado.valor)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {consultaRealizada && resultados.length === 0 && (
              <div className="text-center py-6 sm:py-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-3 text-sm sm:text-base text-gray-500">
                  {mensaje || 'No se encontraron entregas con ese número de factura'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtegerRuta>
  );
}

export default ConsultaFacturaPage;
