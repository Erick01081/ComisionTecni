-- Módulo de Alistamiento Diario de Motocicletas
-- Ejecutar en Supabase SQL Editor después de setup_database.sql

-- Tabla de domiciliarios (usuarios con motocicleta asignada)
CREATE TABLE IF NOT EXISTS domiciliarios (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  cedula TEXT NOT NULL,
  placa TEXT NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  soat_numero TEXT,
  soat_vigencia DATE,
  revision_tecnico_mecanica TEXT,
  revision_vigencia DATE,
  certificado_gases TEXT,
  certificado_gases_vigencia DATE,
  tarjeta_propiedad TEXT,
  tarjeta_propiedad_vigencia DATE,
  licencia_conduccion_a2 TEXT,
  licencia_vigencia DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_domiciliarios_user_id ON domiciliarios(user_id);
CREATE INDEX IF NOT EXISTS idx_domiciliarios_placa ON domiciliarios(placa);
CREATE INDEX IF NOT EXISTS idx_domiciliarios_activo ON domiciliarios(activo);

-- Tabla de alistamientos diarios
CREATE TABLE IF NOT EXISTS alistamientos (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domiciliario_id TEXT NOT NULL REFERENCES domiciliarios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  es_festivo BOOLEAN NOT NULL DEFAULT false,
  observaciones TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_alistamiento_usuario_fecha UNIQUE (user_id, fecha),
  CONSTRAINT unique_alistamiento_domiciliario_fecha UNIQUE (domiciliario_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_alistamientos_user_id ON alistamientos(user_id);
CREATE INDEX IF NOT EXISTS idx_alistamientos_domiciliario_id ON alistamientos(domiciliario_id);
CREATE INDEX IF NOT EXISTS idx_alistamientos_fecha ON alistamientos(fecha);

-- Tabla de items del checklist por alistamiento
CREATE TABLE IF NOT EXISTS alistamiento_items (
  id TEXT PRIMARY KEY,
  alistamiento_id TEXT NOT NULL REFERENCES alistamientos(id) ON DELETE CASCADE,
  elemento_codigo TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('bueno', 'malo', 'no_aplica', 'festivo')),
  CONSTRAINT unique_alistamiento_elemento UNIQUE (alistamiento_id, elemento_codigo)
);

CREATE INDEX IF NOT EXISTS idx_alistamiento_items_alistamiento_id ON alistamiento_items(alistamiento_id);

-- Row Level Security
ALTER TABLE domiciliarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE alistamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alistamiento_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Domiciliarios ven su propio perfil" ON domiciliarios;
DROP POLICY IF EXISTS "Usuarios ven sus propios alistamientos" ON alistamientos;
DROP POLICY IF EXISTS "Usuarios insertan sus propios alistamientos" ON alistamientos;
DROP POLICY IF EXISTS "Usuarios ven items de sus alistamientos" ON alistamiento_items;
DROP POLICY IF EXISTS "Usuarios insertan items de sus alistamientos" ON alistamiento_items;

CREATE POLICY "Domiciliarios ven su propio perfil"
ON domiciliarios FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios ven sus propios alistamientos"
ON alistamientos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan sus propios alistamientos"
ON alistamientos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios ven items de sus alistamientos"
ON alistamiento_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM alistamientos a
    WHERE a.id = alistamiento_items.alistamiento_id
    AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Usuarios insertan items de sus alistamientos"
ON alistamiento_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM alistamientos a
    WHERE a.id = alistamiento_items.alistamiento_id
    AND a.user_id = auth.uid()
  )
);

-- Nota: Las operaciones administrativas usan SUPABASE_SERVICE_ROLE_KEY desde el servidor
