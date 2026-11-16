/** POST /api/auth/login (cuerpo). */
export interface CredencialesDto {
  email: string;
  password: string;
}

/** POST /api/auth/login (respuesta). */
export interface SesionDto {
  accessToken: string;
  tokenType: 'Bearer';
  /** Vencimiento del token (ISO 8601). */
  expiraEn: string;
}
