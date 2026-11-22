# Demo en red local (intranet)

> Cómo correr AgroPrecios en un portátil o PC y abrirlo desde otros equipos y
> celulares **conectados a la misma red** (Wi-Fi o cable), sin internet público,
> sin dominio y sin servidor en la nube. Sirve para la entrega y las
> presentaciones. Probado el 2026-11-22 en Windows 11 con Docker Desktop.

## Qué funciona y qué no

| Función | En el portátil (`http://localhost`) | Desde otro equipo (`http://<IP>`) |
|---|---|---|
| Todas las pantallas, gráficas y globo | ✅ | ✅ |
| Panel `/admin` e ingestas manuales | ✅ | ✅ |
| Instalar como app y modo sin conexión | ✅ (`localhost` cuenta como origen seguro) | ❌ Requiere HTTPS, que en una red local exige dominio y certificado |

Para mostrar el modo sin conexión, hágalo **en el portátil**: abra
`http://localhost`, instale la app, desconecte el Wi-Fi y recargue.

## 1. Requisitos (una sola vez)

- **Docker Desktop** instalado y abierto.
- El repositorio clonado.
- El archivo **`.env.lan`** en la raíz del repositorio. Es local y nunca se sube
  (`.gitignore`). Créelo a partir de `.env.prod.example` con estos cambios:

  ```dotenv
  ARCHIVO_ENV=.env.lan
  DOMINIO=:80
  ACME_EMAIL=demo@example.com
  CORS_ORIGIN=http://localhost,http://<IP-del-portatil>
  # DB_PASSWORD, ADMIN_PASSWORD y JWT_SECRET: valores aleatorios
  ```

  `DOMINIO=:80` hace que Caddy sirva por HTTP en cualquier IP, sin certificado.

## 2. Saber la IP del portátil

```powershell
ipconfig
```

Busque la **Dirección IPv4** del adaptador Wi-Fi o Ethernet, por ejemplo
`192.168.1.101`. Ignore las que empiezan por `172.` (son de Docker o WSL).

**La IP cambia según la red.** En el lugar de la entrega, vuelva a mirarla y,
si es distinta, actualice `CORS_ORIGIN` en `.env.lan` y reinicie (§3).

## 3. Levantar la app

Desde la raíz del repositorio (PowerShell o Git Bash):

```bash
docker compose -p agroprecios-lan -f docker-compose.prod.yml --env-file .env.lan up -d --build db api web
docker compose -p agroprecios-lan -f docker-compose.prod.yml --env-file .env.lan run --rm api npm run migration:run:prod
docker compose -p agroprecios-lan -f docker-compose.prod.yml --env-file .env.lan run --rm api npm run seed:prod
```

Abra `http://localhost` en el portátil y `http://<IP>` en el celular.

Los contenedores se reinician solos cuando se abre Docker Desktop. En los días
siguientes basta con abrir Docker Desktop y esperar un minuto.

## 4. Cargar datos

**Opción A: copiar la base de desarrollo**, la forma más rápida si ya tiene
datos en `docker compose up -d db`:

```bash
# 1. Volcar la base de desarrollo
docker exec agroprecios-db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' > dev.dump
# 2. Restaurarla en la demo (reemplaza lo que haya)
docker compose -p agroprecios-lan -f docker-compose.prod.yml --env-file .env.lan stop api
docker compose -p agroprecios-lan -f docker-compose.prod.yml --env-file .env.lan exec -T db sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < dev.dump
docker compose -p agroprecios-lan -f docker-compose.prod.yml --env-file .env.lan start api
```

Al copiar la base también se copia el **usuario administrador de desarrollo**:
para entrar a `/admin` use el `ADMIN_EMAIL` y el `ADMIN_PASSWORD` de su `.env`,
no los de `.env.lan`. Borre `dev.dump` cuando termine.

**Opción B: ingestas desde cero**, que necesita internet: entre a
`http://localhost/admin` y ejecute cada ingesta. SIPSA descarga unos 316 MB y
tarda varios minutos.

## 5. Si el celular no abre la página

| Causa | Qué hacer |
|---|---|
| El firewall de Windows bloquea el puerto 80 | PowerShell **como administrador**: `New-NetFirewallRule -DisplayName "AgroPrecios demo" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Private` |
| La red de Windows está como "Pública" | Configuración → Red e Internet → Wi-Fi → (la red) → **Red privada** |
| Red de invitados, de universidad o con "aislamiento de clientes" | Esas redes no dejan que los equipos se vean entre sí. Use el **hotspot del celular** o un router propio y conecte allí el portátil y los demás equipos |
| El puerto 80 está ocupado | `netstat -ano \| findstr :80`; cierre el programa que lo usa (IIS, Skype antiguo, otro servidor) |
| La IP cambió | §2 |

**Plan seguro para la entrega:** comparta internet desde su celular (hotspot),
conecte el portátil y los equipos del público a esa red y use la IP que muestre
`ipconfig`. Así no depende de la red del lugar.

## 6. Apagar

```bash
docker compose -p agroprecios-lan -f docker-compose.prod.yml --env-file .env.lan down
```

Los datos se conservan en el volumen `agroprecios-lan_db_data`. Si agrega `-v`
al comando, se **borran**.
