# Despliegue de AgroPrecios

> Guía para poner AgroPrecios en un servidor propio con Docker. **Nada de esto
> se ha ejecutado todavía en un servidor real**: los archivos están listos y las
> imágenes se construyeron en local, pero falta elegir el servidor y el dominio
> (ver `docs/PENDIENTES.md`).

## 1. Arquitectura en producción

```
Internet ──HTTPS──► Caddy (contenedor "web", puertos 80/443)
                      ├── /api/*  ──► API NestJS (contenedor "api", puerto 3000 interno)
                      │                  └──► PostgreSQL (contenedor "db", sin puertos públicos)
                      └── /*      ──► archivos de la PWA (build de Angular)
              contenedor "respaldo": pg_dump diario a ./respaldos
```

- La web y la API se sirven desde el **mismo dominio**: no hace falta CORS
  entre dominios y el service worker cachea `/api/**` sin problemas.
- Caddy obtiene y renueva **solo** el certificado HTTPS (Let's Encrypt).
- La base de datos no se expone a internet.

| Archivo | Para qué |
|---|---|
| `docker-compose.prod.yml` | Los cuatro servicios: `db`, `api`, `web`, `respaldo` |
| `apps/api/Dockerfile` | Imagen de la API (Node 24 Alpine, usuario sin privilegios, solo dependencias de producción) |
| `apps/web/Dockerfile` | Compila la PWA (verifica el presupuesto < 200 kB gzip) y la copia a una imagen de Caddy |
| `docker/caddy/Caddyfile` | HTTPS, proxy a la API, encabezados de seguridad (CSP, HSTS) y caché de archivos |
| `docker/respaldo/respaldar.sh` | Respaldo diario a las 2:00 a. m. con retención configurable |
| `.env.prod.example` | Plantilla de variables de producción |

## 2. Requisitos del servidor

- Un VPS Linux (por ejemplo Ubuntu 24.04 LTS) con **2 GB de RAM** como mínimo:
  la ingesta de SIPSA procesa en streaming una respuesta de ~316 MB y la de
  FAOSTAT un CSV de ~214 MB. 1 vCPU es suficiente. Disco: 20 GB.
- Docker Engine y el plugin Docker Compose instalados.
- Un **dominio** con un registro DNS `A` apuntando a la IP del servidor.
- Puertos **80 y 443** abiertos (Caddy los necesita para el certificado).

## 3. Primer despliegue

```bash
# 1. Código (en el servidor)
git clone <repositorio> agroprecios && cd agroprecios

# 2. Variables: copiar la plantilla y poner valores REALES
cp .env.prod.example .env.prod
nano .env.prod          # DOMINIO, ACME_EMAIL, CORS_ORIGIN, claves, JWT_SECRET…
chmod 600 .env.prod

# 3. Construir y levantar
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 4. Esquema y catálogo (una vez, y después de cada actualización con migraciones)
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm api npm run migration:run:prod
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm api npm run seed:prod

# 5. Verificar
curl https://<dominio>/api/salud
```

Después del primer despliegue, entre a `https://<dominio>/admin` y ejecute una
vez cada ingesta. Para cargar el histórico completo de la TRM (necesario para
convertir los precios internacionales antiguos a pesos), use la API:

```bash
curl -X POST "https://<dominio>/api/admin/ingesta/trm?desde=1990-01-01" -H "Authorization: Bearer <token>"
```

## 4. Actualizar a una versión nueva

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm api npm run migration:run:prod
```

Los usuarios verán el aviso "Hay una nueva versión · Toca para actualizar" la
próxima vez que abran la app.

## 5. Respaldos

- El contenedor `respaldo` genera cada día a las 2:00 a. m. (hora de Bogotá)
  `./respaldos/agroprecios-AAAAMMDD-HHMM.dump` y borra los de más de
  `RESPALDO_DIAS_RETENCION` días (14 por defecto).
- **Copie los respaldos fuera del servidor** (otro equipo o almacenamiento en la
  nube). Un respaldo que solo vive en el mismo servidor no protege contra la
  pérdida del servidor.
- Respaldo manual inmediato:

  ```bash
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec respaldo \
    sh -c 'pg_dump --format=custom --no-owner --file=/respaldos/manual-$(date +%Y%m%d-%H%M).dump'
  ```

- Restaurar (¡reemplaza los datos actuales!):

  ```bash
  docker compose -f docker-compose.prod.yml --env-file .env.prod stop api
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec respaldo \
    sh -c 'pg_restore --clean --if-exists --no-owner -d "$PGDATABASE" /respaldos/<archivo>.dump'
  docker compose -f docker-compose.prod.yml --env-file .env.prod start api
  ```

- **Pruebe una restauración** al menos una vez antes de depender de los respaldos.

## 6. Monitoreo

- `GET /api/salud` responde 200 si la API y la base de datos funcionan (503 si
  la base no responde) e incluye el estado de cada fuente (`AL_DIA`,
  `ATRASADA`, `ERROR`, `SIN_DATOS`). Sirve para un monitor externo gratuito
  (UptimeRobot, Better Stack, etc.).
- La página pública **Fuentes** y el panel `/admin` muestran la última
  actualización de cada fuente y la bitácora de ingestas.
- Registros: `docker compose -f docker-compose.prod.yml logs -f api`.

## 7. Seguridad

- `.env.prod` nunca se sube al repositorio (está en `.gitignore`) y nunca entra
  en una imagen (está en `.dockerignore`).
- La API corre como usuario `node` (sin privilegios), con helmet, límite de
  peticiones por IP (`TRUST_PROXY=1` para ver la IP real detrás de Caddy) y CORS
  restringido al dominio.
- La PWA se sirve con CSP estricta (`script-src 'self'`). Si se agrega una
  librería que necesite otro origen, hay que ajustarla en el `Caddyfile`.
- El panel `/admin` no aparece en la navegación; toda la protección está en la
  API (JWT de 15 minutos, 5 intentos de acceso por minuto).
- Mantenga el servidor actualizado (`unattended-upgrades` en Ubuntu) y use
  acceso SSH solo con llave.
