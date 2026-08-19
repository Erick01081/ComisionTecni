-- Ejecutar en Supabase SQL Editor para habilitar el módulo de mantenimientos.
CREATE TABLE IF NOT EXISTS mantenimientos_moto (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  placa_snapshot TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  descripcion TEXT NOT NULL,
  kilometraje_actual INTEGER NOT NULL CHECK (kilometraje_actual >= 0),
  kilometraje_proximo_cambio INTEGER CHECK (kilometraje_proximo_cambio IS NULL OR kilometraje_proximo_cambio >= 0),
  valor NUMERIC(12,2) CHECK (valor IS NULL OR valor >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mantenimientos_moto_user_fecha ON mantenimientos_moto(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_moto_placa_fecha ON mantenimientos_moto(placa_snapshot, fecha DESC);

ALTER TABLE mantenimientos_moto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario ve sus mantenimientos" ON mantenimientos_moto;
DROP POLICY IF EXISTS "Usuario crea sus mantenimientos" ON mantenimientos_moto;

CREATE POLICY "Usuario ve sus mantenimientos"
ON mantenimientos_moto FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuario crea sus mantenimientos"
ON mantenimientos_moto FOR INSERT
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
