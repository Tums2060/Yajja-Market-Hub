import { logger } from "./logger";

const env = process.env;

export const mpesaConfig = {
  consumerKey: env.MPESA_CONSUMER_KEY || "",
  consumerSecret: env.MPESA_CONSUMER_SECRET || "",
  shortcode: env.MPESA_SHORTCODE || "",
  passkey: env.MPESA_PASSKEY || "",
  environment: (env.MPESA_ENV || "sandbox").toLowerCase(),
  callbackUrl: env.MPESA_CALLBACK_URL || "",
  commissionRate: Number(env.MPESA_COMMISSION_RATE || "0.15"),
};

/**
 * Returns true only when all four core Daraja credentials are present.
 * When false, the payment flow falls back to a local simulation so the app
 * remains fully usable in development without any keys.
 */
export function isMpesaConfigured(): boolean {
  return Boolean(
    mpesaConfig.consumerKey &&
      mpesaConfig.consumerSecret &&
      mpesaConfig.shortcode &&
      mpesaConfig.passkey,
  );
}

function baseUrl(): string {
  return mpesaConfig.environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

/** Normalise a Kenyan phone number into the 2547XXXXXXXX / 2541XXXXXXXX form. */
export function normalizePhone(input: string): string {
  let p = (input || "").replace(/[^0-9]/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  else if (p.startsWith("7") || p.startsWith("1")) p = "254" + p;
  else if (p.startsWith("254")) {
    /* already normalised */
  }
  return p;
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export function generatePassword(ts: string): string {
  return Buffer.from(
    mpesaConfig.shortcode + mpesaConfig.passkey + ts,
  ).toString("base64");
}

/**
 * Resolve the public callback URL. Prefer the explicit MPESA_CALLBACK_URL,
 * otherwise derive it from the Replit domain so it works out of the box.
 */
export function resolveCallbackUrl(): string {
  if (mpesaConfig.callbackUrl) return mpesaConfig.callbackUrl;
  const domains = (env.REPLIT_DOMAINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const host = domains[0] || env.REPLIT_DEV_DOMAIN || "";
  return host ? `https://${host}/api/payments/callback` : "";
}

export async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`,
  ).toString("base64");
  const res = await fetch(
    `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Daraja OAuth failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export interface StkPushParams {
  phone: string;
  amount: number;
  accountReference: string;
  description: string;
  callbackUrl: string;
}

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export async function stkPush(params: StkPushParams): Promise<StkPushResult> {
  const token = await getAccessToken();
  const ts = timestamp();
  const password = generatePassword(ts);
  const phone = normalizePhone(params.phone);

  const body = {
    BusinessShortCode: mpesaConfig.shortcode,
    Password: password,
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.max(1, Math.round(params.amount)),
    PartyA: phone,
    PartyB: mpesaConfig.shortcode,
    PhoneNumber: phone,
    CallBackURL: params.callbackUrl,
    AccountReference: params.accountReference.slice(0, 12),
    TransactionDesc: params.description.slice(0, 13),
  };

  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as Record<string, string>;
  if (!res.ok || data.errorCode || data.ResponseCode !== "0") {
    logger.error({ data }, "Daraja STK push failed");
    throw new Error(`STK push failed: ${data.errorMessage || data.ResponseDescription || res.status}`);
  }
  return {
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription,
    customerMessage: data.CustomerMessage,
  };
}
