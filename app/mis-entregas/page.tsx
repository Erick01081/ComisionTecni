'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtegerRuta from '@/components/ProtegerRuta';
import Navegacion from '@/components/Navegacion';
import { obtenerUsuarioActual } from '@/lib/auth';
import { Entrega } from '@/types/entrega';

/**
 * Página de consulta de entregas personales
 * 
 * Esta página muestra todas las entregas registradas por el usuario autenticado.
 * Permite filtrar por rango de fechas y muestra los totales calculados.
 * 
 * Complejidad: O(n) donde n es el número de entregas del usuario
 */
function MisEntregasPage(): JSX.Element {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  useEffect(() => {
    async function cargarUsuario() {
      const user = await obtenerUsuarioActual();
      setUsuario(user);
    }
    cargarUsuario();
    cargarEntregas();
  }, []);

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
    // Convertir a string si viene como otro tipo
    const fechaStr = String(fecha);
    
    // Extraer solo la parte de la fecha (YYYY-MM-DD) si viene con hora
    let fechaSolo = fechaStr.split('T')[0].split(' ')[0];
    
    // Validar formato YYYY-MM-DD - formatear directamente desde el string
    // Esto evita completamente cualquier conversión de zona horaria
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaSolo)) {
      const partes = fechaSolo.split('-');
      const year = parseInt(partes[0], 10);
      const month = parseInt(partes[1], 10); // 1-12
      const day = parseInt(partes[2], 10); // 1-31
      
      // Log para depuración
      console.log('[formatearFechaCorta] Fecha recibida:', fechaStr);
      console.log('[formatearFechaCorta] Fecha parseada:', { year, month, day });
      
      // Formatear directamente desde el string sin usar Date
      // Esto garantiza que se muestre exactamente lo que está guardado
      const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const resultado = `${day} de ${meses[month - 1]} de ${year}`;
      console.log('[formatearFechaCorta] Resultado:', resultado);
      return resultado;
    }
    
    // Fallback: usar new Date normalmente (para timestamps como created_at)
    return new Date(fechaStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Carga las entregas del usuario desde la API
   * 
   * Complejidad: O(1) - Solo realiza una llamada HTTP
   */
  const cargarEntregas = async () => {
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

      const respuesta = await fetch('/api/entregas', {
        headers,
      });
      if (respuesta.ok) {
        const datos = await respuesta.json();
        setEntregas(datos);
      }
    } catch (error) {
      console.error('Error al cargar entregas:', error);
    } finally {
      setCargando(false);
    }
  };


  /**
   * Filtra las entregas según el rango de fechas
   * 
   * Complejidad: O(n) donde n es el número de entregas
   */
  const entregasFiltradas = entregas.filter(entrega => {
    if (fechaInicio && entrega.fecha_domicilio < fechaInicio) {
      return false;
    }
    if (fechaFin && entrega.fecha_domicilio > fechaFin) {
      return false;
    }
    return true;
  });

  /**
   * Calcula el total de las entregas filtradas
   * 
   * Complejidad: O(n) donde n es el número de entregas filtradas
   */
  const total = entregasFiltradas.reduce((suma, entrega) => suma + entrega.valor, 0);

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
    // Convertir a string si viene como otro tipo
    const fechaStr = String(fecha);
    
    // Extraer solo la parte de la fecha (YYYY-MM-DD) si viene con hora
    let fechaSolo = fechaStr.split('T')[0].split(' ')[0];
    
    // Validar formato YYYY-MM-DD - formatear directamente desde el string
    // Esto evita completamente cualquier conversión de zona horaria
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaSolo)) {
      const partes = fechaSolo.split('-');
      const year = parseInt(partes[0], 10);
      const month = parseInt(partes[1], 10); // 1-12
      const day = parseInt(partes[2], 10); // 1-31
      
      // Log para depuración
      console.log('[formatearFecha] Fecha recibida:', fechaStr);
      console.log('[formatearFecha] Fecha parseada:', { year, month, day });
      
      // Formatear directamente desde el string sin usar Date
      // Esto garantiza que se muestre exactamente lo que está guardado
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const resultado = `${day} de ${meses[month - 1]} de ${year}`;
      console.log('[formatearFecha] Resultado:', resultado);
      return resultado;
    }
    
    // Fallback: usar new Date normalmente (para timestamps como created_at)
    return new Date(fechaStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ProtegerRuta>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
        <Navegacion paginaActual="mis-entregas" />

        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Mis Entregas</h2>

            <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="w-full min-w-0">
                <label htmlFor="fecha_inicio" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Inicio
                </label>
                <input
                  id="fecha_inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 sm:px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div className="w-full min-w-0">
                <label htmlFor="fecha_fin" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Fin
                </label>
                <input
                  id="fecha_fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 sm:px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div className="flex items-end sm:col-span-1">
                <button
                  onClick={() => {
                    setFechaInicio('');
                    setFechaFin('');
                  }}
                  className="w-full bg-gray-200 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base font-medium"
                >
                  Limpiar
                </button>
              </div>
            </div>

            {cargando ? (
              <div className="text-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-sm sm:text-base text-gray-600">Cargando entregas...</p>
              </div>
            ) : entregasFiltradas.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-gray-500">
                No hay entregas registradas
              </div>
            ) : (
              <>
                {/* Vista de tarjetas para móvil */}
                <div className="md:hidden space-y-3">
                  {entregasFiltradas.map((entrega) => (
                    <div key={entrega.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-gray-900 mb-1">{entrega.numero_factura}</p>
                          <p className="text-sm text-gray-600">{formatearFechaCorta(entrega.fecha_domicilio)}</p>
                        </div>
                        <p className="text-lg font-bold text-primary-600 ml-3">{formatearMoneda(entrega.valor)}</p>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">Registrado: {formatearFechaCorta(entrega.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="bg-primary-50 border-2 border-primary-300 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-gray-900">Total:</span>
                      <span className="text-xl font-bold text-primary-600">{formatearMoneda(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Vista de tabla para desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha Domicilio
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Número Factura
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha Registro
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {entregasFiltradas.map((entrega) => (
                        <tr key={entrega.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatearFecha(entrega.fecha_domicilio)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entrega.numero_factura}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatearMoneda(entrega.valor)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatearFecha(entrega.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900">
                          Total:
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {formatearMoneda(total)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-4 text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  Mostrando {entregasFiltradas.length} de {entregas.length} entregas
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ProtegerRuta>
  );
}

export default MisEntregasPage;

