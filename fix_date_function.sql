-- Función para insertar entregas asegurando que la fecha se guarde correctamente
-- Esta función evita problemas de conversión de zona horaria

CREATE OR REPLACE FUNCTION insertar_entrega(
  p_id TEXT,
  p_user_id UUID,
  p_fecha_domicilio TEXT, -- Recibe como texto YYYY-MM-DD
  p_numero_factura TEXT,
  p_valor DECIMAL,
  p_forma_pago TEXT DEFAULT NULL,
  p_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  id TEXT,
  user_id UUID,
  fecha_domicilio DATE,
  numero_factura TEXT,
  valor DECIMAL,
  forma_pago TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fecha DATE;
BEGIN
  v_fecha := p_fecha_domicilio::DATE;
  
  INSERT INTO entregas (
    id,
    user_id,
    fecha_domicilio,
    numero_factura,
    valor,
    forma_pago,
    created_at
  ) VALUES (
    p_id,
    p_user_id,
    v_fecha,
    p_numero_factura,
    p_valor,
    p_forma_pago,
    p_created_at
  );
  
  RETURN QUERY
  SELECT 
    e.id,
    e.user_id,
    e.fecha_domicilio,
    e.numero_factura,
    e.valor,
    e.forma_pago,
    e.created_at
  FROM entregas e
  WHERE e.id = p_id;
END;
$$;

-- Permitir que los usuarios autenticados ejecuten esta función
GRANT EXECUTE ON FUNCTION insertar_entrega TO authenticated;



