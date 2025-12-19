/**
 * Tipo que representa una entrega registrada en el sistema
 * 
 * Cada entrega está asociada a un usuario y contiene información
 * sobre la facturación y el valor de la entrega.
 */
export interface Entrega {
  id: string;
  user_id: string;
  fecha_domicilio: string;
  numero_factura: string;
  valor: number;
  created_at: string;
}

/**
 * Tipo que representa una entrega con información del usuario
 * 
 * Se utiliza en el panel de administrador para mostrar el email
 * del usuario junto con los datos de la entrega.
 */
export interface EntregaConUsuario extends Entrega {
  usuario_email: string;
}

/**
 * Tipo que representa los totales calculados por usuario
 * 
 * Se utiliza en el panel de administrador para mostrar los
 * totales agrupados por usuario.
 */
export interface TotalPorUsuario {
  usuario_email: string;
  total: number;
}



