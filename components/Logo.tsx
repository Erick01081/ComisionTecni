import Image from 'next/image';

/**
 * Componente de logo para la aplicación
 * 
 * Este componente renderiza el logo de la aplicación de forma responsive.
 * Se adapta a diferentes tamaños de pantalla y puede ser usado en diferentes contextos.
 * 
 * Complejidad: O(1) - Solo renderiza imagen
 * 
 * @param className - Clases CSS adicionales para personalizar el tamaño (string, opcional)
 * @param mostrarTexto - Si se muestra el texto junto al logo (boolean, opcional)
 */
export default function Logo({ className = '', mostrarTexto = true }: { className?: string; mostrarTexto?: boolean }) {
  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="Comisiones Tecnirecargas"
        width={40}
        height={40}
        className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 object-contain"
        priority
      />
      {mostrarTexto && (
        <span className="ml-2 text-lg sm:text-xl font-bold text-gray-800 whitespace-nowrap">Comisiones Tecnirecargas</span>
      )}
    </div>
  );
}

