import { createHmac, timingSafeEqual, randomUUID } from "crypto"

/**
 * Verify MoonPay webhook signature using timing-safe comparison.
 * MoonPay signs webhooks with HMAC-SHA256, base64 encoded.
 */
export function verifyMoonPaySignature(
  body: string,
  signature: string,
  secret: string = process.env.MOONPAY_WEBHOOK_SECRET || ""
): boolean {
  if (!secret || !signature) return false

  try {
    const expected = createHmac("sha256", secret).update(body).digest()
    const actual = Buffer.from(signature, "base64")

    if (expected.length !== actual.length) return false
    return timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

/**
 * Generate a signed MoonPay widget URL for a payment session.
 */
export function buildMoonPayWidgetUrl(params: {
  sessionId: string
  walletAddress: string
  baseCurrencyAmount: number
  baseCurrencyCode?: string
  currencyCode?: string
  email?: string
}): string {
  const apiKey = process.env.MOONPAY_API_KEY
  const secretKey = process.env.MOONPAY_SECRET_KEY

  if (!apiKey || !secretKey) {
    throw new Error("MOONPAY_API_KEY and MOONPAY_SECRET_KEY must be set")
  }

  const baseUrl = process.env.MOONPAY_ENV === "production"
    ? "https://buy.moonpay.com"
    : "https://buy-sandbox.moonpay.com"

  const queryParams = new URLSearchParams({
    apiKey,
    currencyCode: params.currencyCode || "eth",
    baseCurrencyCode: params.baseCurrencyCode || "usd",
    baseCurrencyAmount: params.baseCurrencyAmount.toString(),
    walletAddress: params.walletAddress,
    externalTransactionId: params.sessionId,
    redirectURL: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
  })

  if (params.email) {
    queryParams.set("email", params.email)
  }

  // Sign the original URL (before encoding)
  // MoonPay docs: sign the full URL path + query string with HMAC-SHA256, base64 encode
  const originalUrl = `?${queryParams.toString()}`
  const signature = createHmac("sha256", secretKey)
    .update(originalUrl)
    .digest("base64")

  // Signature must be URL-encoded since base64 contains +, /, =
  return `${baseUrl}${originalUrl}&signature=${encodeURIComponent(signature)}`
}

/**
 * Generate a unique payment session ID.
 */
export function generatePaymentSessionId(): string {
  return `ps_${randomUUID().replace(/-/g, "")}`
}

/**
 * MoonPay webhook event types we care about.
 */
export type MoonPayEventType =
  | "transaction_completed"
  | "transaction_failed"
  | "transaction_cancelled"

/**
 * Parsed MoonPay webhook event data.
 */
export interface MoonPayWebhookEvent {
  type: MoonPayEventType
  data: {
    id: string
    externalTransactionId: string
    walletAddress: string
    quoteCurrencyAmount: number
    baseCurrencyAmount: number
    cryptoTransactionId?: string
    failureReason?: string
    status: string
  }
}

/**
 * Parse and validate a MoonPay webhook body.
 */
export function parseMoonPayWebhook(body: string): MoonPayWebhookEvent {
  const event = JSON.parse(body)

  if (!event.type || !event.data) {
    throw new Error("Invalid webhook payload: missing type or data")
  }

  return event as MoonPayWebhookEvent
}
