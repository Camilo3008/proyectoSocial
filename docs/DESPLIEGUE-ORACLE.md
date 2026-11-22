# Despliegue gratuito: Oracle Cloud Always Free + DuckDNS

> **Alternativa, no es la opción elegida.** El 2026-11-22 se eligió Google
> Cloud (`docs/DESPLIEGUE-GCP.md`) porque Oracle exige tarjeta de crédito y
> Google acepta débito, además de los créditos de Google AI Pro. Esta guía se
> conserva por si cambia la situación.

> Guía para publicar AgroPrecios **sin costo**: una máquina virtual de la capa
> *Always Free* de Oracle Cloud (backend, frontend y base de datos con el mismo
> `docker-compose.prod.yml`) y un subdominio gratuito de DuckDNS con HTTPS de
> Let's Encrypt. Complementa a `docs/DESPLIEGUE.md`, que sigue siendo la
> referencia para actualizar, respaldar y monitorear.
>
> **Estado:** guía preparada el 2026-11-21 con información pública de Oracle y
> de terceros. **Todavía no se ha ejecutado en una cuenta real.** Las condiciones
> de las capas gratuitas cambian: confirme cada límite en la consola de Oracle
> antes de crear recursos.

## 0. ¿Funciona desde Colombia? (lo verificado)

| Pregunta | Respuesta | Fuente |
|---|---|---|
| ¿Hay región de Oracle en Colombia? | **Sí:** *Colombia Central (Bogotá)*, identificador `sa-bogota-1`, activa desde el 27 nov 2023, con un dominio de disponibilidad | Notas de versión y lista de regiones de Oracle |
| ¿La capa Always Free aplica allí? | Oracle dice que la capa gratuita está disponible en todas las regiones comerciales, aunque las regiones que ofrece el registro pueden variar | FAQ de Oracle Cloud Free Tier |
| ¿Cuánto da hoy la VM ARM gratuita? | Según fuentes de 2026, **2 OCPU y 12 GB de RAM** para cuentas nuevas (antes eran 4 OCPU y 24 GB). Es **de sobra** para AgroPrecios, que necesita unos 2 GB | Blogs técnicos de 2026 (confirmar en la consola) |
| ¿Qué tarjeta piden? | Crédito, o débito que funcione como crédito. **No sirven** las débito con PIN, las virtuales, las prepagadas ni las de un solo uso. Es solo verificación: no cobra si se queda en Always Free | FAQ de Oracle |
| ¿Hay problemas conocidos? | Un usuario reportó en el foro de Oracle que, eligiendo Colombia, no le aparecía la ventana de verificación del pago; con otra región sí funcionó. Es un caso aislado, no una regla | Foro de la comunidad Oracle |
| ¿El proyecto corre en ARM? | **Sí.** Las imágenes `node:24-alpine`, `postgres:17-alpine` y `caddy:2-alpine` son multiarquitectura, y la API no tiene módulos nativos (`bcryptjs` y `pg` son JavaScript puro) | Revisión del repositorio |
| ¿DuckDNS sirve para HTTPS? | Sí. Es un registro DNS `A` normal, y Caddy obtiene el certificado de Let's Encrypt con el reto HTTP (puerto 80) | — |

**Conclusión:** es viable, con un único punto que solo se resuelve intentándolo:
**que Oracle acepte la tarjeta en el registro.** Por eso el primer paso es la
cuenta (unos 15 minutos), antes de invertir tiempo en lo demás.

Fuentes:
- https://docs.oracle.com/iaas/releasenotes/changes/d332ad8f-ad0b-48f8-8577-33da7766ee36
- https://docs.cloud.oracle.com/iaas/Content/General/Concepts/regions.htm
- https://www.oracle.com/cloud/free/faq/
- https://community.oracle.com/customerconnect/discussion/824164/unable-to-create-a-oci-free-account-in-colombia-region
- https://terminalbytes.com/oracle-cloud-free-tier-changes-2026/

## 1. Lista de verificación antes de empezar

- [ ] Una **tarjeta de crédito** a nombre de quien abre la cuenta. Si es de la
      organización, confirme antes que la política interna lo permite.
- [ ] Un **correo** que se vaya a conservar: Oracle y Let's Encrypt envían
      avisos allí. Mejor un buzón del proyecto que uno personal.
- [ ] Una cuenta en **GitHub** (para el repositorio y para entrar a DuckDNS).
- [ ] Un PC con terminal y **SSH** (Windows 11 lo trae: `ssh` en PowerShell).

> Oracle prohíbe tener varias cuentas gratuitas por persona. Si el registro
> falla, no cree cuentas nuevas en serie: escriba al chat de soporte de ventas
> desde la página de registro.

## 2. Crear la cuenta de Oracle Cloud

1. Entre a https://www.oracle.com/cloud/free/ → **Start for free**.
2. Datos: país **Colombia**, nombre y correo.
3. **Home region (región principal):** elija **Colombia Central (Bogotá)**, que
   es la de menor latencia para Pitalito. **No se puede cambiar después**, y la
   VM gratuita solo se crea en la región principal.
   - Si la verificación de la tarjeta no aparece o falla con Bogotá, el plan B
     es una región cercana como **Brazil East (São Paulo)** o **Mexico Central
     (Querétaro)**. La app funciona igual; solo sube un poco la latencia.
4. Verifique la tarjeta. Puede aparecer una retención temporal pequeña que se
   reversa.
5. Espere el correo de cuenta lista. A veces tarda desde minutos hasta unas horas.

**Sobre la prueba de 30 días:** la cuenta trae créditos de prueba por 30 días.
Al terminar, todo lo que **no** sea Always Free se apaga y se borra. Por eso la
VM debe crearse **dentro de los límites Always Free desde el principio**
(sección 3).

## 3. Crear la máquina virtual

Consola → **Compute → Instances → Create instance**:

| Campo | Valor |
|---|---|
| Name | `agroprecios` |
| Image | **Canonical Ubuntu 24.04** (la variante *aarch64*, que se ofrece al elegir el shape ARM) |
| Shape | **Ampere → VM.Standard.A1.Flex**, con la etiqueta *Always Free-eligible* |
| OCPU / memoria | **1 OCPU y 6 GB** es suficiente. No pase del límite gratuito que muestre la consola (hoy reportado como 2 OCPU y 12 GB en total) |
| Networking | Crear una VCN nueva con subred **pública** y **Assign a public IPv4 address** |
| SSH keys | **Generate a key pair** y descargue la llave privada, o suba su llave pública |
| Boot volume | 50 GB (la capa gratuita incluye 200 GB de almacenamiento en bloque en total) |

- **"Out of capacity / Out of host capacity":** la región no tiene ARM libres en
  ese momento. Reintente en otro horario (de madrugada suele haber más) o pruebe
  otro *fault domain*. Es lo más común y no significa que la cuenta tenga un
  problema.
- Anote la **IP pública** de la instancia.

Conéctese desde su PC:

```bash
ssh -i ruta/a/llave-privada.key ubuntu@<IP_PUBLICA>
```

En Windows, si `ssh` se queja de los permisos de la llave, guárdela en
`C:\Users\<usuario>\.ssh\` y deje acceso solo para su usuario
(Propiedades → Seguridad).

### Instancias ociosas

Oracle puede **recuperar** VMs Always Free que pasan unos 7 días con uso muy bajo
de CPU, red y memoria (los umbrales están en la documentación de Always Free).
AgroPrecios tiene ingestas diarias y tráfico, pero si la app tiene pocos
usuarios, existe el riesgo. Hay dos formas de mitigarlo:

1. Pasar la cuenta a **Pay As You Go** (*Upgrade*). Los recursos Always Free
   siguen siendo gratis y la regla de recuperación por inactividad deja de
   aplicar. **Riesgo:** si se crea algo fuera de la capa gratuita, Oracle lo
   cobra. Si lo hace, cree antes un **presupuesto con alerta** de USD 1
   (*Billing → Budgets*).
2. Mantener la cuenta gratuita y vigilar el correo: Oracle avisa antes de
   detener la instancia, y los respaldos fuera del servidor (sección 8) permiten
   reconstruirla.

## 4. Abrir los puertos 80 y 443

Hay que abrirlos en **dos lugares**. Si falta uno, Caddy no obtiene el
certificado.

### 4.1 En Oracle (Security List de la VCN)

Consola → **Networking → Virtual Cloud Networks → (su VCN) → Subnets → subred
pública → Security List → Add Ingress Rules**:

| Source CIDR | Protocolo | Puerto destino |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |
| `0.0.0.0/0` | UDP | `443` (HTTP/3, opcional) |

El puerto 22 (SSH) ya viene abierto.

### 4.2 En el firewall de Ubuntu

Las imágenes de Ubuntu de Oracle traen reglas `iptables` que rechazan todo lo
que no sea SSH. Agregue las reglas **al principio** de la cadena y guárdelas:

```bash
sudo iptables -I INPUT -p tcp -m multiport --dports 80,443 -m conntrack --ctstate NEW -j ACCEPT
sudo iptables -I INPUT -p udp --dport 443 -m conntrack --ctstate NEW -j ACCEPT
sudo netfilter-persistent save
```

No use `ufw` en estas imágenes: convive mal con las reglas de Oracle y con las
de Docker.

## 5. Preparar el servidor

```bash
# Actualizaciones de seguridad automáticas
sudo apt update && sudo apt -y upgrade
sudo apt -y install unattended-upgrades git
sudo dpkg-reconfigure -plow unattended-upgrades

# Docker Engine + plugin Compose (script oficial de Docker)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
exit    # salir y volver a entrar por SSH para que aplique el grupo
```

Al volver a entrar, compruebe con `docker version` y `docker compose version`.

El acceso por SSH en Oracle ya es **solo con llave**. No active contraseñas.

## 6. Subdominio gratuito en DuckDNS

1. Entre a https://www.duckdns.org e inicie sesión (por ejemplo, con GitHub).
2. Cree el subdominio, por ejemplo `agroprecios` → `agroprecios.duckdns.org`.
3. En **current ip** escriba la IP pública de la VM → **update ip**.
4. Verifique desde su PC: `nslookup agroprecios.duckdns.org` debe devolver esa IP.

La IP pública de Oracle se mantiene mientras la instancia exista, aunque la
apague y la encienda; solo cambia si la instancia se termina. Aun así, para
actualizarla sola si algún día cambia, puede configurar esto en la VM:

```bash
mkdir -p ~/duckdns && cd ~/duckdns
# El token aparece en la página de DuckDNS. Es un secreto: no lo suba a git.
echo 'url="https://www.duckdns.org/update?domains=agroprecios&token=<TOKEN>&ip="' > duckdns.conf
chmod 600 duckdns.conf
(crontab -l 2>/dev/null; echo '*/30 * * * * curl -s -K ~/duckdns/duckdns.conf -o ~/duckdns/ultimo.log') | crontab -
```

## 7. Desplegar AgroPrecios

### 7.1 Código

Si el repositorio es privado, use una **deploy key de solo lectura**: genere la
llave en la VM y regístrela en GitHub → *Settings → Deploy keys*.

```bash
ssh-keygen -t ed25519 -C "agroprecios-vm" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub     # pegar en GitHub → Deploy keys (sin permiso de escritura)
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/github_deploy
EOF
git clone git@github.com:<usuario>/<repositorio>.git ~/agroprecios
cd ~/agroprecios
```

### 7.2 Variables

```bash
cp .env.prod.example .env.prod
chmod 600 .env.prod
nano .env.prod
```

Valores que cambian con DuckDNS:

```dotenv
DOMINIO=agroprecios.duckdns.org
CORS_ORIGIN=https://agroprecios.duckdns.org
ACME_EMAIL=<correo-del-proyecto>
```

Genere claves aleatorias para `DB_PASSWORD`, `ADMIN_PASSWORD` y `JWT_SECRET`:

```bash
openssl rand -base64 36 | tr -d '/+='    # ejecutar una vez por cada clave
```

### 7.3 Construir, migrar y sembrar

Siga la sección 3 de `docs/DESPLIEGUE.md`. En resumen:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm api npm run migration:run:prod
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm api npm run seed:prod
```

La primera construcción en ARM tarda varios minutos porque compila Angular
dentro del contenedor.

### 7.4 Verificar

```bash
curl -I https://agroprecios.duckdns.org/            # 200 y certificado válido
curl https://agroprecios.duckdns.org/api/salud      # estado "ok"
docker compose -f docker-compose.prod.yml logs web | grep -i certificate
```

Después:
1. Abra `https://agroprecios.duckdns.org/admin`, ejecute cada ingesta y haga la
   carga histórica (ver `docs/DESPLIEGUE.md` §3).
2. Desde un celular Android con Chrome, abra la dirección, **instale la app**,
   active el modo avión y confirme que sigue mostrando los últimos datos.

## 8. Respaldos fuera del servidor (Google Drive con rclone)

El contenedor `respaldo` deja un `pg_dump` diario en `~/agroprecios/respaldos`.
Para no perderlo si se pierde la VM, cópielo a Google Drive. Use una cuenta del
proyecto o de la organización, no una personal: el respaldo incluye el correo
del administrador y el hash de su clave.

```bash
sudo apt -y install rclone
rclone config
#  n (nuevo) → nombre: gdrive → tipo: drive → scope: drive.file
#  "Use web browser to automatically authenticate?" → n
#  Le pedirá ejecutar en SU PC (con rclone instalado): rclone authorize "drive"
#  y pegar el token que devuelve.

# Copia diaria a las 3:00 a. m. (el respaldo se genera a las 2:00 a. m.)
(crontab -l 2>/dev/null; echo '0 3 * * * rclone copy ~/agroprecios/respaldos gdrive:agroprecios-respaldos --max-age 72h >> ~/rclone.log 2>&1') | crontab -
```

La zona horaria de la VM es UTC por defecto. Para que el cron use la hora de
Colombia: `sudo timedatectl set-timezone America/Bogota`.

Después, **pruebe una restauración** completa con uno de los archivos copiados
(`docs/DESPLIEGUE.md` §5).

## 9. Monitoreo gratuito

Cree un monitor HTTP en **UptimeRobot** (plan gratuito) sobre
`https://agroprecios.duckdns.org/api/salud`, con aviso al correo del proyecto.
También avisa si el certificado no se renueva.

## 10. Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El registro no muestra la verificación de la tarjeta | Tarjeta débito, virtual o prepagada; problema con la región | Usar tarjeta de crédito; probar con otra región principal (São Paulo, Querétaro); chat de soporte de Oracle |
| "Out of host capacity" al crear la VM | No hay ARM libres en ese momento | Reintentar más tarde, en otro horario o con otro *fault domain* |
| Caddy no obtiene el certificado | Puerto 80 cerrado, o DuckDNS apunta a otra IP | Revisar §4.1 **y** §4.2, `nslookup`, `docker compose logs web` |
| El navegador no conecta, pero `curl http://localhost` en la VM sí | Firewall de Oracle o de Ubuntu | Revisar `sudo iptables -L INPUT -n --line-numbers`: las reglas de 80 y 443 deben estar **antes** del `REJECT` |
| Correo de Oracle: "instancia ociosa" | Política de recuperación de Always Free | Ver §3, "Instancias ociosas" |
| La VM desapareció al terminar los 30 días | Se creó por encima de los límites Always Free | Recrearla dentro de los límites y restaurar el respaldo |

## 11. Si Oracle no funciona: alternativa gratuita

**Google Cloud, capa gratuita:** una VM `e2-micro` (2 vCPU compartidas y **1 GB
de RAM**), solo en las regiones `us-west1`, `us-central1` y `us-east1`, con 30 GB
de disco. También pide tarjeta. El mismo `docker-compose.prod.yml` corre allí,
pero:

- Tiene **la mitad de la RAM** que pide `docs/DESPLIEGUE.md` §2. Habría que crear
  **2 GB de swap**, y aun así las ingestas grandes (SIPSA de ~316 MB y FAOSTAT
  de ~214 MB) podrían fallar por memoria.
- Conviene construir las imágenes en otro equipo, porque compilar Angular con
  1 GB es lento o falla.
- La latencia desde Colombia es mayor que con Bogotá.

Por eso es plan B y no plan A. Las demás opciones gratuitas (Render, Koyeb,
Neon, Supabase…) se descartaron: el servidor se duerme y los jobs de ingesta no
corren, la RAM es poca y separar la web de la API exige cambiar código (ver el
registro de decisiones en `docs/PROYECTO.md`).
