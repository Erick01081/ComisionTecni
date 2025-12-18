'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerUsuarioActual, esAdministrador } from '@/lib/auth';

interface ProtegerRutaProps {
  children: React.ReactNode;
  requiereAdmin?: boolean;
}

/**
 * Componente que protege rutas requiriendo autenticación
 * 
 * Este componente verifica si el usuario está autenticado antes de mostrar
 * el contenido. Si no está autenticado, redirige al login. Si requiere
 * permisos de administrador, también verifica ese rol.
 * 
 * Complejidad: O(1) - Solo verifica la sesión
 * 
 * @param children - Contenido a mostrar si el usuario está autenticado
 * @param requiereAdmin - Si es true, solo permite acceso a administradores (boolean, opcional)
 */
export default function ProtegerRuta({ children, requiereAdmin = false }: ProtegerRutaProps) {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    async function verificarAutenticacion() {
      const usuario = await obtenerUsuarioActual();

      if (!usuario) {
        router.push('/');
        return;
      }

      if (requiereAdmin && !esAdministrador(usuario.email)) {
        router.push('/registro');
        return;
      }

      setAutorizado(true);
      setCargando(false);
    }

    verificarAutenticacion();
  }, [router, requiereAdmin]);

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!autorizado) {
    return null;
  }

  return <>{children}</>;
}
