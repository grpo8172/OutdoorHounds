import { ENV } from "./env";

type CachedToken = { accessToken: string; expiresAt: number };

let cachedToken: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  if (!ENV.paypalClientId || !ENV.paypalClientSecret) {
    throw new Error("PayPal credentials are not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)");
  }

  const basicAuth = Buffer.from(`${ENV.paypalClientId}:${ENV.paypalClientSecret}`).toString(
    "base64",
  );

  const res = await fetch(`${ENV.paypalApiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal token request failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    // Refresh a minute early so we never use a token that's about to expire mid-request.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.accessToken;
}

async function paypalFetch(path: string, init: RequestInit): Promise<any> {
  const accessToken = await getAccessToken();
  const res = await fetch(`${ENV.paypalApiBase}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`PayPal API error (${res.status} ${path}): ${JSON.stringify(data)}`);
  }
  return data;
}

export async function createPayPalOrder(params: {
  amountCents: number;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ orderId: string; approveUrl: string }> {
  const value = (params.amountCents / 100).toFixed(2);

  const order = await paypalFetch("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: params.currency, value },
        },
      ],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        user_action: "PAY_NOW",
      },
    }),
  });

  const approveUrl = order.links?.find((link: any) => link.rel === "approve")?.href;
  if (!approveUrl) {
    throw new Error("PayPal order response did not include an approval link");
  }

  return { orderId: order.id as string, approveUrl: approveUrl as string };
}

export async function capturePayPalOrder(orderId: string): Promise<{
  status: string;
  transactionId: string | null;
  amountCents: number | null;
  currency: string | null;
}> {
  const capture = await paypalFetch(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
  });

  const captureUnit = capture.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    status: capture.status as string,
    transactionId: captureUnit?.id ?? null,
    amountCents: captureUnit?.amount?.value
      ? Math.round(parseFloat(captureUnit.amount.value) * 100)
      : null,
    currency: captureUnit?.amount?.currency_code ?? null,
  };
}
