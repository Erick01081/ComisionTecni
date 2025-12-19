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
  const [esRecuperacion, setEsRecuperacion] = useState(false);

  // Prevenir navegación si hay una sesión de recuperación activa
  useEffect(() => {
    if (esRecuperacion && tokenValido && !exito) {
      // Prevenir que el usuario navegue a otras páginas mientras está en recuperación
      const manejarAntesDeSalir = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      
      window.addEventListener('beforeunload', manejarAntesDeSalir);
      
      return () => {
        window.removeEventListener('beforeunload', manejarAntesDeSalir);
      };
    }
  }, [esRecuperacion, tokenValido, exito]);

  useEffect(() => {
    /**
     * Verifica si hay un token de recuperación válido en la URL
     * Supabase procesa automáticamente el hash cuando se carga la página
     * 
     * Complejidad: O(1) - Solo verifica la sesión y parámetros de URL
     */
    let subscription: any = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;

    async function verificarToken() {
      // Si ya tenemos un token válido y es recuperación, no verificar de nuevo
      // Esto evita re-renderizados innecesarios
      if (tokenValido === true && esRecuperacion) {
        console.log('[ResetPassword] Token ya válido, omitiendo verificación');
        return;
      }

      const supabase = obtenerClienteSupabase();
      if (!supabase) {
        if (isMounted) {
          setError('Error de configuración');
          setTokenValido(false);
        }
        return;
      }

      // Verificar si hay un hash de token en la URL (Supabase lo envía así después de redirigir)
      const hash = window.location.hash;
      const tieneHash = hash && (hash.includes('access_token') || hash.includes('type=recovery'));
      
      // También verificar parámetros de consulta (por si acaso)
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const tieneQueryParams = accessToken && refreshToken;
      
      // Verificar si hay parámetros de tipo recovery en la URL (puede venir de la página de verificación de Supabase)
      const tipoRecuperacion = searchParams.get('type');
      const tokenRecuperacion = searchParams.get('token');
      const tieneParametrosRecuperacion = tipoRecuperacion === 'recovery' && tokenRecuperacion;

      console.log('[ResetPassword] Estado inicial:', {
        tieneHash: !!tieneHash,
        hash: hash ? hash.substring(0, 50) + '...' : null,
        tieneQueryParams: !!tieneQueryParams,
        tieneParametrosRecuperacion: !!tieneParametrosRecuperacion,
        tipoRecuperacion: tipoRecuperacion,
        urlCompleta: window.location.href.substring(0, 150) + '...'
      });

      if (!tieneHash && !tieneQueryParams && !tieneParametrosRecuperacion) {
        // No hay token en la URL - puede ser que Supabase aún no haya redirigido
        // Esperar un momento para ver si Supabase procesa automáticamente el hash
        console.log('[ResetPassword] No se encontraron tokens, esperando procesamiento automático...');
        
        // Esperar más tiempo para que Supabase procese el hash después de la redirección
        timeoutId = setTimeout(() => {
          if (!isMounted) return;
          
          const hashRetry = window.location.hash;
          const tieneHashRetry = hashRetry && (hashRetry.includes('access_token') || hashRetry.includes('type=recovery'));
          
          // También verificar si hay parámetros en la URL que indiquen recuperación
          const urlParams = new URLSearchParams(window.location.search);
          const tipoRecuperacionRetry = urlParams.get('type');
          const tokenRecuperacionRetry = urlParams.get('token');
          const tieneParametrosRecuperacionRetry = tipoRecuperacionRetry === 'recovery' && tokenRecuperacionRetry;
          
          if (tieneHashRetry) {
            // Si ahora hay hash, procesarlo
            console.log('[ResetPassword] Hash encontrado después de esperar, procesando...');
            setTokenValido(true);
            setEsRecuperacion(true);
            return;
          } else if (tipoRecuperacionRetry === 'recovery' || tieneParametrosRecuperacionRetry) {
            // Si hay parámetro type=recovery pero no hash aún, esperar un poco más
            // Esto puede pasar cuando Supabase está procesando la redirección
            console.log('[ResetPassword] Tipo recovery detectado en parámetros, esperando hash...');
            setTimeout(() => {
              if (!isMounted) return;
              const hashFinal = window.location.hash;
              if (hashFinal && hashFinal.includes('access_token')) {
                console.log('[ResetPassword] Hash encontrado después de esperar');
                setTokenValido(true);
                setEsRecuperacion(true);
              } else {
                // Si aún no hay hash, puede ser que Supabase necesite más tiempo
                // o que el token haya expirado
                console.log('[ResetPassword] No se encontró hash después de esperar');
                setError('No se pudo procesar el token de recuperación. Por favor, solicita un nuevo enlace.');
                setTokenValido(false);
              }
            }, 2000);
            return;
          } else {
            console.log('[ResetPassword] No se encontraron tokens después de esperar');
            setError('No se encontró un token de recuperación en la URL. Por favor, usa el enlace que se envió a tu correo electrónico.');
            setTokenValido(false);
          }
        }, 1000);
        
        return;
      }

      // Escuchar cambios en el estado de autenticación
      // Esto captura cuando Supabase procesa automáticamente el hash
      try {
        const authState = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('[ResetPassword] Auth state change:', event, session ? 'tiene sesión' : 'sin sesión');
          if (!isMounted) return;
          
          // PASSWORD_RECOVERY se dispara cuando Supabase procesa un token de recuperación
          // SIGNED_IN se dispara cuando se establece una sesión
          if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session) {
              console.log('[ResetPassword] Sesión establecida por evento:', event);
              // Solo marcar como válido si es PASSWORD_RECOVERY o si hay hash de recuperación
              const currentHash = window.location.hash;
              const esRecuperacionHash = currentHash && (currentHash.includes('type=recovery') || currentHash.includes('access_token'));
              
              if (event === 'PASSWORD_RECOVERY' || esRecuperacionHash) {
                setTokenValido(true);
                setEsRecuperacion(true);
                // NO limpiar el hash todavía - lo haremos después de cambiar la contraseña
                // Esto evita que el componente pierda el estado al re-renderizarse
              }
            }
          }
        });
        subscription = authState.data.subscription;
      } catch (err) {
        console.error('[ResetPassword] Error al configurar listener de auth:', err);
      }

      // Intentar procesar el hash manualmente si Supabase no lo hizo automáticamente
      if (hash) {
        try {
          const params = new URLSearchParams(hash.substring(1));
          const hashAccessToken = params.get('access_token');
          const hashRefreshToken = params.get('refresh_token');
          const type = params.get('type');
          
          console.log('[ResetPassword] Hash encontrado, type:', type);
          
          // Verificar que es un token de recuperación (o cualquier token válido)
          if (hashAccessToken && hashRefreshToken) {
            console.log('[ResetPassword] Intentando establecer sesión con hash');
            const { error: sessionError, data } = await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken,
            });
            
            console.log('[ResetPassword] Resultado setSession:', { 
              error: sessionError?.message, 
              tieneSesion: !!data.session,
              tipoError: sessionError?.name 
            });
            
            if (!isMounted) return;
            
            if (!sessionError && data.session) {
              setTokenValido(true);
              setEsRecuperacion(true); // Marcar que es un flujo de recuperación
              // NO limpiar el hash todavía - lo haremos después de cambiar la contraseña
              return;
            } else if (sessionError) {
              console.error('[ResetPassword] Error al establecer sesión:', sessionError);
              setError(sessionError.message || 'Token inválido o expirado. Por favor, solicita un nuevo enlace de recuperación.');
              setTokenValido(false);
              return;
            }
          } else {
            console.log('[ResetPassword] Hash no contiene tokens válidos');
          }
        } catch (err: any) {
          console.error('[ResetPassword] Error al procesar hash:', err);
          if (isMounted) {
            setError('Error al procesar el token de recuperación. Por favor, intenta nuevamente.');
            setTokenValido(false);
          }
          return;
        }
      }

      // Si hay query params, intentar establecer la sesión
      if (tieneQueryParams && !tieneHash) {
        try {
          console.log('[ResetPassword] Intentando establecer sesión con query params');
          const { error: sessionError, data } = await supabase.auth.setSession({
            access_token: accessToken!,
            refresh_token: refreshToken!,
          });
          
          if (!isMounted) return;
          
          if (!sessionError && data.session) {
            setTokenValido(true);
            setEsRecuperacion(true);
            return;
          } else if (sessionError) {
            console.error('[ResetPassword] Error con query params:', sessionError);
            setError(sessionError.message || 'Token inválido o expirado. Por favor, solicita un nuevo enlace de recuperación.');
            setTokenValido(false);
            return;
          }
        } catch (err: any) {
          console.error('[ResetPassword] Error al procesar query params:', err);
          if (isMounted) {
            setError('Error al procesar el token de recuperación. Por favor, intenta nuevamente.');
            setTokenValido(false);
          }
          return;
        }
      }

      // Verificar si ya hay una sesión activa (puede que Supabase ya la haya procesado)
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[ResetPassword] Sesión inicial:', session ? 'tiene sesión' : 'sin sesión');
      if (!isMounted) return;
      
      if (session) {
        // Solo permitir si hay hash de recuperación o si es una sesión de recuperación
        const esRecuperacionHash = hash && (hash.includes('type=recovery') || hash.includes('access_token'));
        if (esRecuperacionHash) {
          console.log('[ResetPassword] Sesión encontrada con hash de recuperación');
          setTokenValido(true);
          setEsRecuperacion(true);
          // NO limpiar el hash todavía - lo haremos después de cambiar la contraseña
          return;
        } else {
          // Si hay sesión pero no es de recuperación, redirigir al login
          // porque el usuario no debería estar aquí sin un token de recuperación
          console.log('[ResetPassword] Sesión encontrada pero no es de recuperación, redirigiendo');
          router.push('/');
          return;
        }
      }

      // Si llegamos aquí y no hay sesión pero hay hash, esperar un poco más
      // para que Supabase procese automáticamente el hash
      if (hash) {
        console.log('[ResetPassword] Hay hash pero no sesión, esperando procesamiento automático...');
        timeoutId = setTimeout(async () => {
          if (!isMounted) return;
          
          // Verificar nuevamente la sesión
          const { data: { session: delayedSession } } = await supabase.auth.getSession();
          console.log('[ResetPassword] Sesión después de delay:', delayedSession ? 'tiene sesión' : 'sin sesión');
          
          if (!isMounted) return;
          
          if (delayedSession) {
            setTokenValido(true);
            setEsRecuperacion(true);
            // Limpiar el hash
            window.history.replaceState(null, '', window.location.pathname);
          } else {
            // Si aún no hay sesión, el token puede ser inválido o la URL no está configurada
            console.error('[ResetPassword] No se pudo establecer sesión después de esperar');
            setError('Token de recuperación inválido o expirado. Por favor, verifica que la URL de redirección esté configurada en Supabase y solicita un nuevo enlace de recuperación.');
            setTokenValido(false);
          }
        }, 2000);
      } else {
        // No hay hash ni query params, no hay nada que procesar
        if (isMounted) {
          setError('No se encontró un token de recuperación en la URL. Por favor, usa el enlace que se envió a tu correo electrónico.');
          setTokenValido(false);
        }
      }
    }

    verificarToken();

    // Cleanup
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [searchParams, tokenValido, esRecuperacion]); // Agregar dependencias para evitar re-ejecuciones innecesarias

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

      // Verificar que hay una sesión activa (debería haberse establecido en verificarToken)
      const { data: { session }, error: sessionCheckError } = await supabase.auth.getSession();
      
      if (sessionCheckError || !session) {
        // Intentar obtener tokens de la URL como respaldo
        const hash = window.location.hash;
        let accessToken = '';
        let refreshToken = '';

        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          accessToken = params.get('access_token') || '';
          refreshToken = params.get('refresh_token') || '';
        } else {
          accessToken = searchParams.get('access_token') || '';
          refreshToken = searchParams.get('refresh_token') || '';
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            throw new Error('Token inválido o expirado. Por favor, solicita un nuevo enlace de recuperación.');
          }
        } else {
          throw new Error('No hay sesión activa. Por favor, usa el enlace de recuperación que se envió a tu correo.');
        }
      }

      // Actualizar la contraseña (ahora debería haber una sesión activa)
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw new Error(updateError.message || 'Error al actualizar la contraseña');
      }

      // Cerrar la sesión de recuperación después de cambiar la contraseña
      // Esto fuerza al usuario a iniciar sesión con la nueva contraseña
      await supabase.auth.signOut();

      // Limpiar el hash de la URL ahora que la contraseña se cambió exitosamente
      const hash = window.location.hash;
      if (hash) {
        window.history.replaceState(null, '', window.location.pathname);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 my-auto">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 my-auto">
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 my-auto">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8 my-auto">
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



