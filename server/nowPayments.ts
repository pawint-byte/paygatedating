import crypto from 'crypto';

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';

interface CreateInvoiceParams {
  priceAmount: number;
  priceCurrency: string;
  orderId: string;
  orderDescription: string;
  successUrl: string;
  cancelUrl?: string;
  ipnCallbackUrl: string;
}

interface InvoiceResponse {
  id: string;
  token_id: string;
  order_id: string;
  order_description: string;
  price_amount: string;
  price_currency: string;
  invoice_url: string;
  success_url: string;
  cancel_url: string | null;
  created_at: string;
  updated_at: string;
}

interface PaymentStatus {
  payment_id: number;
  invoice_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  created_at: string;
  updated_at: string;
  outcome_amount: number;
  outcome_currency: string;
}

class NowPaymentsService {
  private apiKey: string | null = null;
  private ipnSecret: string | null = null;

  constructor() {
    this.apiKey = process.env.NOWPAYMENTS_API_KEY || null;
    this.ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET || null;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async createInvoice(params: CreateInvoiceParams): Promise<InvoiceResponse> {
    if (!this.apiKey) {
      throw new Error('NOWPayments API key not configured');
    }

    const response = await fetch(`${NOWPAYMENTS_API_URL}/invoice`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: params.priceAmount,
        price_currency: params.priceCurrency,
        order_id: params.orderId,
        order_description: params.orderDescription,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        ipn_callback_url: params.ipnCallbackUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('NOWPayments API error:', error);
      throw new Error(`Failed to create invoice: ${response.status}`);
    }

    return response.json();
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    if (!this.apiKey) {
      throw new Error('NOWPayments API key not configured');
    }

    const response = await fetch(`${NOWPAYMENTS_API_URL}/payment/${paymentId}`, {
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get payment status: ${response.status}`);
    }

    return response.json();
  }

  async getMinimumPaymentAmount(currencyFrom: string, currencyTo: string = 'usd'): Promise<{ min_amount: number }> {
    if (!this.apiKey) {
      throw new Error('NOWPayments API key not configured');
    }

    const response = await fetch(
      `${NOWPAYMENTS_API_URL}/min-amount?currency_from=${currencyFrom}&currency_to=${currencyTo}`,
      {
        headers: {
          'x-api-key': this.apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get minimum amount: ${response.status}`);
    }

    return response.json();
  }

  async getAvailableCurrencies(): Promise<{ currencies: string[] }> {
    if (!this.apiKey) {
      throw new Error('NOWPayments API key not configured');
    }

    const response = await fetch(`${NOWPAYMENTS_API_URL}/currencies`, {
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get currencies: ${response.status}`);
    }

    return response.json();
  }

  hasIpnSecret(): boolean {
    return !!this.ipnSecret;
  }

  verifyIpnSignature(body: Record<string, any>, signature: string): boolean {
    if (!this.ipnSecret) {
      console.error('IPN secret not configured - rejecting webhook for security');
      return false;
    }

    if (!signature) {
      console.error('No signature provided in webhook');
      return false;
    }

    const sortedParams = Object.keys(body)
      .sort()
      .reduce((result: Record<string, any>, key) => {
        result[key] = body[key];
        return result;
      }, {});

    const hmac = crypto.createHmac('sha512', this.ipnSecret);
    hmac.update(JSON.stringify(sortedParams));
    const calculatedSignature = hmac.digest('hex');

    return signature === calculatedSignature;
  }
}

export const nowPaymentsService = new NowPaymentsService();
