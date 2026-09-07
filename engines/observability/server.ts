import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { RequestContext } from '../../core';
import type { LogLevel, ObservabilityEngine } from './public';

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY = /(authorization|cookie|token|secret|password|apikey|api_key|email|phone|lat|lng|location|hiv|birth|dob)/i;

const redactValue = (value: unknown, depth = 0): unknown => {
  if (depth > 4) return '[MAX_DEPTH]';
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => redactValue(item, depth + 1));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 50)
      .map(([key, entry]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : redactValue(entry, depth + 1)]),
  );
};

const emit = (
  level: LogLevel,
  event: string,
  context: RequestContext,
  data?: Readonly<Record<string, unknown>>,
): void => {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: 'ponto-g',
    requestId: context.requestId,
    correlationId: context.correlationId || context.requestId,
    source: context.source,
    data: data ? redactValue(data) : undefined,
  };

  const line = JSON.stringify(record);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

export const observabilityEngine: ObservabilityEngine = {
  id: 'observability',
  version: '1.0.0',
  log(level, message, data, context) {
    emit(level, message, context, data);
  },
  metric(name, value, tags) {
    const context: RequestContext = { requestId: randomUUID(), source: 'event' };
    emit('info', 'metric', context, { name, value, tags });
  },
};

const firstHeader = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export const createHttpRequestContext = (req: VercelRequest, res?: VercelResponse): RequestContext => {
  const incoming = firstHeader(req.headers['x-correlation-id'] as string | string[] | undefined);
  const requestId = randomUUID();
  const correlationId = incoming?.slice(0, 128) || requestId;
  if (res) res.setHeader('x-correlation-id', correlationId);
  return { requestId, correlationId, source: 'http' };
};

export const observeHttp = async <T>(
  req: VercelRequest,
  res: VercelResponse,
  event: string,
  handler: (context: RequestContext) => Promise<T> | T,
): Promise<T> => {
  const context = createHttpRequestContext(req, res);
  const started = Date.now();
  observabilityEngine.log('info', `${event}.started`, { method: req.method, path: req.url?.split('?')[0] }, context);
  try {
    const result = await handler(context);
    observabilityEngine.log('info', `${event}.completed`, { durationMs: Date.now() - started, statusCode: res.statusCode }, context);
    return result;
  } catch (error) {
    observabilityEngine.log('error', `${event}.failed`, {
      durationMs: Date.now() - started,
      statusCode: res.statusCode,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message.slice(0, 300) : 'unknown',
    }, context);
    throw error;
  }
};
