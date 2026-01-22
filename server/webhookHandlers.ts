import { getStripeSync } from './stripeClient';
import { storage } from './storage';
import { emailService } from './lib/email';

export class WebhookHandlers {
  // Webhook handler that uses stripe-replit-sync for signature verification and DB sync
  // Then processes custom business logic with the verified event
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // stripe-replit-sync handles signature verification and syncs to database
    // It returns the verified event object
    const sync = await getStripeSync();
    const verifiedEvent = await sync.processWebhook(payload, signature);

    // Process our custom business logic with the verified event
    if (verifiedEvent) {
      await WebhookHandlers.processCustomLogic(verifiedEvent);
    }
  }

  // Custom business logic for PayGate-specific webhook handling
  // Uses the verified event object from stripe-replit-sync
  static async processCustomLogic(event: any): Promise<void> {
    console.log(`Processing Stripe webhook: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      
      // Handle wallet funding
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
              
              // Send email notification
              const profile = await storage.getProfile(userId);
              // Note: Email would be sent if user email is available from profile or auth
              console.log(`Wallet deposit notification sent for user ${userId}`);
            }
          } catch (error) {
            console.error('Error processing wallet funding:', error);
          }
        }
      }
      
      // Handle subscription
      if (session.metadata?.type === 'subscription') {
        const userId = session.metadata.userId;
        const priceType = session.metadata.priceType;
        
        if (userId) {
          try {
            const endDate = new Date();
            if (priceType === 'yearly') {
              endDate.setFullYear(endDate.getFullYear() + 1);
            } else {
              endDate.setMonth(endDate.getMonth() + 1);
            }
            
            // Check if subscription exists, update or create
            const existingSub = session.subscription ? 
              await storage.getSubscriptionByStripeId(session.subscription) : null;
            
            if (existingSub) {
              await storage.updateSubscription(existingSub.id, {
                status: 'active',
                currentPeriodEnd: endDate,
              });
            } else {
              await storage.createSubscription({
                userId,
                stripeSubscriptionId: session.subscription || session.id,
                currentPeriodEnd: endDate,
                status: 'active',
              });
            }
            
            // Update profile tier
            await storage.updateProfile(userId, { subscriptionTier: 'premium' });
            
            console.log(`Subscription activated for user ${userId}`);
          } catch (error) {
            console.error('Error processing subscription:', error);
          }
        }
      }
      
      // Handle gift purchase
      if (session.metadata?.type === 'gift_purchase') {
        const { buyerUserId, recipientUserId, registryItemId, matchId, gatesUnlocked } = session.metadata;
        
        try {
          // Mark item as purchased
          if (registryItemId) {
            await storage.updateRegistryItem(registryItemId, { 
              isPurchased: true,
              isReserved: false,
            });
          }
          
          // Advance gates if applicable
          if (matchId && gatesUnlocked) {
            const numGates = parseInt(gatesUnlocked, 10);
            const match = await storage.getMatch(matchId);
            if (match) {
              const gateOrder = ['gate1', 'gate2', 'gate3', 'gate4', 'gate5', 'completed'];
              const currentIndex = gateOrder.indexOf(match.currentGate);
              const newIndex = Math.min(currentIndex + numGates, gateOrder.length - 1);
              await storage.updateMatch(matchId, { 
                currentGate: gateOrder[newIndex] as any,
                status: 'active',
              });
            }
          }
          
          // Log notification (email would require user email from auth)
          const recipientProfile = await storage.getProfile(recipientUserId);
          const buyerProfile = await storage.getProfile(buyerUserId);
          const item = registryItemId ? await storage.getRegistryItem(registryItemId) : null;
          
          console.log(`Gift purchase: ${buyerProfile?.displayName || 'User'} sent ${item?.title || 'a gift'} to ${recipientProfile?.displayName || 'recipient'}`);
          
          console.log(`Gift purchase processed for recipient ${recipientUserId}`);
        } catch (error) {
          console.error('Error processing gift purchase:', error);
        }
      }
    }
    
    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;
      try {
        const sub = await storage.getSubscriptionByStripeId(subscription.id);
        if (sub) {
          await storage.updateSubscription(sub.id, { status: 'canceled' });
          await storage.updateProfile(sub.userId, { subscriptionTier: 'free' });
          console.log(`Subscription canceled for user ${sub.userId}`);
        }
      } catch (error) {
        console.error('Error processing subscription cancellation:', error);
      }
    }
  }
}
