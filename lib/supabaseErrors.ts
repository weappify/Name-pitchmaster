export const DATABASE_SETUP_INCOMPLETE_MESSAGE =
  'Database setup incomplete. Please create the Supabase tables.';

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      code: undefined,
      message: error.message,
    };
  }

  if (error && typeof error === 'object') {
    const nextError = error as SupabaseLikeError;
    return {
      code: typeof nextError.code === 'string' ? nextError.code : undefined,
      message: typeof nextError.message === 'string' ? nextError.message : undefined,
    };
  }

  return {
    code: undefined,
    message: undefined,
  };
}

export function isMissingSupabaseTableError(error: unknown) {
  const { code, message } = getErrorDetails(error);
  const normalizedMessage = message?.toLowerCase() ?? '';

  return (
    code === 'PGRST205' ||
    normalizedMessage.includes('could not find the table') ||
    normalizedMessage.includes('schema cache') ||
    (normalizedMessage.includes('relation') && normalizedMessage.includes('does not exist'))
  );
}

export function getFriendlySupabaseErrorMessage(error: unknown, fallbackMessage: string) {
  if (isMissingSupabaseTableError(error)) {
    return DATABASE_SETUP_INCOMPLETE_MESSAGE;
  }

  const { message } = getErrorDetails(error);
  return message || fallbackMessage;
}
