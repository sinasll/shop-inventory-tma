import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const API_BASE = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

export interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * Minimal, dependency-free Telegram Bot API client using global fetch
 * (Node 20+). Used by the notification engine and admin test sends.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { parseMode?: 'HTML' | 'MarkdownV2'; disablePreview?: boolean },
): Promise<SendResult> {
  try {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode,
        disable_web_page_preview: options?.disablePreview ?? true,
      }),
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      logger.warn({ chatId, description: data.description }, 'Telegram send failed');
      return { ok: false, error: data.description };
    }
    return { ok: true };
  } catch (err) {
    logger.error({ err, chatId }, 'Telegram send error');
    return { ok: false, error: (err as Error).message };
  }
}
