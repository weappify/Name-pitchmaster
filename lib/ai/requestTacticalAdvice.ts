import type {
  GhostFielder,
  TacticalAdviceFielder,
  TacticalAdviceRequest,
  TacticalAdviceResponse,
  TacticalAdviceVariant,
} from './types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
const TACTICAL_ADVICE_FUNCTION_NAME =
  process.env.EXPO_PUBLIC_TACTICAL_ADVICE_FUNCTION_NAME?.trim() || 'tactical-advice';

type FunctionErrorLike = {
  message?: string;
  context?: {
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
    status?: number;
    statusText?: string;
  };
};

function buildFunctionUrl(functionName: string) {
  return `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/${functionName}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeSuggestedFielders(value: unknown): TacticalAdviceFielder[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const role = isNonEmptyString((entry as { role?: unknown }).role)
        ? (entry as { role: string }).role.trim()
        : '';
      const area = isNonEmptyString((entry as { area?: unknown }).area)
        ? (entry as { area: string }).area.trim()
        : '';
      const reason = isNonEmptyString((entry as { reason?: unknown }).reason)
        ? (entry as { reason: string }).reason.trim()
        : '';

      if (!role || !area || !reason) {
        return null;
      }

      return { role, area, reason };
    })
    .filter((entry): entry is TacticalAdviceFielder => entry !== null);
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isNonEmptyString).map((entry) => entry.trim());
}

function normalizeVariants(value: unknown): TacticalAdviceVariant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const name = isNonEmptyString((entry as { name?: unknown }).name)
        ? (entry as { name: string }).name.trim()
        : '';
      const summary = isNonEmptyString((entry as { summary?: unknown }).summary)
        ? (entry as { summary: string }).summary.trim()
        : '';

      if (!name || !summary) {
        return null;
      }

      return { name, summary };
    })
    .filter((entry): entry is TacticalAdviceVariant => entry !== null);
}

function clamp(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0.5;
  }

  return Math.min(Math.max(value, 0), 1);
}

function normalizeGhostFielders(value: unknown): GhostFielder[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map<GhostFielder | null>((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const label = isNonEmptyString((entry as { label?: unknown }).label)
        ? (entry as { label: string }).label.trim()
        : '';

      if (!label) {
        return null;
      }

      return {
        id:
          isNonEmptyString((entry as { id?: unknown }).id) && (entry as { id: string }).id.trim()
            ? (entry as { id: string }).id.trim()
            : `ghost-${index}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label,
        x: clamp((entry as { x?: unknown }).x),
        y: clamp((entry as { y?: unknown }).y),
        role: isNonEmptyString((entry as { role?: unknown }).role)
          ? (entry as { role: string }).role.trim()
          : undefined,
      };
    })
    .filter((entry): entry is GhostFielder => entry !== null);
}

function getTrimmedString(
  value: unknown,
  fallbackKeys: string[],
  source?: Record<string, unknown>
) {
  if (isNonEmptyString(value)) {
    return value.trim();
  }

  for (const key of fallbackKeys) {
    if (source && isNonEmptyString(source[key])) {
      return (source[key] as string).trim();
    }
  }

  return '';
}

function normalizeAdviceResponse(value: unknown): TacticalAdviceResponse | null {
  if (!value || typeof value !== 'object') {
    console.log('[AI] invalid response shape: expected object', value);
    return null;
  }

  const response = value as Record<string, unknown>;
  const summary = getTrimmedString(response.summary, ['tacticalSummary', 'tactical_summary'], response);
  const tacticalReasoning = getTrimmedString(
    response.tacticalReasoning,
    ['reasoning', 'tacticalSummary', 'tactical_summary'],
    response
  );
  const title = getTrimmedString(response.title, [], response) || 'Tactical Advice';
  const suggestedFielders = normalizeSuggestedFielders(
    response.suggestedFielders
  );
  const riskAreas = normalizeStringList(response.riskAreas ?? response.risks);
  const variants = normalizeVariants(response.variants ?? response.variations);
  const ghostFielders = normalizeGhostFielders(response.ghostFielders);
  const source: TacticalAdviceResponse['source'] = response.source === 'fallback' ? 'fallback' : 'edge';

  if (!summary || !tacticalReasoning) {
    console.log('[AI] invalid response shape: missing required advice fields', {
      keys: Object.keys(response),
      hasTitle: Boolean(title),
      hasSummary: Boolean(summary),
      hasTacticalReasoning: Boolean(tacticalReasoning),
      suggestedFieldersCount: suggestedFielders.length,
    });
    return null;
  }

  const normalized = {
    title,
    summary,
    tacticalReasoning,
    suggestedFielders,
    riskAreas,
    variants,
    ghostFielders,
    source,
  };

  console.log('[AI] normalized tactical advice shape', {
    keys: Object.keys(response),
    title: normalized.title,
    suggestedFieldersCount: normalized.suggestedFielders.length,
    riskAreasCount: normalized.riskAreas.length,
    variantsCount: normalized.variants.length,
  });

  return normalized;
}

async function extractFunctionErrorMessage(error: unknown) {
  const fallbackMessage = 'Unable to reach the tactical advice service.';
  const functionError = (error ?? null) as FunctionErrorLike | null;
  const responseStatus = functionError?.context?.status;

  if (functionError?.context?.json) {
    try {
      const payload = await functionError.context.json();

      if (payload && typeof payload === 'object') {
        const code =
          typeof (payload as { code?: unknown }).code === 'string'
            ? (payload as { code: string }).code
            : null;
        const errorMessage =
          typeof (payload as { error?: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : null;
        const providerMessage =
          typeof (payload as { message?: unknown }).message === 'string'
            ? (payload as { message: string }).message
            : null;
        const details =
          typeof (payload as { details?: unknown }).details === 'string'
            ? (payload as { details: string }).details
            : null;

        if (code === 'NOT_FOUND') {
          return `AI service is not deployed yet. Deploy the "${TACTICAL_ADVICE_FUNCTION_NAME}" Supabase Edge Function or update EXPO_PUBLIC_TACTICAL_ADVICE_FUNCTION_NAME.`;
        }

        const combinedMessage = [errorMessage, providerMessage, details].filter(isNonEmptyString).join(' ');

        if (
          responseStatus === 401 ||
          /missing authorization header|unauthorized|jwt/i.test(combinedMessage)
        ) {
          return `The "${TACTICAL_ADVICE_FUNCTION_NAME}" Edge Function is still enforcing JWT auth. Redeploy it as public with: supabase functions deploy ${TACTICAL_ADVICE_FUNCTION_NAME} --no-verify-jwt`;
        }

        if (errorMessage && details) {
          return `${errorMessage} ${details}`.trim();
        }

        if (errorMessage) {
          return errorMessage;
        }

        if (providerMessage) {
          return providerMessage;
        }
      }
    } catch {
      // fall through to other parsing
    }
  }

  if (functionError?.context?.text) {
    try {
      const text = await functionError.context.text();

      if (typeof text === 'string' && text.trim()) {
        if (
          responseStatus === 401 ||
          /missing authorization header|unauthorized|jwt/i.test(text)
        ) {
          return `The "${TACTICAL_ADVICE_FUNCTION_NAME}" Edge Function is still enforcing JWT auth. Redeploy it as public with: supabase functions deploy ${TACTICAL_ADVICE_FUNCTION_NAME} --no-verify-jwt`;
        }

        return text.trim();
      }
    } catch {
      // ignore and fall back
    }
  }

  if (typeof functionError?.message === 'string' && functionError.message.trim()) {
    return functionError.message.trim();
  }

  return fallbackMessage;
}

export async function requestTacticalAdvice(payload: TacticalAdviceRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('AI analysis is unavailable because Supabase is not configured.');
  }

  const functionUrl = buildFunctionUrl(TACTICAL_ADVICE_FUNCTION_NAME);

  console.log('[AI] invoking edge function', TACTICAL_ADVICE_FUNCTION_NAME, {
    url: functionUrl,
    batterHand: payload.batterHand ?? null,
    bowlingType: payload.bowlingType ?? null,
    format: payload.format ?? null,
    phase: payload.phase ?? null,
    intent: payload.intent,
    line: payload.line,
    length: payload.length,
    hasSelectedBall:
      typeof payload.selectedBall?.x === 'number' && typeof payload.selectedBall?.y === 'number',
    currentFieldersCount: payload.currentFielders?.length ?? 0,
  });

  let response: Response;

  try {
    response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.log('[AI] edge function network request failed', error);
    throw new Error(await extractFunctionErrorMessage(error));
  }

  const errorResponse = response.clone();
  const responseText = await response.text();
  let data: unknown = null;

  if (responseText.trim()) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  console.log('[AI] edge function response received', TACTICAL_ADVICE_FUNCTION_NAME, {
    status: response.status,
    ok: response.ok,
    hasData: data !== null && data !== undefined,
  });

  if (!response.ok) {
    console.log('[AI] edge function returned error payload', data);
    throw new Error(
      await extractFunctionErrorMessage({ message: response.statusText, context: errorResponse })
    );
  }

  const normalized = normalizeAdviceResponse(data);

  if (!normalized) {
    console.log('[AI] edge function returned invalid response shape', data);
    throw new Error('The tactical advice service returned an invalid response.');
  }

  console.log('[AI] edge function response parsed', {
    title: normalized.title,
    source: normalized.source ?? 'edge',
    suggestedFielders: normalized.suggestedFielders.length,
  });

  return normalized;
}
