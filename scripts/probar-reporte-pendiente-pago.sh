#!/bin/bash
# Prueba manual del reporte semanal de Pendiente de Pago en producción.
# Uso: CRON_SECRET=tu_secreto ./scripts/probar-reporte-pendiente-pago.sh

DOMINIO="${DOMINIO:-https://comision-tecni.vercel.app}"
CRON_SECRET="${CRON_SECRET:-}"

if [ -z "$CRON_SECRET" ]; then
  echo "Error: define CRON_SECRET con el valor de Vercel."
  echo "Ejemplo: CRON_SECRET=abc123 ./scripts/probar-reporte-pendiente-pago.sh"
  exit 1
fi

echo "Llamando a ${DOMINIO}/api/cron/pendiente-pago ..."
echo ""

curl -s -w "\n\nHTTP status: %{http_code}\n" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${DOMINIO}/api/cron/pendiente-pago" | python3 -m json.tool 2>/dev/null || \
curl -s -w "\n\nHTTP status: %{http_code}\n" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${DOMINIO}/api/cron/pendiente-pago"
