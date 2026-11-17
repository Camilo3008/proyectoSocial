# AgroPrecios: pendientes y puntos que requieren revisión

> Estado al 16 de noviembre de 2026, al cerrar las Etapas 0 a 6 de la Fase 1.
> Cada punto indica **quién** lo resuelve, la **prioridad** y **dónde** está el
> detalle. Prioridad: 🔴 bloquea la publicación · 🟠 antes o durante el piloto ·
> 🟡 mejora o revisión.
>
> Lo que está hecho y cómo funciona está en `docs/DOCUMENTACION.md`.

## 1. Decisiones y gestiones del equipo (no son de código)

| # | Pendiente | Prioridad | Responsable | Detalle |
|---|---|---|---|---|
| 1.1 | **Autorización escrita de la FNC** para publicar su precio interno de referencia (y, si es posible, leer el boletín de forma automática). Sus términos prohíben la extracción automatizada y restringen la publicación. Mientras no llegue, el precio se carga a mano y existe un riesgo legal al publicarlo en abierto | 🔴 | Equipo / UNAD | `docs/fuentes/fnc.md`, borrador en `docs/solicitudes/solicitud-autorizacion-fnc.md` |
| 1.2 | **Fuente nacional de pitaya y cacao.** No están en el servicio web de SIPSA ni (la pitaya) en FAOSTAT. Hoy el cacao muestra solo el precio internacional y la pitaya no aparece | 🟠 | Equipo | `docs/PROYECTO.md` §16, pregunta 9 |
| 1.3 | **Escribir al DANE** (contacto@dane.gov.co) para preguntar por una consulta SIPSA filtrada por fecha o producto. Cada ingesta descarga ~316 MB (aceptado solo para la demo) | 🟠 | Equipo | Pregunta 8; `docs/fuentes/sipsa.md` |
| 1.4 | **Servidor y dominio** (nombre definitivo del proyecto, pregunta 7). Hace falta un VPS de 2 GB de RAM como mínimo y un dominio con DNS apuntando a él | 🔴 | Equipo / UNAD | `docs/DESPLIEGUE.md` §2 |
| 1.5 | **Horarios de producción** de cada ingesta. Los actuales sirven para la demo; definirlos al desplegar (SIPSA es la más costosa) | 🟠 | Equipo | `.env.prod.example`, `docs/DOCUMENTACION.md` §3 |
| 1.6 | **Repositorio remoto y ramas.** El trabajo está en ramas locales apiladas (`feat/etapa-1-cafe` … `feat/etapa-6-despliegue`); `main` sigue en la Etapa 0 y **no se ha hecho push** (por instrucción). Hay que decidir cómo integrarlas (merge de `feat/etapa-6-despliegue` en `main` o PR por etapa) y publicar el repositorio | 🟠 | Equipo | `git log --oneline main..feat/etapa-6-despliegue` |
| 1.7 | **Licencia del código** (`"license": "UNLICENSED"`). Definir si será software libre (MIT, GPL…) o privado | 🟡 | Equipo / UNAD | `package.json` |
| 1.8 | **Consentimiento y tratamiento de datos** para la encuesta y la capacitación (Ley 1581 de 2012). La encuesta está diseñada anónima; si se recogen datos personales, usar el formato de autorización de la UNAD | 🟠 | Equipo / UNAD | `docs/ENCUESTA.md` |

## 2. Antes de publicar (operación)

| # | Pendiente | Prioridad | Detalle |
|---|---|---|---|
| 2.1 | Crear `.env.prod` con **secretos reales**: claves de base de datos y administrador, `JWT_SECRET` aleatorio, `ACME_EMAIL` y `DOMINIO`. Nunca subirlo | 🔴 | `.env.prod.example` |
| 2.2 | Primer despliegue: migraciones, semillas, **carga histórica** (TRM `?desde=1990-01-01`, SIPSA `?desde=2020-01-01`) y una ejecución de cada ingesta | 🔴 | `docs/DESPLIEGUE.md` §3 |
| 2.3 | **Copiar los respaldos fuera del servidor** y **probar una restauración**. El respaldo diario funciona (probado `pg_dump`/`pg_restore`), pero solo guarda en el mismo servidor | 🔴 | `docs/DESPLIEGUE.md` §5 |
| 2.4 | Configurar un **monitor externo** sobre `/api/salud` (por ejemplo UptimeRobot) | 🟠 | `docs/DESPLIEGUE.md` §6 |
| 2.5 | **Probar en celulares reales de la vereda** (Android de gama baja): instalar la PWA, modo avión (sin conexión), aviso "datos de hace X", aviso de versión nueva, globo o tabla según el equipo. En local no se pudo probar el service worker con HTTPS porque el certificado de prueba no es confiable; en producción, con certificado real, sí aplica | 🔴 | `docs/GUIA-USUARIO.md` |
| 2.6 | Ejecutar el **CI en GitHub** (nunca ha corrido porque no hay push). Considerar agregar al CI la construcción de las imágenes Docker | 🟠 | `.github/workflows/ci.yml` |

## 3. Revisión detallada de datos y contenido

| # | Punto a revisar | Prioridad | Detalle |
|---|---|---|---|
| 3.1 | **Mercado de referencia de "Hoy"** para plátano y banano: Neiva (Surabastos), luego Popayán y luego Bogotá. Validar con los productores si Neiva es la referencia útil para Pitalito | 🟠 | `apps/api/src/precios/referencias-hoy.ts` |
| 3.2 | **Textos de comparabilidad** (pergamino seco vs. café verde, mayorista vs. finca, precio al productor anual). Que los revise alguien del sector (comité de cafeteros o agrónomo) y validarlos con los usuarios | 🟠 | `apps/web/src/app/core/notas.ts`, `docs/PROYECTO.md` §7.1 |
| 3.3 | **Cacao en "Hoy" con precio internacional.** Confirmar con los usuarios que no se confunde con lo que pagan localmente | 🟠 | Decisión de la Etapa 3 en `docs/PROYECTO.md` §17 |
| 3.4 | **FAOSTAT, valores extremos y cobertura.** EE. UU. (≈ 56 USD/kg, café de Hawái) y España (≈ 50 USD/kg, Canarias) son datos oficiales pero dominan la escala; hay solo unos 15 a 35 países por producto y año. Decidir si se agrega una nota o se excluyen de la escala de colores. El año por defecto es el último con datos (2024), que tiene menos países que 2021-2022 | 🟡 | `apps/api/src/internacional/paises.service.ts`, `globo/escala.ts` |
| 3.5 | **Ficha de país con datos viejos** (p. ej. Ghana, último dato 2011). Se compara con Colombia en el mismo año, lo cual es correcto, pero puede convenir advertir "último dato: 2011" de forma más visible | 🟡 | `globo/paises.html` |
| 3.6 | **URL del Banco Mundial.** Cambia con cada edición del archivo; si la ingesta falla, actualizar `WORLDBANK_URL` (la bitácora lo advierte). Revisar cada mes | 🟠 | `docs/fuentes/worldbank.md` |
| 3.7 | **Continuidad del servicio SIPSA.** El DANE lo publicó en la emergencia sanitaria y no garantiza su continuidad; si desaparece, la fuente pasa a `ERROR` | 🟡 | `docs/fuentes/sipsa.md` |
| 3.8 | **Banderas de país.** Windows de escritorio no dibuja emojis de banderas y muestra las letras ("CO"); en Android sí se ven. Es aceptable; revisar si se prefieren imágenes | 🟡 | `globo/paises.ts` (`bandera`) |

## 4. Revisión técnica

| # | Punto a revisar | Prioridad | Detalle |
|---|---|---|---|
| 4.1 | **MapLibre 6 vs. 5.** Se actualizó a 6.18 por una vulnerabilidad crítica en ≤ 6.4 (GHSA-jrc7-96c5-q579, XSS en `DOM.sanitize`). El riesgo real aquí era bajo: no se usan popups ni HTML de atribución y el GeoJSON es propio. A cambio, el globo pesa ~395 kB gzip en vez de ~232 kB, una sola vez y solo en "Mundo". Confirmar la decisión | 🟡 | `docs/PROYECTO.md` §17 |
| 4.2 | **Auditoría de accesibilidad automatizada** (Lighthouse o axe) y prueba con lector de pantalla (TalkBack). Se cumplieron a mano los criterios de CLAUDE.md (letra de 16 px o más, botones de 48 px, contraste verificado, tablas alternativas, `prefers-reduced-motion`), pero no hay un reporte AA formal | 🟠 | — |
| 4.3 | **Rendimiento del globo en equipos de gama baja.** Detecta la falta de WebGL y cambia a la tabla, pero no se midió la fluidez en un celular real. Si es lento, considerar arrancar en "tabla" en equipos con poca memoria (`navigator.deviceMemory`) | 🟡 | `globo/globo.ts` |
| 4.4 | **Sesión del administrador:** el token dura 15 minutos y no se renueva solo (hay que volver a entrar). Hay un único usuario y no hay cambio de contraseña desde la web (la semilla solo crea el administrador si no existe; para cambiarla hay que actualizar el hash en la base de datos). Suficiente para la Fase 1 | 🟡 | `apps/api/src/auth/` |
| 4.5 | **Carga manual del valor:** "2.075.000" y "278,65" se normalizan, pero un "2.075" con un solo punto se toma como decimal. El panel muestra el valor por kilo calculado tras guardar, para detectar errores; revisar con quien digite | 🟡 | `features/admin/admin.page.ts` (`normalizarValor`) |
| 4.6 | **CSP con `style-src 'unsafe-inline'`**, necesario por los estilos de componentes de Angular. Aceptable; se podría endurecer con nonces si se activa `autoCsp` | 🟡 | `docker/caddy/Caddyfile` |
| 4.7 | **Imagen Docker de la API: 427 MB.** Funciona; se podría reducir (por ejemplo, empaquetar con esbuild) si el servidor tiene poco disco | 🟡 | `apps/api/Dockerfile` |
| 4.8 | **Telemetría de `@scarf/scarf`** (dependencia de `swagger-ui-dist`, vía `@nestjs/swagger`). Su script de instalación lo bloquea npm 11; si se instala con otra versión, poner `SCARF_ANALYTICS=false` | 🟡 | — |
| 4.9 | **Ingestas en desarrollo:** con `INGESTA_PROGRAMADA=true` el entorno local también descarga SIPSA (~316 MB) a diario. En equipos con datos limitados, ponerla en `false` | 🟡 | `.env` |
| 4.10 | **Vista "Nacional"** solo se abre desde "Histórico" ("Comparar con otros mercados"); no está en la barra inferior. Validar con los usuarios si la encuentran | 🟡 | `app.html` |
| 4.11 | **Capturas de pantalla** para la guía de capacitación (pendiente agregarlas al preparar el taller) | 🟡 | `docs/GUIA-USUARIO.md` |

## 5. Fuera de alcance de la Fase 1 (no implementar sin aprobación)

Registro de comercios y compradores, reseñas, registro de campesinos,
notificaciones (alertas de precio) y pagos. Están en el roadmap
(`docs/PROYECTO.md` §15) y CLAUDE.md pide detenerse y preguntar si una tarea
los requiere. La pregunta 6 (precios de compras locales de café en Pitalito)
también es de la Fase 2.
