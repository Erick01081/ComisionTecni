'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtegerRuta from '@/components/ProtegerRuta';
import Navegacion from '@/components/Navegacion';
import { obtenerUsuarioActual } from '@/lib/auth';
import { EntregaConUsuario } from '@/types/entrega';

/**
 * Página de administrador para consultar todas las entregas
 * 
 * Esta página permite a los administradores consultar todas las entregas
 * del sistema dentro de un rango de fechas. Muestra totales por usuario
 * y el total general.
 * 
 * Complejidad: O(n) donde n es el número de entregas en el rango
 */
function AdminPage(): JSX.Element {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [entregas, setEntregas] = useState<EntregaConUsuario[]>([]);
  const [totalesPorUsuario, setTotalesPorUsuario] = useState<Array<{ usuario_email: string; total: number }>>([]);
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  useEffect(() => {
    async function cargarUsuario() {
      const user = await obtenerUsuarioActual();
      setUsuario(user);
    }
    cargarUsuario();
  }, [router]);

  /**
   * Consulta las entregas en el rango de fechas especificado
   * 
   * Complejidad: O(1) - Solo realiza una llamada HTTP
   */
  const consultarEntregas = async () => {
    if (!fechaInicio || !fechaFin) {
      alert('Por favor selecciona ambas fechas');
      return;
    }

    setCargando(true);
    try {
      // Obtener el token de acceso de Supabase
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

      const respuesta = await fetch(`/api/entregas/admin?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`, {
        headers,
      });
      
      const datos = await respuesta.json();
      console.log('Respuesta del servidor:', datos);
      
      if (respuesta.ok) {
        setEntregas(datos.entregas || []);
        setTotalesPorUsuario(datos.totales_por_usuario || []);
        setTotalGeneral(datos.total_general || 0);
        
        // Mostrar información de debug si está disponible
        if (datos.debug) {
          console.log('Debug info:', datos.debug);
        }
      } else {
        alert(datos.error || 'Error al consultar entregas');
        console.error('Error en respuesta:', datos);
      }
    } catch (error) {
      console.error('Error al consultar entregas:', error);
      alert('Error al consultar entregas');
    } finally {
      setCargando(false);
    }
  };


  /**
   * Exporta los datos a CSV
   * 
   * Complejidad: O(n) donde n es el número de entregas
   */
  const exportarCSV = () => {
    if (entregas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const headers = ['Usuario', 'Fecha Domicilio', 'Número Factura', 'Valor'];
    const filas = entregas.map(e => [
      e.usuario_email,
      e.fecha_domicilio,
      e.numero_factura,
      e.valor.toString(),
    ]);

    const csv = [
      headers.join(','),
      ...filas.map(fila => fila.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `entregas_${fechaInicio}_${fechaFin}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Formatea un valor numérico como moneda
   * 
   * Complejidad: O(1)
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
   * Formatea una fecha en formato legible
   * 
   * Parsea la fecha manualmente para evitar problemas de zona horaria.
   * Si la fecha viene en formato YYYY-MM-DD, la parsea directamente.
   * 
   * Complejidad: O(1)
   * 
   * @param fecha - Fecha en formato YYYY-MM-DD o ISO (string)
   * @returns Fecha formateada (string)
   */
  const formatearFecha = (fecha: string): string => {
    // Si la fecha viene en formato YYYY-MM-DD, parsearla manualmente
    // para evitar conversión de zona horaria
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [year, month, day] = fecha.split('-').map(Number);
      const fechaLocal = new Date(year, month - 1, day); // month es 0-indexed
      return fechaLocal.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    
    // Si viene con hora, extraer solo la fecha y parsearla
    const fechaSolo = fecha.split('T')[0].split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaSolo)) {
      const [year, month, day] = fechaSolo.split('-').map(Number);
      const fechaLocal = new Date(year, month - 1, day);
      return fechaLocal.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    
    // Fallback: usar new Date normalmente (para timestamps)
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  /**
   * Formatea una fecha corta para móvil
   * 
   * Parsea la fecha manualmente para evitar problemas de zona horaria.
   * Si la fecha viene en formato YYYY-MM-DD, la parsea directamente.
   * 
   * Complejidad: O(1)
   * 
   * @param fecha - Fecha en formato YYYY-MM-DD o ISO (string)
   * @returns Fecha formateada (string)
   */
  const formatearFechaCorta = (fecha: string): string => {
    // Si la fecha viene en formato YYYY-MM-DD, parsearla manualmente
    // para evitar conversión de zona horaria
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [year, month, day] = fecha.split('-').map(Number);
      const fechaLocal = new Date(year, month - 1, day); // month es 0-indexed
      return fechaLocal.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    
    // Si viene con hora, extraer solo la fecha y parsearla
    const fechaSolo = fecha.split('T')[0].split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaSolo)) {
      const [year, month, day] = fechaSolo.split('-').map(Number);
      const fechaLocal = new Date(year, month - 1, day);
      return fechaLocal.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    
    // Fallback: usar new Date normalmente (para timestamps)
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ProtegerRuta requiereAdmin={true}>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
        <Navegacion paginaActual="admin" />

        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Panel de Administrador</h2>

            <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="w-full min-w-0">
                <label htmlFor="fecha_inicio" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Inicio *
                </label>
                <input
                  id="fecha_inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                  className="w-full px-3 sm:px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div className="w-full min-w-0">
                <label htmlFor="fecha_fin" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Fin *
                </label>
                <input
                  id="fecha_fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  required
                  className="w-full px-3 sm:px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <button
                  onClick={consultarEntregas}
                  disabled={cargando || !fechaInicio || !fechaFin}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base font-medium"
                >
                  {cargando ? 'Consultando...' : 'Consultar'}
                </button>
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                {entregas.length > 0 && (
                  <button
                    onClick={exportarCSV}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-base font-medium"
                  >
                    Exportar CSV
                  </button>
                )}
              </div>
            </div>

            {entregas.length > 0 && (
              <>
                <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <h3 className="text-xs sm:text-sm font-medium text-blue-800 mb-1 sm:mb-2">Total General</h3>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900">{formatearMoneda(totalGeneral)}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                    <h3 className="text-xs sm:text-sm font-medium text-green-800 mb-1 sm:mb-2">Total Entregas</h3>
                    <p className="text-xl sm:text-2xl font-bold text-green-900">{entregas.length}</p>
                  </div>
                </div>

                {totalesPorUsuario.length > 0 && (
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Totales por Usuario</h3>
                    {/* Vista móvil - tarjetas */}
                    <div className="md:hidden space-y-2">
                      {totalesPorUsuario.map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-900 truncate pr-2">{item.usuario_email}</span>
                            <span className="text-base font-bold text-primary-600">{formatearMoneda(item.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Vista desktop - tabla */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Usuario
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {totalesPorUsuario.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.usuario_email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatearMoneda(item.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Detalle de Entregas</h3>
                  {/* Vista móvil - tarjetas */}
                  <div className="md:hidden space-y-3">
                    {entregas.map((entrega) => (
                      <div key={entrega.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 mb-1 truncate">{entrega.usuario_email}</p>
                            <p className="text-xs text-gray-600">{formatearFechaCorta(entrega.fecha_domicilio)}</p>
                          </div>
                          <p className="text-lg font-bold text-primary-600 ml-3">{formatearMoneda(entrega.valor)}</p>
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <span className="text-xs text-gray-600">Factura: <span className="font-medium">{entrega.numero_factura}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Vista desktop - tabla */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usuario
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha Domicilio
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Número Factura
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {entregas.map((entrega) => (
                          <tr key={entrega.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entrega.usuario_email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatearFecha(entrega.fecha_domicilio)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entrega.numero_factura}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatearMoneda(entrega.valor)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {!cargando && entregas.length === 0 && fechaInicio && fechaFin && (
              <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-gray-500">
                No hay entregas en el rango de fechas seleccionado
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtegerRuta>
  );
}

export default AdminPage;

