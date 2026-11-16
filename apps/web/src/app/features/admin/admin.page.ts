import {
  type CargaManualPrecioDto,
  type FuenteDto,
  type IngestaEjecucionDto,
  type MercadoDto,
  type ObservacionPrecioDto,
  type ProductoDto,
  type SesionDto,
} from '@agroprecios/shared';
import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../../core/api';
import { formatearFecha, formatearFechaHora, formatearPrecio } from '../../core/formato';
import { SesionService } from '../../core/sesion';

/** Fuentes con adapter de ingesta automática (las demás se cargan a mano). */
export const FUENTES_INGESTA = [
  { slug: 'trm', aviso: null },
  { slug: 'sipsa', aviso: 'Descarga unos 316 MB del DANE; puede tardar varios minutos.' },
  { slug: 'worldbank', aviso: null },
  { slug: 'faostat', aviso: 'Descarga unos 12 MB de la FAO.' },
];

/** Unidades que la API sabe convertir a kg (apps/api/src/common/unidades.ts). */
export const UNIDADES = ['kg', 'carga 125 kg', 'arroba', 'lb', 't', 'USc/lb'];

const ESTADOS_FUENTE: Record<string, string> = {
  AL_DIA: 'Al día',
  ATRASADA: 'Atrasada',
  ERROR: 'Error',
  SIN_DATOS: 'Sin datos',
  NO_APLICA: 'Carga manual',
};

/** Valor de texto de un campo de formulario ("" si falta o es un archivo). */
function campo(datos: FormData, nombre: string): string {
  const valor = datos.get(nombre);
  return typeof valor === 'string' ? valor : '';
}

/** Fecha de hoy en Bogotá (AAAA-MM-DD). */
export function hoyBogota(ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(ahora);
}

/** Mensaje legible a partir del error de la API (NestJS: message string | string[]). */
export function mensajeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor.';
    if (error.status === 401) return 'La sesión venció o los datos de acceso no son válidos.';
    const cuerpo = error.error as { message?: string | string[] } | null;
    const mensaje = cuerpo?.message;
    if (Array.isArray(mensaje)) return mensaje.join('. ');
    if (mensaje) return mensaje;
    return `Error ${error.status}`;
  }
  return 'Ocurrió un error inesperado.';
}

/**
 * Panel del administrador (único rol de la Fase 1): ingestas, bitácora, carga
 * manual de precios y anulación. Se carga de forma diferida y no aparece en la
 * navegación pública. Toda la seguridad está en la API (JWT + AdminGuard).
 */
@Component({
  selector: 'ap-admin-page',
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage {
  private readonly api = inject(API_URL);
  private readonly http = inject(HttpClient);
  protected readonly sesion = inject(SesionService);

  protected readonly fuentesIngesta = FUENTES_INGESTA;
  protected readonly unidades = UNIDADES;
  protected readonly estados = ESTADOS_FUENTE;
  protected readonly hoy = hoyBogota();
  protected readonly fecha = formatearFecha;
  protected readonly fechaHora = formatearFechaHora;
  protected readonly precio = formatearPrecio;

  protected readonly errorAcceso = signal<string | null>(null);
  protected readonly entrando = signal(false);
  /** Slug de la fuente que se está ingiriendo. */
  protected readonly ingiriendo = signal<string | null>(null);
  protected readonly resultadoIngesta = signal<IngestaEjecucionDto | null>(null);
  protected readonly errorIngesta = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly resultadoCarga = signal<string | null>(null);
  protected readonly errorCarga = signal<string | null>(null);
  /** id de la observación con el formulario de anulación abierto. */
  protected readonly anulando = signal<string | null>(null);
  protected readonly errorAnulacion = signal<string | null>(null);

  private readonly siActiva = (url: string) => (this.sesion.activa() ? url : undefined);

  protected readonly fuentes = httpResource<FuenteDto[]>(() =>
    this.siActiva(`${this.api}/fuentes`),
  );
  protected readonly productos = httpResource<ProductoDto[]>(() =>
    this.siActiva(`${this.api}/productos`),
  );
  protected readonly mercados = httpResource<MercadoDto[]>(() =>
    this.siActiva(`${this.api}/mercados`),
  );
  protected readonly bitacora = httpResource<IngestaEjecucionDto[]>(() =>
    this.siActiva(`${this.api}/admin/ingestas?limite=20`),
  );
  protected readonly precios = httpResource<ObservacionPrecioDto[]>(() =>
    this.siActiva(`${this.api}/admin/precios?limite=20`),
  );

  protected estadoDe(slug: string): FuenteDto | undefined {
    return this.fuentes.hasValue() ? this.fuentes.value().find((f) => f.slug === slug) : undefined;
  }

  protected async entrar(evento: SubmitEvent): Promise<void> {
    evento.preventDefault();
    const datos = new FormData(evento.target as HTMLFormElement);
    this.entrando.set(true);
    this.errorAcceso.set(null);
    try {
      const sesion = await firstValueFrom(
        this.http.post<SesionDto>(`${this.api}/auth/login`, {
          email: campo(datos, 'email').trim(),
          password: campo(datos, 'password'),
        }),
      );
      this.sesion.iniciar(sesion);
    } catch (error) {
      this.errorAcceso.set(
        error instanceof HttpErrorResponse && error.status === 429
          ? 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.'
          : mensajeError(error),
      );
    } finally {
      this.entrando.set(false);
    }
  }

  protected async ingerir(slug: string): Promise<void> {
    this.ingiriendo.set(slug);
    this.resultadoIngesta.set(null);
    this.errorIngesta.set(null);
    try {
      const resultado = await firstValueFrom(
        this.http.post<IngestaEjecucionDto>(`${this.api}/admin/ingesta/${slug}`, null),
      );
      this.resultadoIngesta.set(resultado);
    } catch (error) {
      this.errorIngesta.set(mensajeError(error));
    } finally {
      this.ingiriendo.set(null);
      this.bitacora.reload();
      this.fuentes.reload();
    }
  }

  protected async cargar(evento: SubmitEvent): Promise<void> {
    evento.preventDefault();
    const formulario = evento.target as HTMLFormElement;
    const datos = new FormData(formulario);
    const texto = (nombre: string) => campo(datos, nombre).trim();
    const mercado = texto('mercadoId');
    const referencia = texto('referencia');
    const cuerpo: CargaManualPrecioDto = {
      producto: texto('producto'),
      fuente: texto('fuente'),
      fecha: texto('fecha'),
      presentacion: texto('presentacion'),
      // Acepta coma decimal ("278,65") y quita separadores de miles con punto ("2.075.000").
      valor: normalizarValor(texto('valor')),
      moneda: texto('moneda').toUpperCase(),
      unidad: texto('unidad'),
      ...(mercado ? { mercadoId: Number(mercado) } : {}),
      ...(referencia ? { referencia } : {}),
    };
    this.guardando.set(true);
    this.resultadoCarga.set(null);
    this.errorCarga.set(null);
    try {
      const obs = await firstValueFrom(
        this.http.post<ObservacionPrecioDto>(`${this.api}/admin/precios`, cuerpo),
      );
      this.resultadoCarga.set(
        `Guardado: ${obs.producto.nombre} ${obs.presentacion}, ${formatearFecha(obs.fecha)}` +
          (obs.valorCopKg ? ` (${formatearPrecio(obs.valorCopKg, 'COP', 'kg')} por kilo)` : ''),
      );
      formulario.querySelector<HTMLInputElement>('[name=valor]')!.value = '';
      this.precios.reload();
    } catch (error) {
      this.errorCarga.set(mensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  protected async anular(evento: SubmitEvent, id: string): Promise<void> {
    evento.preventDefault();
    const motivo = campo(new FormData(evento.target as HTMLFormElement), 'motivo');
    this.errorAnulacion.set(null);
    try {
      await firstValueFrom(
        this.http.patch<ObservacionPrecioDto>(`${this.api}/admin/precios/${id}/anular`, {
          motivo: motivo.trim(),
        }),
      );
      this.anulando.set(null);
      this.precios.reload();
    } catch (error) {
      this.errorAnulacion.set(mensajeError(error));
    }
  }

  protected salir(): void {
    this.sesion.cerrar();
  }
}

/**
 * Normaliza lo que se digita al formato de la API (punto decimal, sin miles):
 * "2.075.000" -> "2075000"; "2.075.000,5" -> "2075000.5"; "278,65" -> "278.65".
 * Con un solo punto y sin coma se respeta como decimal ("278.65"): no se adivina.
 */
export function normalizarValor(texto: string): string {
  const limpio = texto.replace(/\s|\$/g, '');
  if (limpio.includes(',')) return limpio.replace(/\./g, '').replace(',', '.');
  if ((limpio.match(/\./g) ?? []).length > 1) return limpio.replace(/\./g, '');
  return limpio;
}
