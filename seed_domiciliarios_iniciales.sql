-- Seed opcional: habilita domiciliarios iniciales para alistamiento
-- Ejecutar DESPUÉS de setup_alistamiento.sql y cuando los usuarios ya estén registrados en Supabase Auth
-- Los administradores pueden agregar o quitar domiciliarios desde el panel administrativo

INSERT INTO domiciliarios (
  id,
  user_id,
  nombre_completo,
  cedula,
  placa,
  activo
)
SELECT
  'dom_' || REPLACE(u.id::text, '-', ''),
  u.id,
  COALESCE(u.raw_user_meta_data->>'nombre_completo', SPLIT_PART(u.email, '@', 1)),
  'PENDIENTE',
  'PENDIENTE-' || SUBSTRING(u.id::text, 1, 8),
  true
FROM auth.users u
WHERE LOWER(u.email) IN (
  'xander610@hotmail.com',
  'alejo16barreto@gmail.com',
  'luiscarlguerra.24@gmail.com',
  'danielvillamil943@gmail.com'
)
ON CONFLICT (user_id) DO NOTHING;

-- Los administradores deben completar nombre, cédula, placa y documentación desde el panel
