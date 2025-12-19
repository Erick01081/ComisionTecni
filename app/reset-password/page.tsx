'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { obtenerClienteSupabase } from '@/lib/auth';
import Logo from '@/components/Logo';

/**
 * Componente interno de restablecimiento de contraseña
 * 
 * Complejidad: O(1) - Solo maneja el estado del formulario y una llamada de actualización
 */
function ResetPasswordForm(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [tokenValido, setTokenValido] = useState<boolean | null>(null);

  useEffect(() => {
    /**
     * Verifica si hay un token de recuperación válido en la URL
     * 
     * Complejidad: O(1) - Solo verifica parámetros de URL
     */
    async function verificarToken() {
      const supabase = obtenerClienteSupabase();
      if (!supabase) {
        setError('Error de configuración');
        setTokenValido(false);
        return;
      }

      // Verificar si hay un hash de token en la URL (Supabase lo envía así)
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        setTokenValido(true);
      } else {
        // También verificar parámetros de consulta
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        if (accessToken && refreshToken) {
          setTokenValido(true);
        } else {
          setError('Token de recuperación inválido o expirado. Por favor, solicita un nuevo enlace de recuperación.');
          setTokenValido(false);
        }
      }
    }

    verificarToken();
  }, [searchParams]);

  /**
   * Maneja el envío del formulario de restablecimiento de contraseña
   * 
   * Complejidad: O(1) - Solo realiza una llamada de actualización de contraseña
   */
  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setExito(false);

    // Validaciones
    if (!password || !confirmarPassword) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setCargando(true);

    try {
      const supabase = obtenerClienteSupabase();
      if (!supabase) {
        throw new Error('Error de configuración');
      }

      // Obtener tokens de la URL
      const hash = window.location.hash;
      let accessToken = '';
      let refreshToken = '';

      if (hash) {
        // Parsear el hash de Supabase
        const params = new URLSearchParams(hash.substring(1));
        accessToken = params.get('access_token') || '';
        refreshToken = params.get('refresh_token') || '';
      } else {
        // Intentar desde query params
        accessToken = searchParams.get('access_token') || '';
        refreshToken = searchParams.get('refresh_token') || '';
      }

      if (!accessToken || !refreshToken) {
        throw new Error('Token de recuperación inválido o expirado');
      }

      // Establecer la sesión con los tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        throw new Error('Token inválido o expirado. Por favor, solicita un nuevo enlace de recuperación.');
      }

      // Actualizar la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw new Error(updateError.message || 'Error al actualizar la contraseña');
      }

      setExito(true);
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña');
    } finally {
      setCargando(false);
    }
  };

  if (tokenValido === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6 sm:p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Verificando token...</p>
          </div>
        </div>
      </div>
    );
  }

  if (tokenValido === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-4">
              <Logo />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              Token Inválido
            </h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => router.push('/')}
              className="bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors text-base font-medium"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            Restablecer Contraseña
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Ingresa tu nueva contraseña
          </p>
        </div>

        {exito ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              Contraseña restablecida exitosamente. Redirigiendo al inicio de sesión...
            </div>
          </div>
        ) : (
          <form onSubmit={manejarSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Nueva Contraseña *
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                placeholder="Ingresa tu nueva contraseña (mínimo 6 caracteres)"
              />
            </div>

            <div>
              <label htmlFor="confirmar-password" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Contraseña *
              </label>
              <input
                id="confirmar-password"
                type="password"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                placeholder="Confirma tu nueva contraseña"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base font-medium"
            >
              {cargando ? 'Restableciendo...' : 'Restablecer Contraseña'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * Página de restablecimiento de contraseña
 * 
 * Esta página permite a los usuarios restablecer su contraseña después de
 * hacer clic en el enlace de recuperación enviado por email. Verifica el token
 * de Supabase y permite establecer una nueva contraseña.
 * 
 * Complejidad: O(1) - Solo renderiza el componente con Suspense
 */
export default function ResetPasswordPage(): JSX.Element {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6 sm:p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
