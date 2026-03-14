/**
 * Détecte si une erreur OpenAI correspond à un dépassement de quota (429).
 */
export function isOpenAIQuotaExceeded(error: unknown): boolean {
  const err = error as {
    status?: number;
    statusCode?: number;
    message?: string;
    code?: string;
    data?: { error?: { code?: string; type?: string } };
    cause?: { status?: number; statusCode?: number; message?: string };
  };
  const msg = `${err?.message || ''} ${err?.cause?.message || ''}`.toLowerCase();
  return (
    err?.status === 429 ||
    err?.statusCode === 429 ||
    err?.cause?.status === 429 ||
    err?.cause?.statusCode === 429 ||
    err?.data?.error?.code === 'insufficient_quota' ||
    err?.data?.error?.type === 'insufficient_quota' ||
    msg.includes('quota') ||
    msg.includes('exceeded') ||
    msg.includes('429')
  );
}

export function canUseClaudeFallback(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
