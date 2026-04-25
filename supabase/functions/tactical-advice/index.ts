type BallLandingLine = 'leg' | 'middle' | 'off' | 'wide_off';
type BallLandingLength = 'yorker' | 'full' | 'good_length' | 'short';
type TacticalIntent = 'attacking' | 'balanced' | 'defensive';

type TacticalAdviceRequest = {
  batterHand?: 'right' | 'left';
  bowlingType?: 'pace' | 'spin';
  intent?: TacticalIntent;
  line?: BallLandingLine;
  length?: BallLandingLength;
  selectedBall?: {
    x?: number;
    y?: number;
  };
  currentFieldSummary?: string;
  currentFielders?: Array<{
    id?: string;
    label?: string;
    role?: string;
    x?: number;
    y?: number;
    name?: string;
  }>;
  format?: 'test' | 'odi' | 't20';
  phase?: 'none' | '1-6' | '7-20' | '1-10' | '11-40' | '41-50';
};

type TacticalAdviceResponse = {
  title: string;
  summary: string;
  tacticalReasoning: string;
  suggestedFielders: Array<{
    role: string;
    area: string;
    reason: string;
  }>;
  riskAreas: string[];
  variants: Array<{
    name: string;
    summary: string;
  }>;
  ghostFielders?: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    role?: string;
  }>;
  source?: 'edge' | 'fallback';
};

type NormalizedTacticalAdviceRequest = Required<Pick<TacticalAdviceRequest, 'intent' | 'line' | 'length'>> &
  TacticalAdviceRequest;

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

type ErrorResponse = {
  error: string;
  code: string;
  details?: string;
  requestId: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function errorResponse(
  requestId: string,
  status: number,
  error: string,
  code: string,
  details?: string
) {
  return jsonResponse(
    {
      error,
      code,
      details,
      requestId,
    } satisfies ErrorResponse,
    status
  );
}

function clamp(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0.5;
  }

  return Math.min(Math.max(value, 0), 1);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isTacticalIntent(value: unknown): value is TacticalIntent {
  return value === 'attacking' || value === 'balanced' || value === 'defensive';
}

function isBallLandingLine(value: unknown): value is BallLandingLine {
  return value === 'leg' || value === 'middle' || value === 'off' || value === 'wide_off';
}

function isBallLandingLength(value: unknown): value is BallLandingLength {
  return value === 'yorker' || value === 'full' || value === 'good_length' || value === 'short';
}

function isBatterHand(value: unknown): value is 'right' | 'left' {
  return value === 'right' || value === 'left';
}

function summarizePayloadForLogs(payload: TacticalAdviceRequest) {
  return {
    batterHand: payload.batterHand ?? null,
    bowlingType: payload.bowlingType ?? null,
    intent: payload.intent ?? null,
    line: payload.line ?? null,
    length: payload.length ?? null,
    hasSelectedBall:
      typeof payload.selectedBall?.x === 'number' && typeof payload.selectedBall?.y === 'number',
    fieldSummaryLength: payload.currentFieldSummary?.length ?? 0,
    fieldersCount: Array.isArray(payload.currentFielders) ? payload.currentFielders.length : 0,
    format: payload.format ?? null,
    phase: payload.phase ?? null,
  };
}

function validateAndNormalizeRequest(payload: unknown) {
  if (!isObject(payload)) {
    return {
      ok: false as const,
      error: 'Request body must be a JSON object.',
      details: 'Expected a structured tactical advice payload.',
    };
  }

  if (!isBallLandingLine(payload.line)) {
    return {
      ok: false as const,
      error: 'Missing or invalid delivery line.',
      details: 'Expected one of: leg, middle, off, wide_off.',
    };
  }

  if (!isBallLandingLength(payload.length)) {
    return {
      ok: false as const,
      error: 'Missing or invalid delivery length.',
      details: 'Expected one of: yorker, full, good_length, short.',
    };
  }

  if (!isTacticalIntent(payload.intent)) {
    return {
      ok: false as const,
      error: 'Missing or invalid tactical intent.',
      details: 'Expected one of: attacking, balanced, defensive.',
    };
  }

  if (!isObject(payload.selectedBall)) {
    return {
      ok: false as const,
      error: 'Missing delivery point coordinates.',
      details: 'selectedBall.x and selectedBall.y are required.',
    };
  }

  if (
    typeof payload.selectedBall.x !== 'number' ||
    Number.isNaN(payload.selectedBall.x) ||
    typeof payload.selectedBall.y !== 'number' ||
    Number.isNaN(payload.selectedBall.y)
  ) {
    return {
      ok: false as const,
      error: 'Invalid delivery point coordinates.',
      details: 'selectedBall.x and selectedBall.y must be numbers.',
    };
  }

  if (payload.batterHand !== undefined && !isBatterHand(payload.batterHand)) {
    return {
      ok: false as const,
      error: 'Invalid batter handedness.',
      details: 'Expected batterHand to be right or left.',
    };
  }

  const normalized: NormalizedTacticalAdviceRequest = {
    ...(payload as TacticalAdviceRequest),
    batterHand: isBatterHand(payload.batterHand) ? payload.batterHand : 'right',
    intent: payload.intent,
    line: payload.line,
    length: payload.length,
    selectedBall: {
      x: clamp(payload.selectedBall.x),
      y: clamp(payload.selectedBall.y),
    },
  };

  return {
    ok: true as const,
    payload: normalized,
  };
}

function createGhostFielders(
  entries: Array<{ label: string; x: number; y: number; role?: string }>
) {
  return entries.map((entry, index) => ({
    id: `ghost-${index}-${entry.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    label: entry.label,
    x: clamp(entry.x),
    y: clamp(entry.y),
    role: entry.role,
  }));
}

function buildFallbackAdvice(payload: NormalizedTacticalAdviceRequest): TacticalAdviceResponse {
  const lineLabel =
    payload.line === 'leg'
      ? 'leg-side line'
      : payload.line === 'middle'
        ? 'middle-stump line'
        : payload.line === 'off'
          ? 'off-stump line'
          : 'wide outside off';
  const lengthLabel =
    payload.length === 'yorker'
      ? 'yorker'
      : payload.length === 'full'
        ? 'full'
        : payload.length === 'good_length'
          ? 'good length'
          : 'short';

  const suggestedFielders =
    payload.line === 'leg'
      ? [
          {
            role: 'Square leg',
            area: payload.length === 'short' ? 'Backward square leg' : 'Square leg',
            reason: 'Takes away the most natural pick-up and swivel scoring lane on the leg side.',
          },
          {
            role: 'Fine leg',
            area: payload.length === 'short' ? 'Fine to deep fine leg' : 'Fine leg',
            reason: 'Covers gloves, top edges, and any glance that runs finer than square.',
          },
          {
            role: 'Midwicket cover',
            area: payload.intent === 'attacking' ? 'Short midwicket' : 'Deep backward square',
            reason: 'Lets the field either hunt the miscued clip or protect the release boundary.',
          },
        ]
      : payload.line === 'wide_off'
        ? [
            {
              role: 'Third man',
              area: 'Open third man',
              reason: 'Collects the late slice or edge when the batter reaches away from the body.',
            },
            {
              role: 'Point',
              area: 'Backward point',
              reason: 'Cuts off the square release if the ball is not quite wide enough.',
            },
            {
              role: 'Deep off-side rider',
              area: 'Deep point or deep cover',
              reason: 'Protects the carve over the off side if the batter frees the hands.',
            },
          ]
        : payload.length === 'yorker' || payload.length === 'full'
          ? [
              {
                role: 'Mid-off',
                area: 'Straightish mid-off',
                reason: 'Shuts down the checked drive when the batter digs the ball out.',
              },
              {
                role: 'Mid-on',
                area: 'Mid-on',
                reason: 'Protects the on-drive if the batter closes the face through the line.',
              },
              {
                role: 'Point / short third',
                area: payload.line === 'off' ? 'Backward point' : 'Short extra cover',
                reason: 'Stops the late deflection or inside-out release ball.',
              },
            ]
          : [
              {
                role: 'Slip support',
                area: payload.intent === 'attacking' ? 'Slip or wide slip' : 'Short third',
                reason: 'Keeps the edge in play when bowling a good length outside off.',
              },
              {
                role: 'Point',
                area: 'Point',
                reason: 'Closes the easy single and keeps pressure on the off-side lane.',
              },
              {
                role: 'Cover',
                area: 'Extra cover',
                reason: 'Protects the checked drive if the batter leans into the channel.',
              },
            ];

  const riskAreas =
    payload.line === 'leg'
      ? ['Deep backward square if the bowler drifts too straight', 'Fine leg if the bouncer sits up']
      : payload.line === 'wide_off'
        ? ['Extra cover if the ball comes back into the arc', 'Third man if width turns into a slash option']
        : payload.length === 'short'
          ? ['Square boundary if the ball sits up', 'Single into cover-point if the ring is passive']
          : ['Straight down the ground if the bowler misses too full', 'Square single if point or square leg is too deep'];

  const ghostFielders =
    payload.line === 'leg'
      ? createGhostFielders([
          { label: 'Square Leg', x: 0.32, y: 0.64, role: 'ring' },
          { label: 'Fine Leg', x: 0.44, y: 0.82, role: 'boundary' },
          {
            label: payload.intent === 'attacking' ? 'Short Midwicket' : 'Deep Square',
            x: payload.intent === 'attacking' ? 0.36 : 0.22,
            y: payload.intent === 'attacking' ? 0.57 : 0.74,
            role: payload.intent === 'attacking' ? 'catching' : 'boundary',
          },
        ])
      : payload.line === 'wide_off'
        ? createGhostFielders([
            { label: 'Third Man', x: 0.85, y: 0.28, role: 'boundary' },
            { label: 'Point', x: 0.69, y: 0.46, role: 'ring' },
            { label: 'Deep Point', x: 0.82, y: 0.36, role: 'boundary' },
          ])
        : payload.length === 'yorker' || payload.length === 'full'
          ? createGhostFielders([
              { label: 'Mid Off', x: 0.56, y: 0.6, role: 'ring' },
              { label: 'Mid On', x: 0.44, y: 0.6, role: 'ring' },
              { label: payload.line === 'off' ? 'Point' : 'Short Midwicket', x: payload.line === 'off' ? 0.69 : 0.35, y: 0.56, role: 'ring' },
            ])
          : createGhostFielders([
              { label: 'Slip', x: 0.58, y: 0.32, role: 'catching' },
              { label: 'Point', x: 0.7, y: 0.46, role: 'ring' },
              { label: 'Cover', x: 0.65, y: 0.6, role: 'ring' },
            ]);

  return {
    title: `${payload.intent === 'attacking' ? 'Attacking' : payload.intent === 'defensive' ? 'Defensive' : 'Balanced'} ${lengthLabel} ${lineLabel} plan`,
    summary: `Use ${lengthLabel} on ${lineLabel} to shape the scoring side first, then let the ring and one boundary rider squeeze the release shot.`,
    tacticalReasoning: payload.currentFieldSummary
      ? `Current field check: ${payload.currentFieldSummary} Keep the bowler in the same corridor long enough for this shape to create pressure instead of treating it as a one-ball change-up.`
      : `Keep the field aligned to the intended lane so the batter sees the same pressure picture for at least two deliveries.`,
    suggestedFielders,
    riskAreas,
    variants: [
      {
        name: 'Safer variant',
        summary: 'Push one catcher into a deeper saving role if the batter is already set and you want to protect the release boundary.',
      },
      {
        name: 'Wicket ball variant',
        summary: 'Bring one ring fielder slightly closer to the likely mistimed contact area if the bowler is executing well.',
      },
    ],
    ghostFielders,
    source: 'fallback',
  };
}

function getPrompt(payload: NormalizedTacticalAdviceRequest) {
  return [
    'You are a cricket tactical assistant for a field-setting app.',
    'Return valid JSON only.',
    'Prioritize field-setting advice over generic coaching.',
    'Vary the advice based on line, length, intent, bowling type, format, phase, and current field context.',
    'Use concise natural cricket terminology.',
    'Do not pretend certainty when context is limited.',
    'Return this exact JSON shape:',
    JSON.stringify(
      {
        title: 'string',
        summary: 'string',
        tacticalReasoning: 'string',
        suggestedFielders: [
          { role: 'string', area: 'string', reason: 'string' },
          { role: 'string', area: 'string', reason: 'string' },
        ],
        riskAreas: ['string'],
        variants: [{ name: 'string', summary: 'string' }],
        ghostFielders: [{ id: 'string', label: 'string', x: 0.5, y: 0.5, role: 'string' }],
      },
      null,
      2
    ),
    'Keep ghostFielders to at most 4 entries with normalized x/y values between 0 and 1.',
    `Request context: ${JSON.stringify(payload)}`,
  ].join('\n');
}

function normalizeAdviceResponse(value: unknown): TacticalAdviceResponse | null {
  if (!value || typeof value !== 'object') {
    console.log('[tactical-advice] invalid AI response: expected object', value);
    return null;
  }

  const response = value as Record<string, unknown>;
  const title =
    typeof response.title === 'string' && response.title.trim() ? response.title.trim() : 'Tactical Advice';
  const summary =
    typeof response.summary === 'string' && response.summary.trim()
      ? response.summary.trim()
      : typeof response.tacticalSummary === 'string' && response.tacticalSummary.trim()
        ? response.tacticalSummary.trim()
        : typeof response.tactical_summary === 'string' && response.tactical_summary.trim()
          ? response.tactical_summary.trim()
          : '';
  const tacticalReasoning =
    typeof response.tacticalReasoning === 'string' && response.tacticalReasoning.trim()
      ? response.tacticalReasoning.trim()
      : typeof response.reasoning === 'string' && response.reasoning.trim()
        ? response.reasoning.trim()
        : summary;

  const suggestedFielders = (Array.isArray(response.suggestedFielders) ? response.suggestedFielders : [])
    .filter(
      (entry) =>
        entry &&
        typeof entry.role === 'string' &&
        typeof entry.area === 'string' &&
        typeof entry.reason === 'string'
    )
    .map((entry) => ({
      role: entry.role.trim(),
      area: entry.area.trim(),
      reason: entry.reason.trim(),
    }))
    .filter((entry) => entry.role && entry.area && entry.reason);

  if (!summary || !tacticalReasoning) {
    console.log('[tactical-advice] invalid AI response: missing summary/reasoning', {
      keys: Object.keys(response),
      hasTitle: Boolean(title),
      hasSummary: Boolean(summary),
      hasTacticalReasoning: Boolean(tacticalReasoning),
      suggestedFieldersCount: suggestedFielders.length,
    });
    return null;
  }

  const riskAreaSource = Array.isArray(response.riskAreas)
    ? response.riskAreas
    : Array.isArray(response.risks)
      ? response.risks
      : [];
  const variantSource = Array.isArray(response.variants)
    ? response.variants
    : Array.isArray(response.variations)
      ? response.variations
      : [];
  const ghostFieldersSource = Array.isArray(response.ghostFielders) ? response.ghostFielders : [];
  const source: TacticalAdviceResponse['source'] = 'edge';

  const normalized: TacticalAdviceResponse = {
    title,
    summary,
    tacticalReasoning,
    suggestedFielders,
    riskAreas: riskAreaSource.filter(
      (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
    ),
    variants: variantSource
      .filter(
        (entry): entry is { name: string; summary: string } =>
          Boolean(
            entry &&
              typeof entry === 'object' &&
              'name' in entry &&
              'summary' in entry &&
              typeof entry.name === 'string' &&
              typeof entry.summary === 'string' &&
              entry.name.trim() &&
              entry.summary.trim()
          )
      )
      .map((entry) => ({
        name: entry.name.trim(),
        summary: entry.summary.trim(),
      })),
    ghostFielders: ghostFieldersSource
      .filter(
        (
          entry
        ): entry is { id?: string; label: string; x: number; y: number; role?: string } =>
          Boolean(
            entry &&
              typeof entry === 'object' &&
              'label' in entry &&
              'x' in entry &&
              'y' in entry &&
              typeof entry.label === 'string' &&
              typeof entry.x === 'number' &&
              typeof entry.y === 'number'
          )
      )
      .map((entry, index) => ({
        id:
          typeof entry.id === 'string' && entry.id.trim()
            ? entry.id.trim()
            : `ghost-${index}-${entry.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label: entry.label.trim(),
        x: clamp(entry.x),
        y: clamp(entry.y),
        role: typeof entry.role === 'string' && entry.role.trim() ? entry.role.trim() : undefined,
      })),
    source,
  };

  console.log('[tactical-advice] normalized AI response', {
    keys: Object.keys(response),
    title: normalized.title,
    suggestedFieldersCount: normalized.suggestedFielders.length,
    riskAreasCount: normalized.riskAreas.length,
    variantsCount: normalized.variants.length,
  });

  return normalized;
}

async function generateAiAdvice(payload: NormalizedTacticalAdviceRequest, requestId: string) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';

  if (!apiKey) {
    console.log(`[tactical-advice][${requestId}] Missing OPENAI_API_KEY`);
    throw new Error('AI provider API key is missing.');
  }

  console.log(`[tactical-advice][${requestId}] API key available: true`);
  console.log(`[tactical-advice][${requestId}] Starting AI provider request with model: ${model}`);

  let response: Response;

  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a cricket tactical assistant that returns only structured JSON for field setting advice.',
          },
          {
            role: 'user',
            content: getPrompt(payload),
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    console.log(`[tactical-advice][${requestId}] AI provider request threw`, error);
    throw new Error('AI provider request failed before a response was received.');
  }

  console.log(
    `[tactical-advice][${requestId}] AI provider responded with status ${response.status}`
  );

  if (!response.ok) {
    const providerErrorText = await response.text();
    console.log(
      `[tactical-advice][${requestId}] AI provider error body: ${providerErrorText.slice(0, 1200)}`
    );
    throw new Error(`AI provider returned status ${response.status}.`);
  }

  let json: any;

  try {
    json = await response.json();
  } catch (error) {
    console.log(`[tactical-advice][${requestId}] Failed to parse AI provider JSON`, error);
    throw new Error('AI provider returned an unreadable response.');
  }

  const content = json?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    console.log(`[tactical-advice][${requestId}] Missing AI message content`);
    throw new Error('AI provider returned an empty response.');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.log(`[tactical-advice][${requestId}] Invalid JSON from AI provider`, error);
    throw new Error('AI provider returned invalid JSON content.');
  }

  const normalized = normalizeAdviceResponse(parsed);

  if (!normalized) {
    console.log(`[tactical-advice][${requestId}] AI response shape was invalid`, parsed);
    throw new Error('AI provider returned an invalid tactical advice payload.');
  }

  return normalized;
}

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID();

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    console.log(`[tactical-advice][${requestId}] Unsupported method: ${request.method}`);
    return errorResponse(
      requestId,
      400,
      'Unsupported request method.',
      'BAD_METHOD',
      'Use POST for tactical advice requests.'
    );
  }

  try {
    console.log(`[tactical-advice][${requestId}] Request received`);

    let rawPayload: unknown;

    try {
      rawPayload = await request.json();
    } catch (error) {
      console.log(`[tactical-advice][${requestId}] Failed to parse request JSON`, error);
      return errorResponse(
        requestId,
        400,
        'Invalid JSON request body.',
        'INVALID_JSON',
        'Make sure the AI request payload is valid JSON.'
      );
    }

    const validation = validateAndNormalizeRequest(rawPayload);

    if (!validation.ok) {
      console.log(`[tactical-advice][${requestId}] Invalid request payload`, rawPayload);
      return errorResponse(
        requestId,
        400,
        validation.error,
        'INVALID_REQUEST',
        validation.details
      );
    }

    console.log(
      `[tactical-advice][${requestId}] Validated payload`,
      summarizePayloadForLogs(validation.payload)
    );

    const advice = await generateAiAdvice(validation.payload, requestId);
    console.log(`[tactical-advice][${requestId}] Returning successful tactical advice`);
    return jsonResponse(advice);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to generate tactical advice right now.';
    console.log(`[tactical-advice][${requestId}] Request failed`, error);
    return errorResponse(
      requestId,
      500,
      'Unable to generate tactical advice right now.',
      'INTERNAL_ERROR',
      message
    );
  }
});
