# Despliegue en Google Cloud (e2-micro) con despliegue automático desde GitHub

> Guía para publicar AgroPrecios en una VM `e2-micro` de Google Cloud, pagada
> con los **créditos mensuales de Google Cloud que incluye Google AI Pro**, y un
> subdominio gratuito de DuckDNS con HTTPS. Cada cambio que llegue a la rama
> `main` se publica solo, después de pasar el CI.
>
> **Estado:** guía preparada el 2026-11-22. Los archivos (workflow, script y
> Compose) están revisados, pero **todavía no se han ejecutado contra una VM
> real**. Los precios y límites de Google cambian: confírmelos en la consola.
> `docs/DESPLIEGUE.md` sigue siendo la referencia para respaldos, restauración
> y seguridad; `docs/DESPLIEGUE-ORACLE.md` queda como alternativa.

## 0. Resumen

```
 Su PC ──git push──► GitHub ──► CI (lint, tests, build)
                                  │ si pasa y es main
                                  ▼
                       workflow "Desplegar": construye las imágenes Docker
                                  │ SSH (imágenes + docker-compose.prod.yml)
                                  ▼
             VM e2-micro (us-east1) ── Caddy (HTTPS) ── API ── PostgreSQL
                                  ▲
         https://agroprecios.duckdns.org (campesinos, PWA offline)
```

### Costos

| Concepto | Costo de referencia | Lo cubre |
|---|---|---|
| VM `e2-micro` en `us-west1`, `us-central1` o `us-east1` | $0 (capa gratuita) | Capa *Always Free* |
| Disco **estándar** de 30 GB | $0 | Capa *Always Free* (el disco *balanced* que propone la consola **no** es gratis) |
| IP pública IPv4 | ≈ USD 3,65/mes | Créditos de Google AI Pro (USD 10/mes) |
| Tráfico de salida por encima de 1 GB/mes | ≈ USD 0,12/GB | Créditos de Google AI Pro |
| Tráfico de entrada (descargas de las ingestas) | $0 | — |
| GitHub Actions | $0 (repositorio público, o hasta 2.000 min/mes si es privado) | Plan gratuito de GitHub |
| DuckDNS y certificado HTTPS | $0 | — |

Las cifras de la IP y del tráfico son de guías de terceros de 2026, no de la
página oficial de Google. Con la alerta de presupuesto (§2.3) usted se entera
si algo empieza a costar más de lo que cubren los créditos.

### Por qué 1 GB de RAM alcanza

- Las ingestas grandes (SIPSA ~316 MB y FAOSTAT ~214 MB) se procesan en
  **streaming**: el código nunca carga el archivo completo en memoria.
- Se agregan **2 GB de swap** como colchón (§4.2).
- Las imágenes **se construyen en GitHub**, no en la VM: compilar Angular con
  1 GB fallaría.

## 1. Lo que necesita antes de empezar

- [ ] **Google AI Pro** activo en la cuenta de Google que va a usar.
- [ ] **Tarjeta débito Visa o Mastercard** habilitada por el banco para
      **compras internacionales por internet y pagos recurrentes**. Google la
      exige para la cuenta de facturación aunque los créditos cubran el gasto.
      Si la rechaza, llame al banco y pida activar esas dos opciones.
- [ ] El repositorio en **GitHub** (`origin` ya apunta a
      `github.com/Camilo3008/proyectoSocial`) y permisos de administrador sobre él.
- [ ] En su PC: Git, y `ssh`/`ssh-keygen` (vienen en Windows 11; se usan desde
      PowerShell o Git Bash).

## 2. Cuenta de Google Cloud, créditos y presupuesto

### 2.1 Facturación

1. Entre a https://console.cloud.google.com con la cuenta de Google AI Pro.
2. **Facturación → Crear cuenta de facturación**: país Colombia, moneda COP,
   tarjeta débito. Si es una cuenta nueva, Google suele ofrecer además una
   prueba con créditos: aceptarla no cuesta nada.
3. **Crear proyecto** llamado `agroprecios` y vincularlo a esa cuenta de
   facturación.

### 2.2 Activar los créditos de Google AI Pro

Google AI Pro incluye **USD 10 al mes en créditos de Google Cloud** a través del
*Google Developer Program*:

1. Entre a https://developers.google.com/profile con la misma cuenta y cree el
   perfil de desarrollador si no lo tiene.
2. En la sección de beneficios, **vincule Google AI Pro** y reclame los
   créditos de Google Cloud, eligiendo la cuenta de facturación del paso 2.1.
   Según reportes de noviembre de 2026, también se pueden reclamar desde Google
   AI Studio. Siga lo que muestre la pantalla, porque Google cambia este flujo.
3. Compruebe en **Facturación → Créditos** que aparece el crédito.

Hay que tener en cuenta que:
- los créditos llegan **cada mes**, en el aniversario de la activación, y cada
  abono **vence al año**;
- si se cancela Google AI Pro, se dejan de recibir. La VM y el disco siguen
  siendo gratis, pero la IP (≈ USD 3,65/mes) se cobraría a la tarjeta.

### 2.3 Alerta de presupuesto (obligatoria)

**Facturación → Presupuestos y alertas → Crear presupuesto:**

| Campo | Valor |
|---|---|
| Alcance | Proyecto `agroprecios` |
| Créditos | **Marcar** "descuentos" y "promociones y otros créditos", para que el presupuesto mida lo que pagaría **después** de los créditos |
| Importe | Equivalente a USD 1 |
| Umbrales | 50 %, 90 % y 100 %, con aviso por correo |

Si llega un aviso, revise en **Facturación → Informes** qué está costando.

## 3. Crear la VM

**Compute Engine → Instancias de VM** (la primera vez pide habilitar la API) →
**Crear instancia**:

| Sección | Campo | Valor |
|---|---|---|
| Configuración de la máquina | Nombre | `agroprecios` |
| | Región / zona | **`us-east1`** (Carolina del Sur, la más cercana a Colombia de las tres gratuitas), cualquier zona |
| | Serie / tipo | **E2 → `e2-micro`** |
| SO y almacenamiento | Imagen | **Ubuntu 24.04 LTS** (x86/64; **no** la variante *Minimal* ni Arm) |
| | Tipo de disco | **Disco persistente estándar** (cambiarlo: por defecto propone *balanced*) |
| | Tamaño | **30 GB** |
| Protección de datos | Copias / instantáneas | **Ninguna** (las instantáneas cuestan; los respaldos van a Drive, §12.3) |
| Herramientas de redes | Firewall | Marcar **Permitir tráfico HTTP** y **Permitir tráfico HTTPS** |
| | Interfaz de red → IPv4 externa | **Reservar dirección IP estática** con el nombre `agroprecios-ip` |
| Observabilidad | Ops Agent | **Desmarcado** (consume RAM) |

**Crear.** Anote la **IP externa**.

La IP estática es importante: en Google Cloud, una IP efímera **cambia** al
detener y arrancar la VM, y el dominio dejaría de funcionar. Una IP estática en
uso cuesta lo mismo que una efímera. Si alguna vez borra la VM, **libere
también la IP**, porque una IP reservada sin usar cuesta más.

## 4. Preparar la VM

Abra la consola con el botón **SSH** de la instancia (se abre en el navegador).

### 4.1 Actualizaciones y zona horaria

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades     # responder "Sí"
sudo timedatectl set-timezone America/Bogota
```

### 4.2 Swap de 2 GB

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl --system
free -h      # debe mostrar Swap: 2.0Gi
```

### 4.3 Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
docker --version && docker compose version
```

### 4.4 Acceso para GitHub Actions (con su propio usuario)

Para salir rápido, GitHub Actions entra con **el mismo usuario que usa la
consola SSH del navegador**. El usuario dedicado `despliegue` queda para después
(§12.2).

En la consola SSH de la VM:

```bash
whoami                                  # anote este nombre: será el secreto VM_USER (§6)
sudo usermod -aG docker "$USER"         # permite usar docker sin sudo
mkdir -p ~/agroprecios ~/.ssh && chmod 700 ~/.ssh
```

Cierre la ventana SSH y abra otra para que el grupo `docker` tome efecto.
Compruebe con `docker ps`: no debe pedir `sudo`.

En **su PC** (PowerShell o Git Bash), genere una llave **exclusiva** para GitHub
Actions:

```bash
ssh-keygen -t ed25519 -C "github-actions-agroprecios" -f agroprecios-actions -N ""
# Crea dos archivos: agroprecios-actions (privada) y agroprecios-actions.pub (pública)
```

Copie el contenido de `agroprecios-actions.pub` y **agréguelo** en la VM. Use
`>>` y no `>`: el archivo ya tiene la llave de la consola del navegador y no hay
que borrarla.

```bash
echo 'ssh-ed25519 AAAA...pegar-aqui... github-actions-agroprecios' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

De nuevo **en la consola SSH de la VM** (no en su PC), obtenga la **llave de
host** de la VM, que se usa para el secreto `VM_KNOWN_HOSTS` y evita conectarse
a un servidor falso. Pegue las tres líneas juntas:

```bash
IP=$(curl -s -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)
echo "$IP $(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)"
# Resultado: 34.x.x.x ssh-ed25519 AAAA...   ← copiar esta línea completa
```

> **Riesgo asumido:** su usuario tiene `sudo` sin contraseña, así que la llave
> que guarda en GitHub da control total de la VM. Por eso esa llave solo vive en
> los secretos de GitHub (§6) y se borra de su PC. El usuario dedicado (§12.2)
> no elimina este riesgo del todo (pertenecer a `docker` también equivale a ser
> administrador), pero lo separa de su cuenta personal.

Las imágenes de Ubuntu de Google ya traen el acceso por contraseña desactivado.
No lo active.

## 5. Variables de producción (`.env.prod`, solo en la VM; nunca en git)

Se arranca **sin dominio**: la app se sirve por la IP de la VM con HTTP. El
dominio con HTTPS se agrega después sin volver a desplegar (§12.1).

Todo se hace en la consola SSH de la VM.

**Paso 1 — Generar las tres claves** (antes de abrir el editor, porque dentro
del editor no se pueden ejecutar comandos):

```bash
for n in DB_PASSWORD ADMIN_PASSWORD JWT_SECRET; do
  echo "$n=$(openssl rand -base64 36 | tr -d '/+=')"
done
```

Salen tres líneas listas para copiar, cada una con unos 48 caracteres al azar
(cumplen los mínimos de 12 y 32). Por ejemplo, inventado:
`ADMIN_PASSWORD=q7Hn2kLx9TzR4wVb...`. Copie la de `ADMIN_PASSWORD` en su
gestor de contraseñas **ya mismo**: es la clave para entrar a `/admin`.

**Paso 2 — Crear el archivo:**

```bash
cd ~/agroprecios
nano .env.prod
```

Pegue el contenido completo de `.env.prod.example` (está en el repositorio;
clic derecho pega en la consola del navegador) y cambie estas líneas:

```dotenv
DOMINIO=:80
CORS_ORIGIN=http://<IP-estatica>
ACME_EMAIL=<su correo>
DB_PASSWORD=<la del paso 1>
ADMIN_EMAIL=<su correo>
ADMIN_PASSWORD=<la del paso 1>
JWT_SECRET=<la del paso 1>
```

`ACME_EMAIL` todavía no se usa sin dominio, pero tiene que tener un valor.
Las demás líneas de la plantilla se dejan como vienen.

**Paso 3 — Guardar y salir de nano:** `Ctrl+O`, `Enter` (confirma el nombre),
`Ctrl+X`. Para revisar que quedó bien: `cat .env.prod`.

Sin HTTPS funcionan todas las pantallas y el panel `/admin`. Lo que **no**
funciona es instalarla como app ni el modo sin conexión; eso llega con §12.1.

## 6. Conectar GitHub con la VM

En GitHub: **repositorio → Settings → Secrets and variables → Actions → New
repository secret**. Cree estos cuatro:

| Secreto | Valor |
|---|---|
| `VM_HOST` | La IP estática de la VM |
| `VM_USER` | El nombre que mostró `whoami` en §4.4 |
| `VM_SSH_KEY` | El contenido **completo** del archivo `agroprecios-actions` (la llave privada, incluidas las líneas `-----BEGIN…` y `-----END…`) |
| `VM_KNOWN_HOSTS` | La línea `34.x.x.x ssh-ed25519 AAAA...` del §4.4 |

Después, **borre la llave privada de su PC** (`agroprecios-actions`): ya vive
solo en GitHub. Si algún día hace falta otra, genere una nueva y reemplace el
secreto y la línea en `authorized_keys`.

> El puerto 22 (SSH) de la VM queda abierto a internet porque GitHub Actions
> usa IPs variables. Es aceptable porque solo se entra con llave y no hay
> contraseñas. No abra otros puertos aparte del 80 y el 443.

## 7. Primer despliegue

### 7.1 Llevar el código a `main`

El despliegue se dispara con cambios en `main`. Hoy `main` sigue en la Etapa 0
y el trabajo está en ramas apiladas (`docs/PENDIENTES.md`, punto 1.6). Antes del
primer despliegue hay que integrarlas. Lo más simple, ya que cada rama contiene
a la anterior, es fusionar la última en `main`:

```bash
# Primero haga commit de los cambios pendientes de la rama (git status debe quedar limpio)
git checkout main
git merge --ff-only feat/rediseno-ux      # o la rama más reciente que quiera publicar
git push origin main
```

Si `--ff-only` falla, es que `main` tiene commits que no están en la rama.
Revíselo antes de forzar nada.

### 7.2 Ver el despliegue

1. En GitHub → **Actions**: primero corre **CI**. Si pasa, arranca
   **Desplegar**. El primer despliegue tarda unos 10 a 15 minutos.
2. Si quiere desplegar sin esperar un push: **Actions → Desplegar → Run
   workflow** (rama `main`).
3. El paso "Aplicar la versión" muestra las migraciones, las semillas y la
   verificación de `/api/salud`.

### 7.3 Comprobar

```bash
curl -I http://<IP-estatica>/             # 200
curl http://<IP-estatica>/api/salud       # "estado":"ok"
```

Luego entre a `http://<IP-estatica>/admin` con `ADMIN_EMAIL` y
`ADMIN_PASSWORD`, ejecute cada ingesta y haga la carga histórica (TRM desde
1990 y SIPSA desde 2020; ver `docs/DESPLIEGUE.md` §3). La carga histórica de
SIPSA es la operación más pesada: ejecútela **sola** y verifique la memoria
(§10).

**Con esto la app ya está publicada.** Lo que sigue (§8 a §11) es el trabajo
diario y la operación; §12 reúne las mejoras que se dejaron para después.

## 8. Trabajar día a día: cambios desde git

### 8.1 Flujo recomendado

```bash
git checkout main && git pull
git checkout -b feat/mi-cambio
# ... editar, probar en local (npm run start -w apps/web, etc.) ...
git commit -m "feat(web): describe el cambio"
git push -u origin feat/mi-cambio
```

1. En GitHub, abra un **Pull Request** hacia `main`. El CI corre lint, tests y
   build, pero **no despliega**.
2. Cuando el CI esté en verde, haga **merge**. El CI corre de nuevo sobre
   `main` y, si pasa, **Desplegar publica solo**.
3. Los usuarios verán "Hay una nueva versión · Toca para actualizar" al abrir la
   app.

También puede hacer `git push` directo a `main`: se despliega igual, pero sin
revisión previa.

### 8.2 Qué pasa en cada despliegue

`scripts/desplegar-remoto.sh` hace, en orden:

1. **Respaldo** de la base: `respaldos/agroprecios-predespliegue-<fecha>.dump`.
   Si falla, el despliegue se detiene sin tocar nada.
2. Guarda la versión actual como **`anterior`**.
3. Corre las **migraciones** pendientes y las **semillas** (idempotentes).
4. Arranca la versión nueva y verifica `/api/salud` durante unos 2 minutos.
5. Si la verificación falla, **vuelve sola a la versión anterior** y el workflow
   queda en rojo.

### 8.3 Cambios en la base de datos

Genere la migración en su PC (`npm run migration:generate -w apps/api -- src/database/migrations/<Nombre>`),
revísela y súbala con el código. El despliegue la aplica sola.

Si la versión nueva falla, se revierte el código pero **no la migración**. Si
una migración dañó datos, restaure el respaldo `predespliegue` (§9.3).

### 8.4 Cambios que NO se despliegan solos

| Cambio | Qué hacer |
|---|---|
| Variables de `.env.prod` | Editarlas en la VM y ejecutar `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d` en `~/agroprecios` |
| `.env.prod.example` | Es solo la plantilla: copie a mano a la VM las variables nuevas |
| Secretos de GitHub | Settings → Secrets |

## 9. Operación

Para todo lo que sigue, entre por **SSH** (botón de la consola):

```bash
cd ~/agroprecios
alias dc='docker compose -f docker-compose.prod.yml --env-file .env.prod'
```

### 9.1 Ver estado y registros

```bash
dc ps                  # contenedores y salud
dc logs -f --tail 100 api
free -h && docker stats --no-stream
```

### 9.2 Volver a la versión anterior

```bash
sh ~/agroprecios/desplegar-remoto.sh --revertir
```

Solo guarda **una** versión anterior. Para volver más atrás, haga `git revert`
del commit problemático en `main` y deje que se despliegue.

### 9.3 Respaldos y restauración

- Respaldo diario a las 2:00 a. m. y respaldo antes de cada despliegue, en
  `~/agroprecios/respaldos`, con retención de 14 días.
- Para restaurar, siga `docs/DESPLIEGUE.md` §5.
- Mientras no configure la copia a Drive (§12.3), los respaldos **solo viven en
  la VM**: si se pierde el disco, se pierden. Descargue uno de vez en cuando
  (botón de engranaje de la consola SSH → *Descargar archivo*).

## 10. Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Google rechaza la tarjeta débito | El banco no permite compras internacionales o pagos recurrentes | Pedir al banco que active ambas cosas e intentarlo de nuevo |
| El workflow falla en "Configurar SSH" | Secreto mal copiado, `VM_USER` distinto de `whoami`, llave pública ausente o `VM_KNOWN_HOSTS` no coincide | Revisar §4.4 y §6. Si recreó la VM, la llave de host cambió |
| La llave de GitHub desaparece de `authorized_keys` | El agente de Google reescribió el archivo o el proyecto usa OS Login | Agregue la llave pública en **Compute Engine → VM → Editar → Claves SSH**, con el comentario igual a su `whoami` |
| "permission denied … docker.sock" | El usuario no quedó en el grupo `docker` | `sudo usermod -aG docker <usuario>` y volver a conectarse |
| Falla en "Aplicar la versión": falta `.env.prod` | No se creó en `~/agroprecios` del usuario de `VM_USER` | §5 |
| Caddy no obtiene el certificado | DuckDNS apunta a otra IP o falta la regla HTTP/HTTPS | `nslookup`; en la VM: *Editar → Firewall*; `dc logs web` |
| La API se reinicia durante una ingesta grande | Falta de memoria | `free -h`, `dmesg \| grep -i oom`. Ejecute las cargas históricas de a una; si persiste, ver §11 |
| Llega una alerta de presupuesto | Más tráfico de salida que el esperado, o los créditos vencieron o no se aplicaron | Facturación → Informes |
| Disco lleno | Imágenes viejas o respaldos acumulados | `docker system df`, `docker image prune -a` (las imágenes en uso no se borran), revisar `respaldos/` |

## 11. Si la e2-micro se queda corta

Con los USD 10 mensuales de créditos se puede subir a una **`e2-small`
(2 GB de RAM)**. Ya no está en la capa gratuita, y el costo de la VM más la IP
podría pasar de los USD 10: confírmelo antes en la
[calculadora de Google Cloud](https://cloud.google.com/products/calculator).
Para cambiarla: detener la VM → *Editar* → tipo de máquina → arrancar. Se
conservan la IP estática y los datos.

## 12. Mejoras para después

> Estos pasos **no son necesarios para publicar la app**. Se dejaron para
> después del primer despliegue y se pueden hacer en cualquier orden.

### 12.1 Dominio con HTTPS (habilita instalar la app y el modo offline)

Para los campesinos de Charguayaco esta es la mejora más importante: sin HTTPS
el navegador no activa el *service worker*, así que la app no se instala ni
funciona sin conexión.

**Opción A — DuckDNS:**

1. Entre a https://www.duckdns.org e inicie sesión (por ejemplo, con GitHub).
2. Cree el subdominio, por ejemplo `agroprecios` → `agroprecios.duckdns.org`.
3. En **current ip** escriba la IP estática de la VM → **update ip**.
4. Compruebe desde su PC: `nslookup agroprecios.duckdns.org` debe devolver esa IP.

Con IP estática no hace falta un actualizador automático.

**Opción B — sslip.io (sin registrarse en nada):** el servicio público
`sslip.io` convierte una IP en un nombre (`34.1.2.3` → `34-1-2-3.sslip.io`).
Caddy debería obtener el certificado de Let's Encrypt sin más pasos. No se ha
probado en este proyecto; si falla, use DuckDNS.

**Aplicar el dominio** (no requiere cambiar código ni volver a desplegar desde
GitHub). En `~/agroprecios/.env.prod` cambie:

```dotenv
DOMINIO=agroprecios.duckdns.org
CORS_ORIGIN=https://agroprecios.duckdns.org,http://<IP-estatica>
ACME_EMAIL=<correo-que-se-revise>
```

y ejecute:

```bash
cd ~/agroprecios && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
curl -I https://agroprecios.duckdns.org/     # 200 y certificado válido
```

Luego, en un celular Android con Chrome: abra la dirección, **instale la app**,
active el modo avión y confirme que muestra los últimos datos.

### 12.2 Usuario de despliegue dedicado

> Antes de esto, y en cualquier caso cuando la app tenga usuarios reales,
> proteja el archivo de claves para que solo su dueño pueda leerlo:
> `chmod 600 ~/agroprecios/.env.prod`.

Separa la llave de GitHub de su cuenta personal: un usuario sin contraseña, sin
`sudo`, que solo entra con llave SSH.

En la consola SSH de la VM:

```bash
sudo adduser --disabled-password --gecos "" despliegue
sudo usermod -aG docker despliegue
sudo -iu despliegue mkdir -p /home/despliegue/.ssh
sudo chmod 700 /home/despliegue/.ssh

# Copiar la llave pública de GitHub Actions (la línea "github-actions-agroprecios")
grep github-actions-agroprecios ~/.ssh/authorized_keys \
  | sudo tee /home/despliegue/.ssh/authorized_keys
sudo chmod 600 /home/despliegue/.ssh/authorized_keys
sudo chown -R despliegue:despliegue /home/despliegue/.ssh

# Mover la instalación (la base de datos vive en un volumen de Docker y no se toca)
cd ~/agroprecios && docker compose -f docker-compose.prod.yml --env-file .env.prod down
cd ~ && sudo mv ~/agroprecios /home/despliegue/agroprecios
sudo chown -R despliegue:despliegue /home/despliegue/agroprecios
sudo -iu despliegue sh -c 'cd ~/agroprecios && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d'

# Quitar la llave de GitHub de su usuario
sed -i '/github-actions-agroprecios/d' ~/.ssh/authorized_keys
```

En GitHub, cambie el secreto `VM_USER` a `despliegue` (`VM_HOST`, `VM_SSH_KEY`
y `VM_KNOWN_HOSTS` no cambian). Lance **Actions → Desplegar → Run workflow**
para comprobar.

Desde entonces, para operar (§9) entre primero con `sudo -iu despliegue`.

> Si el contenedor de respaldos no puede escribir en `respaldos/` después de
> mover la carpeta, revise el dueño con `ls -ln respaldos`.

### 12.3 Copia de los respaldos a Google Drive

Google AI Pro incluye 2 TB de Drive. Use una carpeta dedicada.

```bash
# Como su usuario normal:
sudo apt -y install rclone
rclone config
#  n (nuevo) → nombre: gdrive → tipo: drive → scope: drive.file
#  "Use web browser to automatically authenticate?" → n
#  En SU PC (con rclone instalado) ejecute: rclone authorize "drive"
#  y pegue en la VM el token que le devuelve.

# Si ya hizo §12.2, cambie la ruta por /home/despliegue/agroprecios/respaldos
(crontab -l 2>/dev/null; echo "0 3 * * * rclone copy $HOME/agroprecios/respaldos gdrive:agroprecios-respaldos --max-age 72h >> $HOME/rclone.log 2>&1") | crontab -
```

El respaldo contiene el correo del administrador y el hash de su clave. Guárdelo
en una carpeta privada de Drive y no la comparta.

**Pruebe una restauración** completa al menos una vez.

### 12.4 Monitoreo

Cree un monitor HTTP gratuito en **UptimeRobot** sobre `/api/salud` (con el
dominio de §12.1 o, mientras tanto, `http://<IP-estatica>/api/salud`), con aviso
por correo.
