# Guion del video explicativo de AgroPrecios

> Guion para grabar el video de entrega: qué mostrar en pantalla y qué decir en
> cada módulo. Duración sugerida: **8 a 10 minutos**. Los textos de narración
> son una propuesta: adáptelos a su forma de hablar.
>
> **Importante:** no lea precios inventados. Diga los valores que aparezcan en
> pantalla el día de la grabación, con su fuente y su fecha.

## Antes de grabar

- [ ] App levantada en el portátil (`docs/DEMO-RED-LOCAL.md`) y abierta en
      **`http://localhost`** (así funcionan la instalación y el modo sin conexión).
- [ ] Datos cargados: en `/admin`, ejecutar las ingestas el mismo día para que
      las fechas sean recientes.
- [ ] **Vista de celular:** en Chrome, `F12` → ícono de dispositivo
      (`Ctrl+Shift+M`) → elegir un celular (por ejemplo, Pixel 7). La app es
      móvil primero: se ve mejor así. Al final, mostrar también la vista de
      escritorio.
- [ ] Cerrar pestañas y notificaciones; zoom del navegador al 100 %.
- [ ] Tener a mano el correo y la clave del administrador (no mostrarlos en el
      video: escribirlos con la cámara fuera o recortar esa parte).
- [ ] Grabador: la barra de juegos de Windows (`Win+G`) u OBS Studio.

## Mapa de módulos

| Módulo | Cómo se llega | Para qué sirve |
|---|---|---|
| **Hoy** | Botón "Hoy" (inicio) | Precio más reciente de cada producto |
| **Histórico** | Botón "Histórico" | Gráfica y tabla de cómo ha cambiado el precio |
| **Nacional** | "Comparar con otros mercados" (Histórico) o la tarjeta de Hoy | Precio del día en cada central mayorista |
| **Mundo** | Botón "Mundo" o la tarjeta "Vea los precios en el mundo" | Globo terráqueo y precios internacionales |
| **Fuentes** | Botón "Fuentes" | Quién publica cada dato y cuándo se actualizó |
| **Administración** | Dirección `/admin` (no aparece en el menú) | Ingestas, bitácora y carga manual de precios |

---

## Escena 1. Presentación y problema (≈ 1 min)

**En pantalla:** portada o diapositiva con el nombre del proyecto; luego la
app abierta en Hoy.

**Narración:**
> "AgroPrecios es un proyecto social de la UNAD pensado para los campesinos de
> la vereda Charguayaco, en Pitalito, Huila. Allí es frecuente vender café,
> plátano o cacao sin saber cuánto se está pagando en el mercado, y la señal
> de internet es mala. AgroPrecios reúne en un solo lugar los precios
> publicados por entidades oficiales (locales, nacionales e internacionales)
> y funciona aunque no haya señal."

**Mensaje clave:** la app **no compra ni vende**; es una **referencia** para
negociar mejor.

## Escena 2. Hoy: el precio del día (≈ 1,5 min)

**En pantalla:**
1. Recorrer las tarjetas de producto: café, plátano, banano y cacao.
2. Señalar en una tarjeta el **precio**, la **unidad**, la **fuente y fecha**
   ("Fuente: … · fecha") y la flecha **▲ / ▼**.
3. Abrir la ayuda **"¿Cómo leer estas tarjetas?"**.
4. Mostrar las tarjetas de abajo: "¿Qué más quiere saber?".

**Narración:**
> "La pantalla de inicio muestra el precio más reciente de cada producto. El
> café aparece con el precio de referencia de la Federación Nacional de
> Cafeteros, por carga de 125 kilos de pergamino seco, y su equivalente por
> kilo. El plátano y el banano muestran el precio en la central de abastos más
> cercana con datos. Cada tarjeta dice siempre de dónde sale el dato y de qué
> fecha es, y si subió o bajó frente al dato anterior."

**Detalle para resaltar:** el cacao, por ahora, solo tiene precio
internacional, porque no hay todavía una fuente nacional confiable.

## Escena 3. Histórico: cómo ha cambiado el precio (≈ 1,5 min)

**En pantalla:**
1. Tocar **Histórico**.
2. Seguir los pasos numerados: **1** elegir el producto (botones con dibujo),
   **2** dónde y en qué presentación, **3** el rango de fechas.
3. Tocar un punto de la gráfica para ver el precio de ese día.
4. Señalar el precio más bajo y el más alto del periodo.
5. Abrir **"Ver los datos en tabla"**.

**Narración:**
> "En Histórico vemos cómo ha subido o bajado el precio en semanas, meses o
> años. Los filtros van numerados, uno, dos, tres, y el producto se elige con
> un dibujo, pensando en personas con poca experiencia en aplicaciones. Esto
> sirve para saber si el precio de hoy está alto o bajo comparado con otras
> épocas. La misma información está en una tabla, para quien prefiera leerla
> así."

## Escena 4. Nacional: comparar centrales mayoristas (≈ 1 min)

**En pantalla:**
1. Desde Histórico, tocar **"Comparar con otros mercados"**.
2. Mostrar la lista de centrales, de mayor a menor precio, y la marcada como
   **"Referencia de la región"**.
3. Abrir la ayuda **"¿Qué es una central mayorista?"**.

**Narración:**
> "Aquí se compara el precio del día en las distintas centrales mayoristas del
> país, de mayor a menor, con la de la región destacada. Los datos vienen del
> SIPSA del DANE. Es importante aclarar que es precio mayorista: en la finca
> normalmente se paga menos por transporte y manejo."

## Escena 5. Mundo: el globo terráqueo (≈ 2 min)

**En pantalla:**
1. Tocar **Mundo**. Esperar a que cargue el globo (la primera vez descarga el
   mapa).
2. Girarlo arrastrando con el mouse o el dedo; usar **+** y **−**.
3. Explicar los colores: de amarillo (más barato) a café oscuro (más caro);
   en gris, los países sin datos.
4. Tocar un país (por ejemplo, Brasil o Vietnam para café): ver su precio,
   su evolución y **cuánto más o menos recibe que Colombia**.
5. **"Centrar en Colombia"** y **"Ver todo el mundo"**.
6. Mostrar **"Ver como tabla"**.
7. Bajar a **precios internacionales mes a mes**: cambiar entre pesos y
   dólares y el rango de tiempo.

**Narración:**
> "En Mundo está el globo terráqueo. Cada país tiene un color según lo que
> reciben sus productores, con datos de la FAO. Al tocar un país vemos su
> precio y cuánto más o menos recibe frente a Colombia. Para celulares de gama
> baja que no pueden dibujar el globo, la app cambia sola a una tabla con los
> mismos datos. Debajo están los precios internacionales mes a mes, del Banco
> Mundial, en pesos o en dólares, convertidos con la TRM."

**Aclaraciones obligatorias (decirlas):**
- Los precios de otros países son **promedios anuales** y llegan con unos
  **dos años de atraso**.
- El café de Nueva York es café **verde**, no pergamino: **no se compara peso
  a peso** con el de la FNC; sirve para ver la tendencia.

## Escena 6. Fuentes: transparencia (≈ 45 s)

**En pantalla:** tocar **Fuentes** y recorrer las tarjetas: nombre de la
entidad, frecuencia y última actualización.

**Narración:**
> "Para que el usuario confíe en los datos, esta pantalla dice quién publica
> cada precio, cada cuánto se actualiza y cuándo se actualizó por última vez:
> Federación Nacional de Cafeteros, DANE con el SIPSA, Superintendencia
> Financiera con la TRM, Banco Mundial y FAO."

## Escena 7. Funciona sin señal e instalación (≈ 1 min)

**En pantalla (en `http://localhost`):**
1. **Instalar:** ícono de instalar en la barra de direcciones de Chrome (o
   menú ⋮ → "Instalar AgroPrecios"). Mostrar el ícono creado.
2. **Sin conexión:** `F12` → pestaña **Network** → cambiar "No throttling" por
   **Offline** (o desconectar el Wi-Fi) → recargar.
3. Mostrar que la app abre igual y el aviso amarillo **"Sin conexión · datos de
   hace…"**.
4. Volver a conectar y mostrar que el aviso desaparece.

**Narración:**
> "AgroPrecios es una aplicación web progresiva: se instala en el celular desde
> el navegador, sin tienda de aplicaciones y sin pedir datos personales. Lo
> más importante para la vereda es que funciona sin señal: guarda los últimos
> precios que se vieron y avisa claramente de cuándo son. Además es muy
> liviana, para gastar pocos datos."

## Escena 8. Administración (≈ 1,5 min)

**En pantalla:**
1. Ir a **`/admin`** y entrar (no mostrar la clave).
2. **Ingestas:** mostrar el estado de cada fuente (al día, atrasada…) y
   ejecutar una ingesta liviana, como **TRM**.
3. **Bitácora:** las últimas 20 ejecuciones, con su estado y cuántos registros
   trajeron.
4. **Cargar un precio a mano:** recorrer el formulario (producto, fuente,
   mercado, valor y fecha) sin necesidad de guardar.
5. **Últimos precios cargados a mano** y la opción **Anular**.

**Narración:**
> "El panel de administración no aparece en el menú y está protegido con
> usuario y clave. Las fuentes se descargan solas todos los días, pero desde
> aquí se pueden ejecutar a mano, ver la bitácora de cada descarga y, cuando
> una fuente no tiene servicio automático, cargar un precio a mano. Un precio
> mal cargado se puede anular, y queda el registro."

## Escena 9 (opcional). Cómo está construida (≈ 1 min)

Para un público técnico (docentes o jurados):

**En pantalla:** `http://localhost/api/docs` (documentación de la API) y,
si se quiere, el repositorio en GitHub con la pestaña Actions.

**Narración:**
> "Técnicamente es una aplicación 100 % TypeScript: el backend en NestJS con
> PostgreSQL, el frontend en Angular como PWA y el globo con MapLibre. Cada
> fuente tiene un adaptador que descarga y normaliza los datos sin inventar ni
> convertir presentaciones distintas, guardando siempre el valor original. La
> API está documentada, y cada cambio pasa por pruebas automáticas antes de
> publicarse."

## Escena 10. Cierre (≈ 30 s)

**En pantalla:** volver a Hoy en vista de celular.

**Narración:**
> "AgroPrecios le da al campesino de Charguayaco una referencia confiable para
> negociar, aun sin señal. Las siguientes fases contemplan el registro de
> compradores y comercios, las reseñas y las notificaciones de precios. Gracias."

---

## Consejos de grabación

- Grabe **por escenas** y únalas después: si algo falla, solo repite esa escena.
- Mueva el mouse despacio y haga una pausa de 1 o 2 segundos en cada dato que
  mencione.
- Si una fuente aparece "atrasada", explíquelo con naturalidad: es parte de la
  transparencia (la fecha siempre se muestra).
- No muestre `.env`, claves, tokens ni correos personales en pantalla.
