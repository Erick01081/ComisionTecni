'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtegerRuta from '@/components/ProtegerRuta';
import Navegacion from '@/components/Navegacion';
import { obtenerUsuarioActual } from '@/lib/auth';

/**
 * Página de registro de entregas
 * 
 * Esta página permite a los usuarios autenticados registrar nuevas entregas
 * con fecha de domicilio, número de factura y valor. También incluye navegación
 * a otras secciones de la aplicación.
 * 
 * Complejidad: O(1) - Solo maneja el estado del formulario
 */
function RegistroPage(): JSX.Element {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [fechaDomicilio, setFechaDomicilio] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [valor, setValor] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  useEffect(() => {
    async function cargarUsuario() {
      const user = await obtenerUsuarioActual();
      setUsuario(user);
    }
    cargarUsuario();
  }, []);

  /**
   * Maneja el envío del formulario de registro de entrega
   * 
   * Complejidad: O(1) - Solo realiza una llamada HTTP
   */
  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setExito(false);

    // Validaciones
    if (!fechaDomicilio || !numeroFactura || !valor) {
      setError('Todos los campos son obligatorios');
      return;
    }

    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      setError('El valor debe ser un número mayor a cero');
      return;
    }

    const numeroFacturaNumerico = numeroFactura.trim();
    if (!numeroFacturaNumerico) {
      setError('El número de factura no puede estar vacío');
      return;
    }

    setCargando(true);

    try {
      // Obtener el token de acceso y refresh token de Supabase
      const { obtenerClienteSupabase } = await import('@/lib/auth');
      const supabase = obtenerClienteSupabase();
      let token = null;
      let refreshToken = null;

      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
        refreshToken = session?.refresh_token || null;
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Enviar refresh token en cookie si está disponible
      if (refreshToken) {
        document.cookie = `sb-refresh-token=${refreshToken}; path=/; SameSite=Lax`;
      }

      // Asegurarse de que la fecha se envíe exactamente como YYYY-MM-DD sin conversión
      // El input de tipo date devuelve YYYY-MM-DD directamente, pero debemos asegurarnos
      // de que no haya ninguna conversión de zona horaria
      let fechaParaEnviar = fechaDomicilio.trim();
      
      // Si por alguna razón viene con hora o zona horaria, extraer solo la fecha
      if (fechaParaEnviar.includes('T')) {
        fechaParaEnviar = fechaParaEnviar.split('T')[0];
      }
      if (fechaParaEnviar.includes(' ')) {
        fechaParaEnviar = fechaParaEnviar.split(' ')[0];
      }
      
      // Validar formato YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaParaEnviar)) {
        throw new Error('Formato de fecha inválido');
      }

      const respuesta = await fetch('/api/entregas', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fecha_domicilio: fechaParaEnviar, // Enviar la fecha normalizada como string
          numero_factura: numeroFacturaNumerico,
          valor: valorNumerico,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || 'Error al registrar la entrega');
      }

      setExito(true);
      setFechaDomicilio('');
      setNumeroFactura('');
      setValor('');

      setTimeout(() => {
        setExito(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al registrar la entrega');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ProtegerRuta>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 overflow-y-auto">
        <Navegacion paginaActual="registro" />

        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Registrar Nueva Entrega</h2>

            <form onSubmit={manejarSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="fecha_domicilio" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha del Domicilio *
                </label>
                <input
                  id="fecha_domicilio"
                  type="date"
                  value={fechaDomicilio}
                  onChange={(e) => setFechaDomicilio(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="numero_factura" className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Factura *
                </label>
                <input
                  id="numero_factura"
                  type="text"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="Ingresa el número de factura (ej: FAC-001234)"
                />
              </div>

              <div>
                <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-2">
                  Valor de la Entrega *
                </label>
                <input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="Ingresa el valor de la entrega (ej: 50000)"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {exito && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  Entrega registrada exitosamente
                </div>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base font-medium"
              >
                {cargando ? 'Registrando...' : 'Registrar Entrega'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtegerRuta>
  );
}

export default RegistroPage;



