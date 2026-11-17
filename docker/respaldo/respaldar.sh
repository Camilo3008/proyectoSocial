#!/bin/sh
# Respaldo diario de PostgreSQL para AgroPrecios.
# Corre dentro del contenedor "respaldo" (docker-compose.prod.yml): espera hasta
# las 2:00 a. m. (hora de Bogotá), hace pg_dump en formato custom y borra los
# respaldos con más de DIAS_RETENCION días. Restaurar: ver docs/DESPLIEGUE.md.
set -eu

DIAS_RETENCION="${DIAS_RETENCION:-14}"
DESTINO=/respaldos

respaldar() {
  archivo="$DESTINO/agroprecios-$(date +%Y%m%d-%H%M).dump"
  echo "[respaldo] $(date -Iseconds) iniciando $archivo"
  if pg_dump --format=custom --no-owner --file="$archivo.tmp"; then
    mv "$archivo.tmp" "$archivo"
    echo "[respaldo] listo ($(du -h "$archivo" | cut -f1))"
  else
    rm -f "$archivo.tmp"
    echo "[respaldo] ERROR: pg_dump falló" >&2
  fi
  find "$DESTINO" -name 'agroprecios-*.dump' -mtime +"$DIAS_RETENCION" -delete
}

mkdir -p "$DESTINO"
while true; do
  ahora=$(date +%s)
  objetivo=$(date -d "$(date +%Y-%m-%d) 02:00" +%s 2>/dev/null || echo 0)
  # BusyBox date no siempre entiende -d con hora: si falla, respalda cada 24 h.
  if [ "$objetivo" -eq 0 ]; then
    respaldar
    sleep 86400
    continue
  fi
  if [ "$objetivo" -le "$ahora" ]; then
    objetivo=$((objetivo + 86400))
  fi
  sleep $((objetivo - ahora))
  respaldar
done
