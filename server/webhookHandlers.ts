import { getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, webhookSecret: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error('Payload must be a Buffer');
    }

    const stripe = await getUncachableStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    console.log(`Processing Stripe webhook: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      
      if (session.metadata?.type === 'wallet_funding') {
        const userId = session.metadata.userId;
        const amount = parseInt(session.metadata.amount, 10);
        
        if (userId && amount) {
          try {
            const wallet = await storage.getWallet(userId);
            if (wallet) {
              const currentBalance = parseFloat(wallet.balance);
              const newBalance = (currentBalance + amount).toString();
              await storage.updateWalletBalance(userId, newBalance);
              await storage.createTransaction({
                walletId: wallet.id,
                type: 'deposit',
                amount: amount.toString(),
                description: `Added $${amount} to wallet via Stripe`,
              });
              console.log(`Wallet funded: $${amount} for user ${userId}`);
            }
          } catch (error) {
            console.error('Error processing wallet funding:', error);
          }
        }
      }
    }
  }
}
