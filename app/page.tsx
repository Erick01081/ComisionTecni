'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { iniciarSesion, registrarUsuario, obtenerUsuarioActual } from '@/lib/auth';

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

  useEffect(() => {
    async function verificarSesion() {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Comisiones Tecni
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {esRegistro ? 'Crear nueva cuenta' : 'Inicia sesión en tu cuenta'}
          </p>
        </div>

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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
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
      </div>
    </div>
  );
}
