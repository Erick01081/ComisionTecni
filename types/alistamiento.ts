export const ESTADOS_ALISTAMIENTO = ['BUENO', 'MALO', 'NO_APLICA', 'FESTIVO'] as const;

export type EstadoAlistamiento = (typeof ESTADOS_ALISTAMIENTO)[number];

export interface PerfilDomiciliario {
  user_id: string;
  email?: string;
  es_domiciliario: boolean;
  nombre_completo: string | null;
  cedula: string | null;
  placa: string | null;
  soat: string | null;
  soat_vigencia: string | null;
  revision_tecnico_mecanica: string | null;
  certificado_gases: string | null;
  tarjeta_propiedad: string | null;
  licencia_a2_vigencia: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemChecklist {
  id: number;
  nombre: string;
  orden: number;
}

export interface Alistamiento {
  id: string;
  user_id: string;
  fecha: string;
  es_festivo: boolean;
  observaciones: string | null;
  created_at: string;
}

export interface AlistamientoConItems extends Alistamiento {
  items: Array<{
    item_id: number;
    estado: EstadoAlistamiento;
  }>;
}
