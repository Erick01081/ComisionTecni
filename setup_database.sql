-- Script de configuración de base de datos para Comisiones Tecni
-- Este script crea la tabla de entregas y configura las políticas de seguridad

-- Crear tabla de entregas
CREATE TABLE IF NOT EXISTS entregas (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_domicilio DATE NOT NULL,
  numero_factura TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL CHECK (valor > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_entregas_user_id ON entregas(user_id);
CREATE INDEX IF NOT EXISTS idx_entregas_fecha_domicilio ON entregas(fecha_domicilio);
CREATE INDEX IF NOT EXISTS idx_entregas_created_at ON entregas(created_at);

-- Habilitar Row Level Security (RLS)
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Los usuarios solo pueden ver sus propias entregas" ON entregas;
DROP POLICY IF EXISTS "Los usuarios solo pueden insertar sus propias entregas" ON entregas;
DROP POLICY IF EXISTS "Los usuarios solo pueden actualizar sus propias entregas" ON entregas;
DROP POLICY IF EXISTS "Los usuarios solo pueden eliminar sus propias entregas" ON entregas;
DROP POLICY IF EXISTS "Los administradores pueden ver todas las entregas" ON entregas;

-- Política: Los usuarios solo pueden ver sus propias entregas
CREATE POLICY "Los usuarios solo pueden ver sus propias entregas"
ON entregas
FOR SELECT
USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden insertar sus propias entregas
CREATE POLICY "Los usuarios solo pueden insertar sus propias entregas"
ON entregas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden actualizar sus propias entregas
CREATE POLICY "Los usuarios solo pueden actualizar sus propias entregas"
ON entregas
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden eliminar sus propias entregas
CREATE POLICY "Los usuarios solo pueden eliminar sus propias entregas"
ON entregas
FOR DELETE
USING (auth.uid() = user_id);

-- Nota: Para que los administradores puedan ver todas las entregas,
-- se debe crear una función en Supabase que verifique si el usuario es administrador
-- o se puede usar el servicio admin desde el servidor (como se hace en la aplicación)

-- Agregar columna forma_pago (opcional) para registrar el método de pago
-- Se ejecuta con IF NOT EXISTS implícito usando DO block para no fallar si ya existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'entregas' AND column_name = 'forma_pago'
  ) THEN
    ALTER TABLE entregas ADD COLUMN forma_pago TEXT DEFAULT NULL;
  END IF;
END $$;

-- Comentarios sobre la estructura:
-- - id: Identificador único de la entrega (generado en la aplicación)
-- - user_id: Referencia al usuario autenticado (UUID de auth.users)
-- - fecha_domicilio: Fecha del domicilio (DATE)
-- - numero_factura: Número de factura (TEXT)
-- - valor: Valor de la entrega (DECIMAL con 2 decimales, debe ser mayor a 0)
-- - forma_pago: Forma de pago opcional (TEXT, puede ser NULL)
-- - created_at: Fecha de creación del registro (TIMESTAMP con zona horaria)

-- =====================================================
-- MÓDULO: ALISTAMIENTO DIARIO DE MOTOCICLETAS
-- =====================================================

-- Perfil de domiciliario y motocicleta (1:1 por usuario cuando aplique)
CREATE TABLE IF NOT EXISTS domiciliario_perfiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  es_domiciliario BOOLEAN NOT NULL DEFAULT false,
  nombre_completo TEXT,
  cedula TEXT,
  placa TEXT UNIQUE,
  soat TEXT,
  soat_vigencia DATE,
  revision_tecnico_mecanica DATE,
  certificado_gases DATE,
  tarjeta_propiedad TEXT,
  licencia_a2_vigencia DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_domiciliario_perfiles_es_domiciliario ON domiciliario_perfiles(es_domiciliario);

-- Catálogo oficial de ítems del checklist
CREATE TABLE IF NOT EXISTS alistamiento_items_catalogo (
  id SMALLINT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  orden SMALLINT NOT NULL UNIQUE
);

-- Cabecera de alistamiento diario
CREATE TABLE IF NOT EXISTS alistamientos_diarios (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  placa_snapshot TEXT,
  es_festivo BOOLEAN NOT NULL DEFAULT false,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uk_alistamiento_user_fecha UNIQUE (user_id, fecha),
  CONSTRAINT uk_alistamiento_placa_fecha UNIQUE (placa_snapshot, fecha)
);

CREATE INDEX IF NOT EXISTS idx_alistamientos_diarios_user_fecha ON alistamientos_diarios(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_alistamientos_diarios_fecha ON alistamientos_diarios(fecha);

-- Detalle de cada ítem del checklist por alistamiento
CREATE TABLE IF NOT EXISTS alistamiento_detalles (
  id BIGSERIAL PRIMARY KEY,
  alistamiento_id TEXT NOT NULL REFERENCES alistamientos_diarios(id) ON DELETE CASCADE,
  item_id SMALLINT NOT NULL REFERENCES alistamiento_items_catalogo(id) ON DELETE RESTRICT,
  estado TEXT NOT NULL CHECK (estado IN ('BUENO', 'MALO', 'NO_APLICA', 'FESTIVO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uk_alistamiento_item UNIQUE (alistamiento_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_alistamiento_detalles_alistamiento_id ON alistamiento_detalles(alistamiento_id);
CREATE INDEX IF NOT EXISTS idx_alistamiento_detalles_item_id ON alistamiento_detalles(item_id);

-- Seed de catálogo de 32 elementos del checklist
INSERT INTO alistamiento_items_catalogo (id, nombre, orden) VALUES
  (1, 'Cambio de aceite / verificación del kilometraje', 1),
  (2, 'Velocímetro', 2),
  (3, 'Retrovisores', 3),
  (4, 'Sistema de embrague', 4),
  (5, 'Freno delantero', 5),
  (6, 'Freno trasero', 6),
  (7, 'Mandos', 7),
  (8, 'Amortiguadores delanteros', 8),
  (9, 'Amortiguadores traseros', 9),
  (10, 'Exosto', 10),
  (11, 'Protector de cadena', 11),
  (12, 'Sistema de transmisión de fuerza', 12),
  (13, 'Sin fuga de aceites ni combustible', 13),
  (14, 'Rines en buen estado', 14),
  (15, 'Llantas en buen estado (con labrado visible)', 15),
  (16, 'Luz frontal', 16),
  (17, 'Luz trasera', 17),
  (18, 'Luces de freno', 18),
  (19, 'Luces direccionales', 19),
  (20, 'Pito', 20),
  (21, 'Aseo general, interno y externo', 21),
  (22, 'Casco en buen estado', 22),
  (23, 'Casco identificado (placa de la moto)', 23),
  (24, 'Guantes en buen estado', 24),
  (25, 'Impermeable en buen estado', 25),
  (26, 'Chaleco reflectivo en buen estado', 26),
  (27, 'Botas con punta de acero', 27),
  (28, 'Cédula de ciudadanía', 28),
  (29, 'Licencia de conducción A2 vigente', 29),
  (30, 'Revisión técnico-mecánica y certificado de gases vigente original', 30),
  (31, 'Tarjeta de propiedad vigente original', 31),
  (32, 'Seguro obligatorio vigente original (SOAT)', 32)
ON CONFLICT (id) DO UPDATE
SET nombre = EXCLUDED.nombre,
    orden = EXCLUDED.orden;

-- Marcar los domiciliarios iniciales (gestionables después desde admin)
INSERT INTO domiciliario_perfiles (user_id, es_domiciliario)
SELECT id, true
FROM auth.users
WHERE lower(email) IN (
  'e.santiagom.s@gmail.com',
  'xander610@hotmail.com',
  'alejo16barreto@gmail.com',
  'luiscarlguerra.24@gmail.com',
  'danielvillamil943@gmail.com'
)
ON CONFLICT (user_id) DO UPDATE
SET es_domiciliario = true,
    updated_at = TIMEZONE('utc'::text, NOW());

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION actualizar_updated_at_domiciliario_perfiles()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_updated_at_domiciliario_perfiles ON domiciliario_perfiles;
CREATE TRIGGER trg_actualizar_updated_at_domiciliario_perfiles
BEFORE UPDATE ON domiciliario_perfiles
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at_domiciliario_perfiles();

-- Habilitar RLS
ALTER TABLE domiciliario_perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alistamientos_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE alistamiento_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alistamiento_items_catalogo ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas para idempotencia
DROP POLICY IF EXISTS "Usuario ve su perfil domiciliario" ON domiciliario_perfiles;
DROP POLICY IF EXISTS "Usuario crea su perfil domiciliario" ON domiciliario_perfiles;
DROP POLICY IF EXISTS "Usuario actualiza su perfil domiciliario" ON domiciliario_perfiles;
DROP POLICY IF EXISTS "Usuario ve sus alistamientos diarios" ON alistamientos_diarios;
DROP POLICY IF EXISTS "Usuario crea sus alistamientos diarios" ON alistamientos_diarios;
DROP POLICY IF EXISTS "Usuario ve detalles de sus alistamientos" ON alistamiento_detalles;
DROP POLICY IF EXISTS "Usuario inserta detalles de sus alistamientos" ON alistamiento_detalles;
DROP POLICY IF EXISTS "Usuarios autenticados ven catálogo de alistamiento" ON alistamiento_items_catalogo;

-- Políticas RLS para usuario autenticado
CREATE POLICY "Usuario ve su perfil domiciliario"
ON domiciliario_perfiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuario crea su perfil domiciliario"
ON domiciliario_perfiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuario actualiza su perfil domiciliario"
ON domiciliario_perfiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuario ve sus alistamientos diarios"
ON alistamientos_diarios
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuario crea sus alistamientos diarios"
ON alistamientos_diarios
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM domiciliario_perfiles p
    WHERE p.user_id = auth.uid()
      AND p.es_domiciliario = true
      AND p.placa IS NOT NULL
  )
);

CREATE POLICY "Usuario ve detalles de sus alistamientos"
ON alistamiento_detalles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM alistamientos_diarios a
    WHERE a.id = alistamiento_id
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Usuario inserta detalles de sus alistamientos"
ON alistamiento_detalles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM alistamientos_diarios a
    WHERE a.id = alistamiento_id
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Usuarios autenticados ven catálogo de alistamiento"
ON alistamiento_items_catalogo
FOR SELECT
USING (auth.role() = 'authenticated');
