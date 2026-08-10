'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerUsuarioActual, cerrarSesion, esAdministrador, esConsultaVentas, obtenerClienteSupabase } from '@/lib/auth';
import Logo from '@/components/Logo';

interface NavegacionProps {
  paginaActual: 'registro' | 'mis-entregas' | 'admin' | 'consulta-factura' | 'alistamiento' | 'mis-alistamientos';
}

/**
 * Componente de navegación responsive con menú hamburguesa para móviles
 * 
 * Este componente proporciona una barra de navegación que se adapta a diferentes
 * tamaños de pantalla. En móviles muestra un menú hamburguesa, en desktop
 * muestra todos los enlaces visibles.
 * 
 * Complejidad: O(1) - Solo renderiza la UI
 * 
 * @param paginaActual - Página actual para resaltar el enlace activo ('registro' | 'mis-entregas' | 'admin' | 'consulta-factura')
 */
export default function Navegacion({ paginaActual }: NavegacionProps) {
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [usuario, setUsuario] = useState<any>(null);
  const [esAdmin, setIsAdmin] = useState(false);
  const [tieneConsultaVentas, setTieneConsultaVentas] = useState(false);
  const [esDomiciliario, setEsDomiciliario] = useState(false);

  useEffect(() => {
    async function cargarUsuario() {
      const user = await obtenerUsuarioActual();
      setUsuario(user);
      if (user) {
        setIsAdmin(esAdministrador(user.email));
        setTieneConsultaVentas(esConsultaVentas(user.email));
        try {
          const supabase = obtenerClienteSupabase();
          let token = '';
          if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            token = session?.access_token || '';
          }
          const headers: HeadersInit = {};
          if (token) headers.Authorization = 'Bearer ' + token;
          const resp = await fetch('/api/alistamientos/perfil', { headers });
          if (resp.ok) {
            const perfil = await resp.json();
            setEsDomiciliario(!!perfil?.es_domiciliario);
          }
        } catch (error) {
          console.error('Error al cargar perfil de domiciliario:', error);
        }
      }
    }
    cargarUsuario();
  }, []);

  /**
   * Maneja el cierre de sesión
   * 
   * Complejidad: O(1) - Solo realiza una llamada de cierre de sesión
   */
  const manejarCerrarSesion = async () => {
    await cerrarSesion();
    router.push('/');
  };

  /**
   * Navega a una ruta y cierra el menú móvil si está abierto
   * 
   * Complejidad: O(1)
   * 
   * @param ruta - Ruta a la que navegar (string)
   */
  const navegar = (ruta: string) => {
    router.push(ruta);
    setMenuAbierto(false);
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo y título */}
          <div className="flex items-center">
            <Logo className="text-base sm:text-lg" />
          </div>

          {/* Menú desktop - visible en pantallas medianas y grandes */}
          <div className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => navegar('/registro')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                paginaActual === 'registro'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              Registrar Entrega
            </button>
            <button
              onClick={() => navegar('/mis-entregas')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                paginaActual === 'mis-entregas'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              Mis Entregas
            </button>
            {esDomiciliario && (
              <>
                <button
                  onClick={() => navegar('/alistamiento')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    paginaActual === 'alistamiento'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-600 hover:text-primary-600'
                  }`}
                >
                  Alistamiento diario
                </button>
                <button
                  onClick={() => navegar('/mis-alistamientos')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    paginaActual === 'mis-alistamientos'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-600 hover:text-primary-600'
                  }`}
                >
                  Mis alistamientos
                </button>
              </>
            )}
            {esAdmin && (
              <button
                onClick={() => navegar('/admin')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  paginaActual === 'admin'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-primary-600'
                }`}
              >
                Administrador
              </button>
            )}
            {tieneConsultaVentas && (
              <button
                onClick={() => navegar('/consulta-factura')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  paginaActual === 'consulta-factura'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-primary-600'
                }`}
              >
                Consulta Factura
              </button>
            )}
          </div>

          {/* Usuario y acciones - desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[150px]">
              {usuario?.email}
            </span>
            <button
              onClick={manejarCerrarSesion}
              className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              Salir
            </button>
          </div>

          {/* Botón hamburguesa - solo móvil */}
          <div className="md:hidden flex items-center space-x-2">
            <span className="text-xs text-gray-600 truncate max-w-[100px]">
              {usuario?.email?.split('@')[0]}
            </span>
            <button
              onClick={() => setMenuAbierto(!menuAbierto)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              aria-label="Menú principal"
            >
              <svg
                className="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                {menuAbierto ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {menuAbierto && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <button
              onClick={() => navegar('/registro')}
              className={`block w-full text-left px-3 py-3 rounded-md text-base font-medium transition-colors ${
                paginaActual === 'registro'
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Registrar Entrega
            </button>
            <button
              onClick={() => navegar('/mis-entregas')}
              className={`block w-full text-left px-3 py-3 rounded-md text-base font-medium transition-colors ${
                paginaActual === 'mis-entregas'
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Mis Entregas
            </button>
            {esDomiciliario && (
              <>
                <button
                  onClick={() => navegar('/alistamiento')}
                  className={`block w-full text-left px-3 py-3 rounded-md text-base font-medium transition-colors ${
                    paginaActual === 'alistamiento'
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Alistamiento diario
                </button>
                <button
                  onClick={() => navegar('/mis-alistamientos')}
                  className={`block w-full text-left px-3 py-3 rounded-md text-base font-medium transition-colors ${
                    paginaActual === 'mis-alistamientos'
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Mis alistamientos
                </button>
              </>
            )}
            {esAdmin && (
              <button
                onClick={() => navegar('/admin')}
                className={`block w-full text-left px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  paginaActual === 'admin'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Administrador
              </button>
            )}
            {tieneConsultaVentas && (
              <button
                onClick={() => navegar('/consulta-factura')}
                className={`block w-full text-left px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  paginaActual === 'consulta-factura'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Consulta Factura
              </button>
            )}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="px-3 py-2 text-sm text-gray-500">
                {usuario?.email}
              </div>
              <button
                onClick={manejarCerrarSesion}
                className="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
