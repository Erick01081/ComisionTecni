'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { iniciarSesion, registrarUsuario, obtenerUsuarioActual, recuperarContrasena, obtenerClienteSupabase } from '@/lib/auth';
import Logo from '@/components/Logo';

/**
 * Página principal de login y registro
 * 
 * Esta página permite a los usuarios iniciar sesión o registrarse.
 * Si el usuario ya está autenticado, redirige automáticamente a la
 * página de registro de entregas.
 * 
 * Complejidad: O(1) - Solo maneja el estado del formulario
 */
export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const [esRegistro, setEsRegistro] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [enviandoRecuperacion, setEnviandoRecuperacion] = useState(false);

  useEffect(() => {
    async function verificarSesion() {
      const supabase = obtenerClienteSupabase();
      if (!supabase) return;
      
      // Verificar si hay un hash de recuperación en la URL
      // Si hay, redirigir a reset-password con el hash completo
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (hash && (hash.includes('access_token') || hash.includes('type=recovery'))) {
        // Preservar el hash completo al redirigir
        router.push(`/reset-password${hash}`);
        return;
      }
      
      // También verificar si hay parámetros de recuperación en la URL
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const tipoRecuperacion = urlParams?.get('type');
      if (tipoRecuperacion === 'recovery') {
        // Si viene de la página de verificación de Supabase, esperar a que redirija con hash
        // o redirigir manualmente a reset-password
        router.push('/reset-password');
        return;
      }
      
      const usuario = await obtenerUsuarioActual();
      if (usuario) {
        router.push('/registro');
      }
    }
    verificarSesion();
  }, [router]);

  /**
   * Maneja el envío del formulario de login o registro
   * 
   * Complejidad: O(1) - Solo realiza una llamada de autenticación
   */
  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    setCargando(true);

    try {
      if (esRegistro) {
        await registrarUsuario(email, password);
        setMensaje('Registro exitoso. Por favor, inicia sesión.');
        setEsRegistro(false);
      } else {
        await iniciarSesion(email, password);
        router.push('/registro');
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud');
    } finally {
      setCargando(false);
    }
  };

  /**
   * Maneja el envío del formulario de recuperación de contraseña
   * 
   * Complejidad: O(1) - Solo realiza una llamada a la API
   */
  const manejarRecuperarContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    setEnviandoRecuperacion(true);

    try {
      await recuperarContrasena(email);
      setMensaje('Se ha enviado un email con las instrucciones para recuperar tu contraseña. Revisa tu bandeja de entrada.');
      setMostrarRecuperar(false);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Error al enviar el email de recuperación');
    } finally {
      setEnviandoRecuperacion(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 my-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            {mostrarRecuperar 
              ? 'Recuperar contraseña' 
              : esRegistro 
                ? 'Crear nueva cuenta' 
                : 'Inicia sesión en tu cuenta'}
          </p>
        </div>

        {mostrarRecuperar ? (
          <form onSubmit={manejarRecuperarContrasena} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="email-recuperar" className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <input
                id="email-recuperar"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                placeholder="Ingresa tu correo electrónico"
              />
              <p className="mt-2 text-xs text-gray-500">
                Te enviaremos un enlace para restablecer tu contraseña
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {mensaje && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {mensaje}
              </div>
            )}

            <button
              type="submit"
              disabled={enviandoRecuperacion}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base font-medium"
            >
              {enviandoRecuperacion ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMostrarRecuperar(false);
                  setError('');
                  setMensaje('');
                  setEmail('');
                }}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={manejarSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="Ingresa tu correo electrónico"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Contraseña
                  </label>
                  {!esRegistro && (
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarRecuperar(true);
                        setError('');
                        setMensaje('');
                        setPassword('');
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="Ingresa tu contraseña (mínimo 6 caracteres)"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {mensaje && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {mensaje}
                </div>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base font-medium"
              >
                {cargando ? 'Procesando...' : esRegistro ? 'Registrarse' : 'Iniciar sesión'}
              </button>
            </form>

            <div className="mt-4 sm:mt-6 text-center">
              <button
                onClick={() => {
                  setEsRegistro(!esRegistro);
                  setError('');
                  setMensaje('');
                }}
                className="text-primary-600 hover:text-primary-700 text-sm sm:text-base font-medium py-2"
              >
                {esRegistro
                  ? '¿Ya tienes cuenta? Inicia sesión'
                  : '¿No tienes cuenta? Regístrate'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

