export interface AppErrorOptions {
  code: string;
  status?: number;
  expose?: boolean;
  cause?: unknown;
  details?: Readonly<Record<string, unknown>>;
}

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly expose: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
  override readonly cause?: unknown;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = 'AppError';
    this.code = options.code;
    this.status = options.status ?? 500;
    this.expose = options.expose ?? false;
    this.details = options.details;
    this.cause = options.cause;
  }
}
