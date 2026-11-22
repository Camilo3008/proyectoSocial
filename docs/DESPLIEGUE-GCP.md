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
| Protección de datos | Copias / instantáneas | **Ninguna** (las instantáneas cuestan; los respaldos van a Drive, §8) |
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

### 4.4 Usuario de despliegue

Un usuario dedicado, sin contraseña, que solo entra con llave SSH. GitHub
Actions lo usa para publicar.

```bash
sudo adduser --disabled-password --gecos "" despliegue
sudo usermod -aG docker despliegue
sudo -iu despliegue mkdir -p /home/despliegue/.ssh /home/despliegue/agroprecios
sudo chmod 700 /home/despliegue/.ssh
```

> Pertenecer al grupo `docker` equivale en la práctica a ser administrador de la
> VM. Por eso la llave de este usuario solo se guarda en los secretos de GitHub
> (§6) y en ningún otro lado.

En **su PC** (PowerShell o Git Bash), genere una llave **exclusiva** para GitHub
Actions:

```bash
ssh-keygen -t ed25519 -C "github-actions-agroprecios" -f agroprecios-actions -N ""
# Crea dos archivos: agroprecios-actions (privada) y agroprecios-actions.pub (pública)
```

Copie el contenido de `agroprecios-actions.pub` y agréguelo en la VM:

```bash
echo 'ssh-ed25519 AAAA...pegar-aqui... github-actions-agroprecios' \
  | sudo tee /home/despliegue/.ssh/authorized_keys
sudo chmod 600 /home/despliegue/.ssh/authorized_keys
sudo chown -R despliegue:despliegue /home/despliegue/.ssh
```

Obtenga la **llave de host** de la VM, que se usa para el secreto
`VM_KNOWN_HOSTS` y evita conectarse a un servidor falso:

```bash
IP=$(curl -s -H "Metadata-Flavor: Google" \n  http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)
echo "$IP $(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)"
# Resultado: 34.x.x.x ssh-ed25519 AAAA...   ← copiar esta línea completa
```

Las imágenes de Ubuntu de Google ya traen el acceso por contraseña desactivado.
No lo active.

## 5. Dominio gratuito (DuckDNS) y variables de producción

### 5.1 DuckDNS

1. Entre a https://www.duckdns.org e inicie sesión (por ejemplo, con GitHub).
2. Cree el subdominio, por ejemplo `agroprecios` → `agroprecios.duckdns.org`.
3. En **current ip** escriba la IP estática de la VM → **update ip**.
4. Compruebe desde su PC: `nslookup agroprecios.duckdns.org` debe devolver esa IP.

Con IP estática no hace falta un actualizador automático.

### 5.2 `.env.prod` (solo en la VM; nunca en git)

En la consola SSH de la VM:

```bash
sudo -iu despliegue
cd ~/agroprecios
nano .env.prod
```

Pegue el contenido de `.env.prod.example` (está en el repositorio) y cambie
como mínimo:

```dotenv
DOMINIO=agroprecios.duckdns.org
CORS_ORIGIN=https://agroprecios.duckdns.org
ACME_EMAIL=<correo-que-se-revise>
DB_PASSWORD=<aleatoria>
ADMIN_EMAIL=<correo-del-administrador>
ADMIN_PASSWORD=<aleatoria, mínimo 12 caracteres>
JWT_SECRET=<aleatoria, mínimo 32 caracteres>
```

Para generar cada valor aleatorio:

```bash
openssl rand -base64 36 | tr -d '/+='
```

Guarde (`Ctrl+O`, `Enter`, `Ctrl+X`) y protéjalo:

```bash
chmod 600 .env.prod
exit
```

Guarde `ADMIN_PASSWORD` en un gestor de contraseñas: es la clave del panel
`/admin`.

## 6. Conectar GitHub con la VM

En GitHub: **repositorio → Settings → Secrets and variables → Actions → New
repository secret**. Cree estos cuatro:

| Secreto | Valor |
|---|---|
| `VM_HOST` | La IP estática de la VM |
| `VM_USER` | `despliegue` |
| `VM_SSH_KEY` | El contenido **completo** del archivo `agroprecios-actions` (la llave privada, incluidas las líneas `-----BEGIN…` y `-----END…`) |
| `VM_KNOWN_HOSTS` | La línea `34.x.x.x ssh-ed25519 AAAA...` del §4.4 |

Después, **borre la llave privada de su PC** (`agroprecios-actions`): ya vive
solo en GitHub. Si algún día hace falta otra, genere una nueva y reemplace el
secreto y `authorized_keys`.

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
curl -I https://agroprecios.duckdns.org/            # 200 y certificado válido
curl https://agroprecios.duckdns.org/api/salud      # "estado":"ok"
```

Luego:
1. Entre a `https://agroprecios.duckdns.org/admin` con `ADMIN_EMAIL` y
   `ADMIN_PASSWORD`, ejecute cada ingesta y haga la carga histórica (TRM desde
   1990 y SIPSA desde 2020; ver `docs/DESPLIEGUE.md` §3). La carga histórica de
   SIPSA es la operación más pesada: ejecútela **sola** y verifique la memoria
   (§10).
2. En un celular Android con Chrome: abra la dirección, **instale la app**,
   active el modo avión y confirme que muestra los últimos datos.

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

Para todo lo que sigue, entre por **SSH** (botón de la consola) y cambie al
usuario de despliegue:

```bash
sudo -iu despliegue
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

### 9.4 Copia de los respaldos a Google Drive

Google AI Pro incluye 2 TB de Drive. Use una carpeta dedicada.

```bash
# Como su usuario normal (no despliegue):
sudo apt -y install rclone
rclone config
#  n (nuevo) → nombre: gdrive → tipo: drive → scope: drive.file
#  "Use web browser to automatically authenticate?" → n
#  En SU PC (con rclone instalado) ejecute: rclone authorize "drive"
#  y pegue en la VM el token que le devuelve.

(crontab -l 2>/dev/null; echo '0 3 * * * rclone copy /home/despliegue/agroprecios/respaldos gdrive:agroprecios-respaldos --max-age 72h >> ~/rclone.log 2>&1') | crontab -
```

El respaldo contiene el correo del administrador y el hash de su clave. Guárdelo
en una carpeta privada de Drive y no la comparta.

**Pruebe una restauración** completa al menos una vez.

### 9.5 Monitoreo

Cree un monitor HTTP gratuito en **UptimeRobot** sobre
`https://agroprecios.duckdns.org/api/salud`, con aviso por correo.

## 10. Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Google rechaza la tarjeta débito | El banco no permite compras internacionales o pagos recurrentes | Pedir al banco que active ambas cosas e intentarlo de nuevo |
| El workflow falla en "Configurar SSH" | Secreto mal copiado, llave pública ausente o `VM_KNOWN_HOSTS` no coincide | Revisar §4.4 y §6. Si recreó la VM, la llave de host cambió |
| Falla en "Aplicar la versión": falta `.env.prod` | No se creó en `/home/despliegue/agroprecios` | §5.2 |
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
