#!/bin/sh
# Aplica en el servidor una versión de AgroPrecios que GitHub Actions ya subió.
# Lo copia y ejecuta el workflow .github/workflows/desplegar.yml; también se
# puede usar a mano en el servidor (ver docs/DESPLIEGUE-GCP.md):
#
#   sh ~/agroprecios/desplegar-remoto.sh <version>   # aplica la versión (SHA del commit)
#   sh ~/agroprecios/desplegar-remoto.sh --revertir  # vuelve a la versión anterior
#
# Pasos: respaldo previo -> etiqueta la versión nueva como "latest" (y guarda la
# actual como "anterior") -> migraciones -> semillas (idempotentes) -> arranque
# -> verificación de /api/salud. Si la verificación falla, vuelve a la versión
# anterior. Las migraciones NO se revierten solas: para eso está el respaldo previo.
set -eu

cd "$(dirname "$0")"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"
IMAGENES="agroprecios-api agroprecios-web"

if [ ! -f .env.prod ]; then
  echo "[desplegar] ERROR: falta $(pwd)/.env.prod (ver docs/DESPLIEGUE-GCP.md)" >&2
  exit 1
fi
# Se crea antes del primer "up" para que pertenezca a este usuario y no a root.
mkdir -p respaldos

existe_imagen() {
  docker image inspect "$1" >/dev/null 2>&1
}

verificar_salud() {
  # La API tarda unos segundos en arrancar: hasta 24 intentos (unos 2 minutos).
  intento=1
  while [ "$intento" -le 24 ]; do
    if $COMPOSE exec -T api wget -q -O - http://127.0.0.1:3000/api/salud 2>/dev/null | grep -q '"estado":"ok"'; then
      echo "[desplegar] /api/salud responde ok"
      return 0
    fi
    sleep 5
    intento=$((intento + 1))
  done
  return 1
}

usar_anterior() {
  for imagen in $IMAGENES; do
    if ! existe_imagen "$imagen:anterior"; then
      echo "[desplegar] ERROR: no hay versión anterior de $imagen" >&2
      return 1
    fi
    docker tag "$imagen:anterior" "$imagen:latest"
  done
  $COMPOSE up -d --no-build --remove-orphans
}

if [ "${1:-}" = "--revertir" ]; then
  echo "[desplegar] Volviendo a la versión anterior"
  usar_anterior
  verificar_salud
  exit $?
fi

VERSION="${1:?Uso: desplegar-remoto.sh <version> | --revertir}"

for imagen in $IMAGENES; do
  if ! existe_imagen "$imagen:$VERSION"; then
    echo "[desplegar] ERROR: no está cargada la imagen $imagen:$VERSION" >&2
    exit 1
  fi
done

# 1. Respaldo previo (si la base ya está corriendo). El nombre empieza por
#    "agroprecios-" para que la retención de respaldar.sh también lo borre.
#    Si el respaldo falla, el despliegue se detiene sin tocar nada.
if $COMPOSE ps --status running --services 2>/dev/null | grep -qx db; then
  archivo="respaldos/agroprecios-predespliegue-$(date +%Y%m%d-%H%M).dump"
  echo "[desplegar] Respaldo previo: $archivo"
  $COMPOSE exec -T db sh -c \
    'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' > "$archivo.tmp"
  mv "$archivo.tmp" "$archivo"
fi

# 2. Etiquetas: la actual pasa a "anterior" y la nueva a "latest".
hay_anterior=no
for imagen in $IMAGENES; do
  if existe_imagen "$imagen:latest"; then
    docker tag "$imagen:latest" "$imagen:anterior"
    hay_anterior=si
  fi
  docker tag "$imagen:$VERSION" "$imagen:latest"
  docker rmi "$imagen:$VERSION" >/dev/null
done

# 3. Esquema y catálogo con la imagen nueva (arranca la base si hace falta).
echo "[desplegar] Migraciones"
$COMPOSE run --rm api npm run migration:run:prod
echo "[desplegar] Semillas del catálogo"
$COMPOSE run --rm api npm run seed:prod

# 4. Arranque y verificación.
echo "[desplegar] Arrancando la versión $VERSION"
$COMPOSE up -d --no-build --remove-orphans

if verificar_salud; then
  docker image prune -f >/dev/null
  echo "[desplegar] Listo: versión $VERSION"
  exit 0
fi

echo "[desplegar] ERROR: la versión $VERSION no pasó la verificación de salud" >&2
$COMPOSE logs --tail 80 api >&2 || true
if [ "$hay_anterior" = si ]; then
  echo "[desplegar] Volviendo a la versión anterior" >&2
  usar_anterior || true
fi
exit 1
