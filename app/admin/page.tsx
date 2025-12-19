'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtegerRuta from '@/components/ProtegerRuta';
import Navegacion from '@/components/Navegacion';
import { obtenerUsuarioActual } from '@/lib/auth';
import { EntregaConUsuario } from '@/types/entrega';
import * as XLSX from 'xlsx';

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
  /**
   * Exporta las entregas a un archivo Excel con múltiples hojas
   * 
   * Crea un archivo Excel con:
   * - Hoja "Resumen": Totales por usuario y total general
   * - Una hoja por cada usuario con sus entregas detalladas
   * 
   * Complejidad: O(n) donde n es el número de entregas
   */
  const exportarExcel = () => {
    if (entregas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const resumenData = [
      ['RESUMEN DE ENTREGAS'],
      [''],
      ['Período:', `${fechaInicio} a ${fechaFin}`],
      [''],
      ['Usuario', 'Total'],
      ...totalesPorUsuario.map(item => [
        item.usuario_email,
        item.total,
      ]),
      [''],
      ['TOTAL GENERAL', totalGeneral],
    ];

    const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData);
    
    // Ajustar ancho de columnas
    resumenSheet['!cols'] = [
      { wch: 40 }, // Columna Usuario
      { wch: 15 }, // Columna Total
    ];

    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');

    // Agrupar entregas por usuario
    const entregasPorUsuario: { [email: string]: EntregaConUsuario[] } = {};
    entregas.forEach(entrega => {
      if (!entregasPorUsuario[entrega.usuario_email]) {
        entregasPorUsuario[entrega.usuario_email] = [];
      }
      entregasPorUsuario[entrega.usuario_email].push(entrega);
    });

    // Crear una hoja por cada usuario
    Object.keys(entregasPorUsuario).forEach(email => {
      const entregasUsuario = entregasPorUsuario[email];
      const totalUsuario = entregasUsuario.reduce((suma, e) => suma + e.valor, 0);

      // Limpiar el email para el nombre de la hoja (máximo 31 caracteres en Excel)
      const nombreHoja = email.length > 31 ? email.substring(0, 28) + '...' : email;
      
      const usuarioData = [
        [`ENTREGAS DE ${email.toUpperCase()}`],
        [''],
        ['Fecha Domicilio', 'Número Factura', 'Valor'],
        ...entregasUsuario.map(e => [
          e.fecha_domicilio,
          e.numero_factura,
          e.valor,
        ]),
        [''],
        ['TOTAL', '', totalUsuario],
      ];

      const usuarioSheet = XLSX.utils.aoa_to_sheet(usuarioData);
      
      // Ajustar ancho de columnas
      usuarioSheet['!cols'] = [
        { wch: 18 }, // Fecha Domicilio
        { wch: 20 }, // Número Factura
        { wch: 15 }, // Valor
      ];

      XLSX.utils.book_append_sheet(workbook, usuarioSheet, nombreHoja);
    });

    // Generar el archivo Excel
    const nombreArchivo = `entregas_${fechaInicio}_${fechaFin}.xlsx`;
    XLSX.writeFile(workbook, nombreArchivo);
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
      console.log('[formatearFecha ADMIN] Fecha recibida:', fechaStr);
      console.log('[formatearFecha ADMIN] Fecha parseada:', { year, month, day });
      
      // Formatear directamente desde el string sin usar Date
      // Esto garantiza que se muestre exactamente lo que está guardado
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const resultado = `${day} de ${meses[month - 1]} de ${year}`;
      console.log('[formatearFecha ADMIN] Resultado:', resultado);
      return resultado;
    }
    
    // Fallback: usar new Date normalmente (para timestamps como created_at)
    return new Date(fechaStr).toLocaleDateString('es-CO', {
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
      console.log('[formatearFechaCorta ADMIN] Fecha recibida:', fechaStr);
      console.log('[formatearFechaCorta ADMIN] Fecha parseada:', { year, month, day });
      
      // Formatear directamente desde el string sin usar Date
      // Esto garantiza que se muestre exactamente lo que está guardado
      const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const resultado = `${day} de ${meses[month - 1]} de ${year}`;
      console.log('[formatearFechaCorta ADMIN] Resultado:', resultado);
      return resultado;
    }
    
    // Fallback: usar new Date normalmente (para timestamps como created_at)
    return new Date(fechaStr).toLocaleDateString('es-CO', {
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
                    onClick={exportarExcel}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-base font-medium"
                  >
                    Exportar Excel
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



