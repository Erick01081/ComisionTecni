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

-- Nota: Para que los administradores puedan ver todas las entregas,
-- se debe crear una función en Supabase que verifique si el usuario es administrador
-- o se puede usar el servicio admin desde el servidor (como se hace en la aplicación)

-- Comentarios sobre la estructura:
-- - id: Identificador único de la entrega (generado en la aplicación)
-- - user_id: Referencia al usuario autenticado (UUID de auth.users)
-- - fecha_domicilio: Fecha del domicilio (DATE)
-- - numero_factura: Número de factura (TEXT)
-- - valor: Valor de la entrega (DECIMAL con 2 decimales, debe ser mayor a 0)
-- - created_at: Fecha de creación del registro (TIMESTAMP con zona horaria)
