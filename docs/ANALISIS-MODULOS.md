# AgroPrecios: análisis de ventajas y desventajas por módulo

| | |
|---|---|
| **Versión** | 1.0 |
| **Fecha** | 18 de noviembre de 2026 |
| **Alcance** | Fase 1 (solo datos), incluido el rediseño de la interfaz del 18-11-2026 |
| **Dirigido a** | Equipo del proyecto, tutor de la UNAD y quien opere o continúe el sistema |

> **Cómo leer este documento.** Cada módulo se describe con cuatro bloques:
> **qué hace**, **ventajas**, **desventajas o limitaciones** y **recomendaciones**.
> Al inicio hay un resumen ejecutivo con la valoración de cada módulo. Las
> afirmaciones se basan en el código, en `docs/DOCUMENTACION.md`, en las fichas
> de `docs/fuentes/` y en `docs/PENDIENTES.md`. Este documento no repite esas
> fuentes: las resume y las evalúa. El número entre corchetes, por ejemplo
> [P-1.1], remite al punto correspondiente de `docs/PENDIENTES.md`.

---

## 1. Resumen ejecutivo

### 1.1 Valoración general

AgroPrecios cumple su objetivo central: **mostrar en una sola pantalla el precio
de referencia del día, con su fuente y su fecha, y seguir funcionando sin
señal**. La arquitectura es sólida para un proyecto de este tamaño, las fuentes
están verificadas y documentadas, y la calidad está respaldada por pruebas
automáticas (67 unitarias y 56 e2e en la API, y 56 en la web).

Las debilidades principales **no son de código sino de datos y de operación**:

1. El precio del café, el más importante para la vereda, **depende de una carga
   manual diaria** y de una autorización de la FNC que todavía no existe.
2. **Pitaya y cacao no tienen fuente nacional**.
3. La ingesta de SIPSA **descarga unos 316 MB en cada ejecución**.
4. **No se ha probado en celulares reales de la vereda** ni en un servidor de
   producción.

### 1.2 Tabla resumen

Escala de la valoración: 🟢 sólido · 🟡 funciona con limitaciones conocidas · 🔴 riesgo que bloquea o condiciona la publicación.

| Módulo | Valoración | Principal ventaja | Principal desventaja |
|---|---|---|---|
| **Backend** | | | |
| Configuración (`config`) | 🟢 | Valida las variables de entorno al arrancar | Varios ajustes críticos dependen de que el operador los configure bien |
| Base de datos (`database`) | 🟢 | Migraciones revisadas, nunca `synchronize` | PostgreSQL exige un servidor con al menos 2 GB de RAM |
| Catálogo (`catalogo`) | 🟢 | Estado de cada fuente calculado automáticamente | Productos y mercados se cargan con semillas, no desde la web |
| Precios (`precios`) | 🟢 | Guarda el valor original y deriva COP/kg sin mezclar presentaciones | El mercado de referencia de "Hoy" está fijo en el código |
| Internacional (`internacional`) | 🟡 | Une Banco Mundial, FAOSTAT y la referencia nacional | Datos de FAOSTAT con dos años de rezago y valores extremos |
| Tasas (`tasas`) | 🟢 | TRM oficial desde 1991, sin token | Licencia CC BY-SA que obliga a compartir igual |
| Ingesta (núcleo) | 🟢 | Idempotente, aislada por fuente y con bitácora | Horarios de producción sin definir |
| Adapter TRM | 🟢 | API JSON oficial, liviana y estable | Ninguna relevante |
| Adapter SIPSA | 🟡 | Fuente oficial diaria de plátano y banano | ~316 MB por ejecución; continuidad no garantizada |
| Adapter Banco Mundial | 🟡 | Serie mensual desde 1960, archivo pequeño | La URL del archivo cambia y hay que actualizarla a mano |
| Adapter FAOSTAT | 🟡 | Precio al productor de muchos países | Rezago de ~2 años y cobertura parcial |
| FNC (carga manual) | 🔴 | Respeta los términos de uso de la FNC | Depende de una persona cada día y de una autorización pendiente |
| Autenticación (`auth`) | 🟡 | Token corto y solo para `/api/admin/**` | Un único usuario, sin cambio de contraseña desde la web |
| Salud (`salud`) | 🟢 | Lista para un monitor externo | El monitor externo aún no está configurado |
| Utilidades (`common`) | 🟢 | Dinero en decimal, citas y fechas centralizadas | Ninguna relevante |
| **Frontend** | | | |
| Estructura y navegación | 🟢 | Liviana (104,7 kB al abrir), lista para celular y escritorio | "Nacional" no tiene pestaña propia |
| Núcleo offline (`core`) | 🟢 | Avisa la antigüedad de los datos sin conexión | No probado en celulares reales |
| Hoy | 🟢 | Responde de un vistazo "¿a cuánto está hoy?" | El café puede mostrar un dato de días anteriores si nadie lo carga |
| Histórico | 🟢 | Gráfica, resumen y tabla con pasos numerados | Las series con pocos datos dan gráficas poco útiles |
| Nacional | 🟡 | Ranking claro con barras y referencia regional | Solo plátano y banano |
| Mundo (globo y bolsa) | 🟡 | Globo grande e interactivo con alternativa en tabla | El globo descarga ~395 kB; datos con rezago |
| Fuentes | 🟢 | Transparencia: estado y fecha de cada fuente | Lenguaje de licencias poco familiar para el usuario |
| Administración | 🟡 | Carga manual con anulación y bitácora | Formato de números ambiguo con un solo punto |
| **Transversal** | | | |
| PWA y modo sin conexión | 🟡 | Funciona con los últimos datos guardados | Sin validar en campo |
| Despliegue | 🟡 | Docker y HTTPS automático, probado en local | Sin servidor, dominio ni respaldo externo |
| Pruebas y calidad | 🟢 | Fixtures reales y presupuesto de peso que hace fallar el build | El CI nunca ha corrido en GitHub |

---

## 2. Backend (`apps/api`, NestJS + TypeORM + PostgreSQL)

### 2.1 Configuración (`config/`)

**Qué hace.** Lee las variables de entorno con `ConfigService`, las valida al
arrancar y define los horarios (`*_CRON`), las URL de las fuentes, los secretos
y opciones como `TRUST_PROXY`.

**Ventajas**
- Si falta una variable o tiene un formato inválido, **la API no arranca**: el
  error aparece de inmediato y no semanas después.
- Los horarios y las URL de las fuentes **se cambian sin tocar el código**. Por
  ejemplo, `WORLDBANK_URL` se ajusta cuando el Banco Mundial cambia su archivo.
- `.env.example` y `.env.prod.example` documentan cada variable.

**Desventajas o limitaciones**
- La seguridad depende de que el operador ponga secretos reales y aleatorios en
  `.env.prod` (`JWT_SECRET`, claves de base de datos y del administrador) [P-2.1].
- Un valor mal puesto de `TRUST_PROXY` puede hacer que el límite de peticiones
  bloquee a todos los usuarios juntos, porque los vería como una sola IP.

**Recomendaciones**
- Preparar una lista de verificación del primer despliegue que incluya generar
  los secretos.

### 2.2 Base de datos (`database/`)

**Qué hace.** Define la conexión de TypeORM, las migraciones (3 a la fecha) y
las semillas del catálogo: productos, fuentes, mercados, países y la relación
producto–fuente.

**Ventajas**
- **Nunca usa `synchronize: true`.** Cada cambio de esquema pasa por una
  migración revisada, lo que evita pérdidas de datos accidentales en
  producción.
- Los montos se guardan como `numeric(18,4)`, sin los errores de redondeo de
  los números de coma flotante.
- Las fechas de observación son `date` y los instantes `timestamptz`, con zona
  de negocio `America/Bogota`.
- Las semillas son repetibles: se pueden ejecutar varias veces sin duplicar.

**Desventajas o limitaciones**
- PostgreSQL y el resto del stack piden **un VPS de al menos 2 GB de RAM**, lo
  que supone un costo mensual [P-1.4].
- El respaldo diario (`pg_dump`) se guarda **en el mismo servidor**: si el
  servidor se pierde, se pierden también los respaldos [P-2.3].
- La restauración no se ha ensayado en un servidor real.

**Recomendaciones**
- Copiar los respaldos a un almacenamiento externo y probar una restauración
  completa antes del piloto.

### 2.3 Catálogo (`catalogo/`)

**Qué hace.** Expone productos, mercados y fuentes (`/api/productos`,
`/api/mercados`, `/api/fuentes`) y calcula el **estado de cada fuente**: al
día, atrasada, con error, sin datos o carga manual.

**Ventajas**
- El estado se calcula a partir de la última ingesta exitosa y de la frecuencia
  esperada de cada fuente. **El usuario ve si un dato está viejo**, sin
  intervención humana.
- El mismo cálculo alimenta la pantalla Fuentes y `/api/salud`, así que no hay
  dos versiones de la verdad.
- Los mercados nuevos que aparecen en SIPSA se registran solos durante la
  ingesta.

**Desventajas o limitaciones**
- Agregar un producto (por ejemplo, la pitaya cuando tenga fuente) exige una
  semilla o una migración. No hay pantalla para hacerlo.
- Los umbrales de "atrasada" (4 días si es diaria, 10 si es semanal, 45 si es
  mensual, 400 si es anual) son fijos. Un festivo largo puede marcar SIPSA como
  atrasada sin que haya una falla real.

**Recomendaciones**
- Mantener los productos en semillas mientras sean pocos; reconsiderar una
  pantalla de catálogo en la Fase 2.

### 2.4 Precios (`precios/`)

**Qué hace.** Guarda las observaciones de precio y responde las consultas
principales: precio de hoy con su variación, series disponibles, histórico por
rango y comparativo entre mercados.

**Ventajas**
- **Guarda el valor original** (moneda, unidad y presentación de la fuente) y
  calcula COP/kg y USD/kg como campos derivados. Siempre se puede rastrear de
  dónde salió una cifra.
- **No convierte entre presentaciones distintas.** Café pergamino seco, café
  verde y café excelso nunca se mezclan, lo que evita comparaciones engañosas.
- Un precio cargado a mano **no se borra: se anula con motivo**, y el historial
  conserva el valor anterior (auditoría).
- Las respuestas llevan `Cache-Control` y `ETag`: menos datos transferidos con
  mala señal.
- La variación ("Subió 1,22 % frente al 12 nov") se calcula en el servidor, de
  forma uniforme para todos los productos.

**Desventajas o limitaciones**
- El **mercado de referencia de "Hoy"** para plátano y banano (Neiva, luego
  Popayán, luego Bogotá) está fijo en `referencias-hoy.ts`. Falta confirmar con
  los productores si Neiva es la referencia útil para Pitalito [P-3.1].
- La variación compara con el dato anterior disponible, que puede ser de varios
  días atrás. Por eso la tarjeta muestra la fecha con la que compara.

**Recomendaciones**
- Validar el mercado de referencia en el taller con los productores.

### 2.5 Internacional (`internacional/`)

**Qué hace.** Sirve las series mensuales del Banco Mundial junto con la
referencia nacional (`/api/internacional/commodities`) y el precio anual al
productor por país para el globo (`/api/internacional/paises` y `/paises/:iso3`).

**Ventajas**
- Pone en un mismo lugar **el mercado mundial y el precio colombiano**, con la
  advertencia de comparabilidad de cada producto.
- La ficha de país compara contra Colombia **en el mismo año**, lo cual es
  metodológicamente correcto.
- Ofrece el valor en moneda local además del valor en dólares.

**Desventajas o limitaciones**
- FAOSTAT llega con **unos dos años de rezago**: el último año disponible es
  2024. Un usuario puede pensar que la app está desactualizada.
- **Cobertura parcial**: solo 15 a 35 países por producto y año, y algunos
  países tienen como último dato un año muy antiguo (Ghana, 2011) [P-3.5].
- **Valores extremos oficiales**: el café de EE. UU. (Hawái, ≈ 56 USD/kg) y el
  de España (Canarias, ≈ 50 USD/kg) dominan la escala de colores [P-3.4].
- El banano del Banco Mundial es precio de **importación** en EE. UU. y
  Europa, no un precio comparable con el de finca.

**Recomendaciones**
- Mostrar de forma visible "Datos de 2024, los más recientes que publica la
  FAO" junto al globo.
- Decidir si los valores extremos se excluyen del cálculo de la escala y se
  explican con una nota.

### 2.6 Tasas de cambio (`tasas/`)

**Qué hace.** Guarda la TRM diaria y la usa para convertir a pesos, con el
valor del día, el promedio del mes o el promedio del año según la serie.

**Ventajas**
- Fuente oficial (Superintendencia Financiera en datos.gov.co), **gratuita, sin
  token y en JSON**. Es la integración más simple y estable del sistema.
- Histórico desde 1991, suficiente para convertir todas las series.

**Desventajas o limitaciones**
- La licencia **CC BY-SA 4.0** obliga a citar la fuente y, si se redistribuye
  la serie (`GET /api/tasas/trm`), a hacerlo bajo la misma licencia.
- Las conversiones con promedios mensuales o anuales son aproximaciones: sirven
  como referencia, no como precio exacto. La interfaz lo aclara ("con la TRM
  promedio del mes").

**Recomendaciones**
- Ninguna urgente.

### 2.7 Ingesta (`ingesta/`): núcleo común

**Qué hace.** Programa y ejecuta la descarga de cada fuente, normaliza los
datos, los guarda sin duplicar y deja registro de cada ejecución en
`ingesta_ejecucion`. Cada fuente es un *adapter* independiente.

**Ventajas**
- **Idempotente**: repetir una ingesta no duplica datos y solo actualiza los
  valores que cambiaron.
- **Aislada**: cada ejecución va en su propia transacción, así que **una fuente
  caída no tumba las demás** ni deja datos a medias.
- **Trazable**: la bitácora registra estado, conteos, error y hash del archivo
  descargado. Permite diagnosticar sin entrar al servidor.
- **Disparo manual** desde `/admin` o `POST /api/admin/ingesta/:fuente`.
- **Respetuosa**: una sola descarga por fuente y ejecución, con un
  `User-Agent` identificable, y se respetan los términos y el `robots.txt`.
- Agregar una fuente nueva consiste en escribir un adapter que cumpla
  `FuenteAdapter`. El resto del sistema no cambia.

**Desventajas o limitaciones**
- Los **horarios actuales son de demostración**; los de producción no están
  definidos [P-1.5].
- En desarrollo, con `INGESTA_PROGRAMADA=true`, el equipo local también
  descarga SIPSA todos los días [P-4.9].
- No hay alertas automáticas cuando una ingesta falla. Alguien tiene que mirar
  `/admin`, la pantalla Fuentes o el monitor externo.

**Recomendaciones**
- Definir los horarios de producción al desplegar.
- Conectar `/api/salud` a un monitor externo que avise por correo [P-2.4].

### 2.8 Adapters por fuente

| Adapter | Ventajas | Desventajas | Riesgo |
|---|---|---|---|
| **TRM** (`trm.adapter.ts`) | API JSON oficial; cada ejecución trae solo los últimos 40 registros; se ejecuta dos veces al día para captar la TRM del día siguiente | Ninguna relevante | 🟢 Bajo |
| **SIPSA – DANE** (`sipsa.adapter.ts`) | Única fuente oficial **diaria** de precios mayoristas de plátano hartón, plátano guineo y banano en las centrales del país, incluida Neiva; servicio SOAP documentado; se procesa en streaming sin agotar la memoria | **Cada consulta devuelve todo el histórico (~316 MB)**, costoso en datos y tiempo; el DANE lo publicó durante la emergencia sanitaria y **no garantiza su continuidad**; cita obligatoria y términos que pueden cambiar sin aviso | 🟡 Medio [P-1.3, P-3.7] |
| **Banco Mundial – Pink Sheet** (`worldbank.adapter.ts`) | Serie mensual desde 1960 de café arábica y robusta, cacao y banano; archivo pequeño (~0,6 MB); licencia CC BY 4.0 | **La URL del archivo cambia** con el tiempo y hay que actualizar `WORLDBANK_URL` a mano (la bitácora avisa del fallo); prohíbe insinuar que el Banco Mundial avala la app | 🟡 Medio [P-3.6] |
| **FAOSTAT – FAO** (`faostat.adapter.ts`) | Precio **al productor** en muchos países, que es justo lo que interesa al campesino; datos desde 1991; lectura en streaming de un CSV de ~214 MB | Rezago de unos dos años; cobertura parcial; formato de cita obligatorio; descarga de ~12 MB comprimidos | 🟡 Medio [P-3.4] |
| **FNC** (carga manual, sin adapter) | Cumple los términos de uso de la FNC, que **prohíben la extracción automatizada**; el administrador guarda el valor original por carga de 125 kg | **Depende de que una persona lo cargue cada día hábil**; si no se carga, "Hoy" muestra el último dato con el aviso "Último dato disponible"; **falta la autorización escrita** para publicarlo en abierto, lo que supone un riesgo legal | 🔴 Alto [P-1.1] |
| **Pitaya y cacao nacional** | — | **No existe una fuente nacional verificada**: el cacao solo muestra el precio internacional y la pitaya no aparece | 🟠 Pendiente [P-1.2] |

### 2.9 Autenticación (`auth/`)

**Qué hace.** Inicio de sesión del único rol, `ADMIN`, con JWT. Protege las
rutas `/api/admin/**`.

**Ventajas**
- **Superficie mínima**: un solo rol y ningún dato personal de campesinos, en
  línea con el principio de minimización de datos.
- El token dura 15 minutos, se guarda en `sessionStorage` (se borra al cerrar
  la pestaña) y **solo se envía a `/api/admin/**`**. Ante un 401 se cierra la
  sesión.
- Se complementa con `helmet`, límite de peticiones (`@nestjs/throttler`) y
  CORS restringido.

**Desventajas o limitaciones**
- **Un único usuario** administrador: si esa persona falta, nadie más puede
  cargar el precio del café.
- No hay cambio de contraseña desde la web (hay que actualizar el hash en la
  base de datos) y el token no se renueva solo [P-4.4].
- No hay registro de *qué* administrador hizo cada cambio, porque solo hay uno.

**Recomendaciones**
- Para el piloto, compartir la responsabilidad con un suplente usando el mismo
  usuario y un procedimiento documentado.
- En la Fase 2, agregar varios administradores con auditoría por usuario.

### 2.10 Salud (`salud/`)

**Qué hace.** `GET /api/salud` informa el estado de la API, de la base de datos
y de la ingesta de cada fuente.

**Ventajas**
- Responde 503 **solo si cae la base de datos**. Una fuente externa atrasada no
  hace que un monitor marque toda la API como caída.
- Lista para conectar a un monitor gratuito (por ejemplo, UptimeRobot).

**Desventajas o limitaciones**
- El monitor externo **no está configurado** todavía [P-2.4].

### 2.11 Utilidades comunes (`common/`)

**Qué hace.** Aritmética decimal para dinero, fechas en zona de Bogotá,
unidades, citas de licencia de cada fuente y cabeceras de caché.

**Ventajas**
- Centraliza reglas que, si se repitieran en cada módulo, terminarían
  divergiendo: **nunca se usa `number` para dinero** y las citas de licencia
  salen de un único lugar.

**Desventajas o limitaciones**
- Ninguna relevante.

---

## 3. Frontend (`apps/web`, Angular PWA)

### 3.1 Estructura, navegación e identidad visual

**Qué hace.** Encabezado con el logo, barra de 4 pestañas (Hoy, Histórico,
Mundo, Fuentes) y avisos globales: sin conexión, conexión lenta y versión
nueva. Desde el 18-11-2026 usa la paleta "cafetal" (verde hoja, café tostado,
rojo cereza y fondo crema) e ilustraciones de cada producto.

**Ventajas**
- **Liviana**: 104,7 kB comprimidos al abrir, cerca de la mitad del límite de
  200 kB. El build **falla** si se supera.
- Cada pantalla se carga solo cuando se visita (*lazy loading*). Las gráficas y
  el globo se descargan solo al usarse.
- **Accesibilidad cuidada**: letra de al menos 16 px, botones de al menos
  48 px, alto contraste, enlace "Saltar al contenido" y respeto a "movimiento
  reducido".
- En pantallas anchas, la misma barra sube al encabezado, sin duplicar código.
- Ilustraciones en SVG dentro del código: **no descargan nada** y funcionan sin
  conexión.

**Desventajas o limitaciones**
- La pantalla **Nacional no tiene pestaña propia**. Se llega desde Hoy,
  Histórico o los accesos rápidos [P-4.10].
- No hay un reporte formal de accesibilidad AA (Lighthouse o axe) ni una prueba
  con lector de pantalla (TalkBack) [P-4.2].
- Los íconos PNG de instalación de la PWA aún tienen el diseño anterior.

**Recomendaciones**
- Ejecutar Lighthouse y axe y corregir lo que aparezca.
- Actualizar los íconos PNG de instalación con el nuevo logo.

### 3.2 Núcleo (`core/`): conexión, frescura y formato

**Qué hace.** Detecta si hay conexión, sabe si la respuesta vino de la caché
del *service worker* y de cuándo es, y formatea cifras y fechas en es-CO
(pesos sin decimales).

**Ventajas**
- Muestra mensajes honestos: **"Sin conexión · datos de hace 3 horas"** o
  **"Conexión lenta · mostrando datos de hace…"**. El campesino sabe qué tan
  confiable es el número que ve.
- El formato colombiano es uniforme en toda la app ("$ 2.075.000", "13 nov
  2026").

**Desventajas o limitaciones**
- El comportamiento real del *service worker* con HTTPS **no se pudo probar en
  local**; solo en producción [P-2.5].

### 3.3 Pantalla Hoy

**Qué hace.** Muestra una tarjeta por producto con el precio de referencia más
reciente, la variación, la fuente y la fecha. Incluye la TRM del día, la ayuda
"¿Cómo leer estas tarjetas?", una tarjeta para abrir el globo y accesos
rápidos.

**Ventajas**
- **Responde de un vistazo** la pregunta principal: "¿a cuánto está hoy?".
- Lenguaje cotidiano: "por carga de 125 kg", "Subió 1,22 %", "Precio al por
  mayor en una central de abastos".
- Avisa cuando el dato **no es del día** ("Último dato disponible").
- Muestra las advertencias de comparabilidad junto al precio (por ejemplo,
  pergamino frente a café verde de Nueva York).

**Desventajas o limitaciones**
- Si el administrador no carga el precio de la FNC, el café muestra un dato de
  días anteriores. Está señalado, pero sigue siendo el dato más importante.
- El cacao se muestra con su **precio internacional**. Hay que confirmar con
  los usuarios que no lo confunden con lo que pagan en la zona [P-3.3].
- La tarjeta del café es larga (precio, bolsa de Nueva York y advertencia) y en
  celulares pequeños obliga a desplazarse.

**Recomendaciones**
- Probar con los usuarios si entienden la tarjeta del cacao y la del café.

### 3.4 Pantalla Histórico

**Qué hace.** Gráfica de la evolución del precio por producto, mercado y rango
de tiempo (7 días a todo), con mínimo, promedio y máximo y una tabla con los
mismos datos.

**Ventajas**
- **Pasos numerados** (1. producto, 2. dónde, 3. cuánto tiempo) y botones con
  el dibujo de cada producto.
- Mínimo, promedio y máximo explicados en palabras sencillas.
- **Tabla alternativa** a la gráfica, para lectores de pantalla y para quien
  prefiera números.
- El filtro elegido queda en la dirección (URL), así que se puede compartir o
  guardar.

**Desventajas o limitaciones**
- Con pocos datos (por ejemplo, un solo precio cargado a mano) la gráfica es un
  punto y aporta poco.
- La lista "¿Dónde y en qué presentación?" puede tener nombres largos y
  técnicos, como "Neiva, Surabastos · hartón verde (DANE – SIPSA)".

### 3.5 Pantalla Nacional

**Qué hace.** Ranking del mismo producto en las centrales mayoristas del país,
de mayor a menor, comparado con la plaza de referencia.

**Ventajas**
- Puestos numerados, **barras de comparación** y "X % más / menos que la
  referencia". Se entiende sin leer cifras.
- Explica qué es una central mayorista y por qué su precio es mayor que el de
  la finca.

**Desventajas o limitaciones**
- Solo **plátano y banano**, porque son los únicos productos con datos por
  mercado en SIPSA.
- Es precio **mayorista**: útil como tendencia, no como lo que se recibe en la
  finca.

### 3.6 Pantalla Mundo (globo y bolsa internacional)

**Qué hace.** Arriba, un **globo terráqueo grande** (MapLibre GL) con el precio
al productor por país, botones +/−, "Centrar en Colombia", "Ver todo el mundo"
y una ficha del país tocado. Debajo, la serie mensual del Banco Mundial con su
gráfica y su tabla.

**Ventajas**
- **Atractivo y fácil de explorar**: ayuda a entender que el café colombiano
  compite en un mercado mundial.
- La escala de colores (amarillo, más barato, a café oscuro, más caro) es
  **apta para personas daltónicas** y va acompañada de una leyenda con valores.
- **Alternativa en tabla**: si el equipo no tiene WebGL, la app lo detecta y
  muestra la tabla automáticamente.
- Funciona sin conexión: el mapa de países (Natural Earth) es un archivo propio,
  sin servicios de mapas externos ni costos de licencia.
- MapLibre **solo se descarga al entrar a Mundo**.

**Desventajas o limitaciones**
- **Peso**: el globo descarga unos 395 kB comprimidos la primera vez. Con mala
  señal tarda en aparecer, aunque después queda guardado.
- **No se ha medido la fluidez en celulares de gama baja** [P-4.3].
- Los datos tienen **rezago de dos años** y pocos países por año, así que el
  globo muestra muchos países en gris.
- Windows de escritorio no dibuja las banderas en emoji y muestra letras
  ("BR") [P-3.8].
- El globo no está en la pantalla de inicio. Fue una decisión deliberada por
  peso y por la regla de `CLAUDE.md`; en Hoy hay una tarjeta que lleva a él.

**Recomendaciones**
- Medir en un Android de gama baja. Si va lento, arrancar en la vista de tabla
  en equipos con poca memoria.
- Indicar el año de los datos de forma visible.

### 3.7 Pantalla Fuentes

**Qué hace.** Muestra cada fuente con su estado, la fecha de la última
actualización, la frecuencia, el tipo, la licencia y el enlace oficial, además
de tres razones para confiar en los datos.

**Ventajas**
- **Transparencia**: el usuario puede comprobar de dónde sale cada número y
  cuándo se actualizó. Eso genera confianza frente al intermediario.
- Cumple las obligaciones de cita de cada licencia.

**Desventajas o limitaciones**
- Términos como "CC BY-SA 4.0" o "Licencia" son poco familiares para el
  usuario rural, aunque no le impiden usar la app.

### 3.8 Panel de administración (`/admin`)

**Qué hace.** Inicio de sesión, ejecución manual de ingestas, bitácora, carga
manual de precios (FNC) y anulación con motivo.

**Ventajas**
- No aparece en la navegación pública y se carga aparte (*lazy*).
- Acepta "2.075.000" y "278,65", y muestra el valor por kilo calculado después
  de guardar, para detectar errores de digitación.
- La **anulación con motivo** conserva la trazabilidad: nada se borra.

**Desventajas o limitaciones**
- Un número con **un solo punto** ("2.075") se interpreta como decimal, no como
  miles. Es un error de digitación posible [P-4.5].
- Tiene un diseño funcional y no recibió el rediseño visual de las pantallas
  públicas.
- La sesión expira a los 15 minutos sin aviso previo.

**Recomendaciones**
- Mostrar una confirmación clara antes de guardar, del tipo "¿Guardar $ 2.075
  por carga?", cuando el valor esté muy lejos del último precio.

### 3.9 Componentes compartidos (`shared/`)

| Componente | Ventajas | Desventajas |
|---|---|---|
| **Tarjeta de precio** | Reutilizable; cubierta por pruebas (formato, variación, aviso de dato viejo, enlaces) | Mucho contenido en una sola tarjeta |
| **Gráfica de línea** (Chart.js) | Se carga bajo demanda (~61 kB); patrones de línea distintos además del color; sin animaciones | Chart.js es la dependencia más pesada después de MapLibre |
| **Dibujo del producto** | SVG propio, sin descargas | Pruebas propias pendientes |
| **Selector de producto** | Botones grandes con dibujo y ✓; más intuitivo que una lista | Pruebas propias pendientes |

---

## 4. Aspectos transversales

### 4.1 PWA y funcionamiento sin conexión

**Ventajas**
- El *service worker* pide primero a la red y, si no responde en **4
  segundos**, usa lo guardado: hasta 7 días para el precio del día y 30 días
  para las series.
- La app se puede **instalar** en el celular como si fuera nativa, sin tienda
  de aplicaciones.
- Aviso "Hay una nueva versión · Toca para actualizar": el usuario decide
  cuándo, sin perder lo que estaba viendo.

**Desventajas o limitaciones**
- **Falta la prueba en celulares reales** de la vereda: instalación, modo avión
  y aviso de datos viejos [P-2.5]. Es el principal riesgo de adopción.
- La primera visita sí requiere conexión para descargar la app y los datos.

### 4.2 Despliegue (Docker Compose + Caddy)

**Ventajas**
- Un solo comando levanta base de datos, API, web y respaldos.
- **HTTPS automático** con Let's Encrypt, sin renovaciones manuales.
- API y web en el mismo dominio: sin problemas de CORS, y el *service worker*
  puede guardar `/api`.
- Política de seguridad del contenido (CSP) estricta.
- El stack completo se probó en local el 16-11-2026.

**Desventajas o limitaciones**
- **No hay servidor ni dominio** todavía [P-1.4].
- La imagen de la API pesa 427 MB [P-4.7].
- El repositorio no está publicado y las ramas por etapa no se han integrado en
  `main` [P-1.6].

### 4.3 Seguridad y cumplimiento normativo

**Ventajas**
- **No se recogen datos personales** de campesinos en la Fase 1 (minimización
  de datos, Ley 1581 de 2012).
- Se cumplen las licencias y citas de todas las fuentes; cada ficha documenta
  sus términos.
- Las dependencias se vigilan: MapLibre se actualizó a 6.18 por una
  vulnerabilidad crítica en versiones anteriores.

**Desventajas o limitaciones**
- **Riesgo legal con la FNC** mientras no exista la autorización escrita para
  publicar su precio [P-1.1].
- La licencia del propio código no está definida (`UNLICENSED`) [P-1.7].
- La encuesta y la capacitación requieren un formato de consentimiento si se
  recogen datos personales [P-1.8].

### 4.4 Pruebas y calidad

**Ventajas**
- Cada adapter se prueba con **archivos reales guardados** (*fixtures*), sin
  depender de la red.
- Pruebas e2e de la API contra una base de datos de pruebas.
- Lint, pruebas y build se ejecutan en cada incremento; el presupuesto de peso
  hace fallar el build si se excede.

**Desventajas o limitaciones**
- El **CI de GitHub nunca ha corrido** porque no se ha hecho push [P-2.6].
- No hay pruebas automáticas de extremo a extremo en el navegador ni de
  accesibilidad.

### 4.5 Paquete de tipos compartidos (`packages/shared`)

**Ventajas**
- La API y la web usan **las mismas interfaces**. Si cambia un DTO, el error
  aparece al compilar y no en producción.

**Desventajas**
- Ninguna relevante en este tamaño de proyecto.

---

## 5. Riesgos consolidados y prioridades

| Prioridad | Riesgo | Módulo | Impacto si no se atiende | Acción propuesta |
|---|---|---|---|---|
| 🔴 1 | Sin autorización de la FNC | FNC / Hoy | Riesgo legal al publicar el precio del café | Enviar la carta ya redactada (`docs/solicitudes/`) |
| 🔴 2 | Carga manual diaria del café | Administración | Dato del café desactualizado | Designar responsable y suplente; recordatorio diario |
| 🔴 3 | Sin servidor, dominio ni respaldo externo | Despliegue | No se puede publicar; posible pérdida de datos | Contratar el VPS; copiar respaldos fuera y probar la restauración |
| 🔴 4 | Sin prueba en celulares de la vereda | PWA / Mundo | Que la app no se use o no funcione sin señal | Taller piloto con 3 a 5 productores y equipos de gama baja |
| 🟠 5 | SIPSA descarga ~316 MB por ejecución | Ingesta | Costo de datos del servidor; ingesta lenta | Consultar al DANE por un filtro por fecha o producto |
| 🟠 6 | Pitaya y cacao sin fuente nacional | Catálogo / Hoy | Cobertura incompleta de los cultivos de la vereda | Buscar fuente regional (gremios, Gobernación del Huila) |
| 🟠 7 | URL cambiante del Banco Mundial | Ingesta | Serie internacional desactualizada | Revisión mensual programada |
| 🟡 8 | Rezago y valores extremos de FAOSTAT | Mundo | Confusión del usuario | Mostrar el año de los datos y tratar los extremos en la escala |
| 🟡 9 | Un solo administrador sin cambio de contraseña | Autenticación | Dependencia de una persona | Procedimiento de suplencia; mejora en la Fase 2 |

---

## 6. Conclusión

El sistema está **bien construido para su propósito**. Las decisiones técnicas
de mayor peso (valor original más campos derivados, ingesta idempotente y
aislada, presupuesto de peso, modo sin conexión y transparencia de fuentes)
reducen los riesgos de un proyecto social con poca conectividad y pocos
recursos de mantenimiento.

Lo que falta para un piloto exitoso **es, sobre todo, gestión**: la
autorización de la FNC, el servidor, el responsable de la carga diaria y la
validación con los productores de Charguayaco. Resolver los cuatro puntos 🔴 de
la sección 5 es condición para publicar. Los demás pueden atenderse durante el
piloto.

---

## 7. Documentos relacionados

| Documento | Para qué consultarlo |
|---|---|
| `docs/PROYECTO.md` | Especificación completa y registro de decisiones |
| `docs/DOCUMENTACION.md` | Cómo funciona el sistema hoy |
| `docs/PENDIENTES.md` | Detalle de cada pendiente citado como [P-x.y] |
| `docs/fuentes/*.md` | Fichas verificadas de cada fuente de datos |
| `docs/DESPLIEGUE.md` | Puesta en producción, respaldos y monitoreo |
| `docs/GUIA-USUARIO.md` | Uso de la app, para la capacitación |
