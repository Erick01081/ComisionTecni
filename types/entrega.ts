/**
 * Valores válidos para la forma de pago de una entrega.
 * Se utiliza como tipo restrictivo para evitar valores no permitidos.
 */
export type FormaPago =
  | 'EFECTIVO'
  | 'NEQUI'
  | 'DAVIPLATA'
  | 'DATAFONO'
  | 'DAVIVIENDA (LLAVE)'
  | 'BANCOLOMBIA'
  | 'BOGOTÁ'
  | 'CREDITO'
  | 'FLEX'
  | '';

/**
 * Lista de formas de pago disponibles en el sistema.
 * Se reutiliza en el formulario de registro y en las vistas de consulta.
 */
export const FORMAS_DE_PAGO: FormaPago[] = [
  'EFECTIVO',
  'NEQUI',
  'DAVIPLATA',
  'DATAFONO',
  'DAVIVIENDA (LLAVE)',
  'BANCOLOMBIA',
  'BOGOTÁ',
  'CREDITO',
  'FLEX',
];

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
  forma_pago: string | null;
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



