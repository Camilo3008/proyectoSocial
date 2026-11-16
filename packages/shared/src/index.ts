// Punto de entrada de los tipos compartidos API <-> web.
// Regla: aquí solo hay interfaces y tipos (sin lógica ni valores en tiempo de ejecución).
export type * from './auth.js';
export type * from './catalogo.js';
export type * from './ingesta.js';
export type * from './precios.js';
export type * from './salud.js';
export type * from './tasas.js';
