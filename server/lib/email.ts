// Email service using Resend integration
// Reusable pattern - copy this file to other apps

import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

// Get fresh Resend client (tokens expire, so always get fresh)
async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

// Email templates
const templates = {
  welcome: (firstName: string) => ({
    subject: 'Welcome to PayGate Dating!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">Welcome to PayGate Dating, ${firstName}!</h1>
        <p>We're excited to have you join our community of serious relationship seekers.</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Complete your profile to attract more matches</li>
          <li>Get verified to build trust with potential matches</li>
          <li>Add funds to your wallet to unlock gates</li>
          <li>Start discovering compatible singles near you</li>
        </ul>
        <p>Ready to find your perfect match?</p>
        <a href="https://pay-gate-dating--pawint.replit.app/discover" 
           style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Start Discovering
        </a>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          If you have any questions, contact us at support@pawint-app.com
        </p>
      </div>
    `
  }),

  newMatch: (firstName: string, matchName: string) => ({
    subject: `You have a new match on PayGate Dating!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">New Match Alert!</h1>
        <p>Hey ${firstName},</p>
        <p><strong>${matchName}</strong> is interested in connecting with you!</p>
        <p>Don't keep them waiting - respond now to start your journey through the gates together.</p>
        <a href="https://pay-gate-dating--pawint.replit.app/matches" 
           style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View Match
        </a>
      </div>
    `
  }),

  newMessage: (firstName: string, senderName: string) => ({
    subject: `New message from ${senderName} on PayGate Dating`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">You've Got a Message!</h1>
        <p>Hey ${firstName},</p>
        <p><strong>${senderName}</strong> just sent you a message.</p>
        <a href="https://pay-gate-dating--pawint.replit.app/messages" 
           style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Read Message
        </a>
      </div>
    `
  }),

  gateUnlocked: (firstName: string, gateNumber: number, matchName: string) => ({
    subject: `Gate ${gateNumber} Unlocked with ${matchName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">Gate ${gateNumber} Unlocked!</h1>
        <p>Hey ${firstName},</p>
        <p>Congratulations! You've progressed to Gate ${gateNumber} with <strong>${matchName}</strong>.</p>
        <p>Keep building your connection!</p>
        <a href="https://pay-gate-dating--pawint.replit.app/matches" 
           style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Continue Chatting
        </a>
      </div>
    `
  }),

  giftReceived: (firstName: string, senderName: string, giftName: string) => ({
    subject: `${senderName} sent you a gift!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">You Received a Gift!</h1>
        <p>Hey ${firstName},</p>
        <p><strong>${senderName}</strong> just purchased <strong>${giftName}</strong> from your wishlist!</p>
        <p>This thoughtful gesture shows they're serious about connecting with you.</p>
        <a href="https://pay-gate-dating--pawint.replit.app/matches" 
           style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Thank Them
        </a>
      </div>
    `
  }),

  supportTicketConfirmation: (firstName: string, ticketSubject: string) => ({
    subject: 'We received your support request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">Support Request Received</h1>
        <p>Hey ${firstName},</p>
        <p>We've received your support request regarding:</p>
        <p style="background: #f3f4f6; padding: 12px; border-radius: 6px;"><strong>${ticketSubject}</strong></p>
        <p>Our team will review your request and get back to you within 24-48 hours.</p>
        <p style="margin-top: 30px; color: #666;">
          The PayGate Dating Support Team<br>
          support@pawint-app.com
        </p>
      </div>
    `
  }),

  verificationApproved: (firstName: string) => ({
    subject: 'Your profile is now verified!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">You're Verified!</h1>
        <p>Hey ${firstName},</p>
        <p>Great news! Your identity has been verified. You'll now display a verified badge on your profile.</p>
        <p>Verified profiles get more matches and build trust faster. Happy dating!</p>
        <a href="https://pay-gate-dating--pawint.replit.app/discover" 
           style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Find Matches
        </a>
      </div>
    `
  }),

  walletDeposit: (firstName: string, amount: string) => ({
    subject: `$${amount} added to your PayGate wallet`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">Wallet Topped Up!</h1>
        <p>Hey ${firstName},</p>
        <p><strong>$${amount}</strong> has been added to your PayGate Dating wallet.</p>
        <p>You're ready to unlock gates and make meaningful connections!</p>
        <a href="https://pay-gate-dating--pawint.replit.app/discover" 
           style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Start Matching
        </a>
      </div>
    `
  }),

  interestReceived: (firstName: string, senderName: string, message?: string) => ({
    subject: `Someone is interested in you on PayGate!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">You've Caught Someone's Eye!</h1>
        <p>Hey ${firstName},</p>
        <p><strong>${senderName}</strong> has expressed interest in connecting with you!</p>
        ${message ? `<p style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-style: italic;">"${message}"</p>` : ''}
        <p>They've invested in getting to know you. Check out their profile and decide if you'd like to connect!</p>
        <a href="https://pay-gate-dating--pawint.replit.app/matches" 
           style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View Their Profile
        </a>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Remember: PayGate uses a unique gate system - their investment shows they're serious about connecting!
        </p>
      </div>
    `
  }),

  nearbyAlert: (firstName: string, nearbyCount: number) => ({
    subject: `${nearbyCount} singles are near you right now!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">Singles Nearby!</h1>
        <p>Hey ${firstName},</p>
        <p>Good news! <strong>${nearbyCount} ${nearbyCount === 1 ? 'person is' : 'people are'}</strong> currently live and looking near your area.</p>
        <p>Open the app now to see who's around and express your interest!</p>
        <a href="https://pay-gate-dating--pawint.replit.app/nearby" 
           style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          See Who's Nearby
        </a>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Go live yourself to appear on others' maps and increase your chances of meeting someone special!
        </p>
      </div>
    `
  }),

  inactivityReminder: (firstName: string, daysSinceActive: number, seasonalMessage: string) => ({
    subject: `We miss you, ${firstName}! ${seasonalMessage}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">We Miss You!</h1>
        <p>Hey ${firstName},</p>
        <p>It's been ${daysSinceActive} days since we last saw you on PayGate Dating.</p>
        <p>${seasonalMessage}</p>
        <p>While you've been away, new singles have joined looking for meaningful connections. Don't miss out!</p>
        <a href="https://pay-gate-dating--pawint.replit.app/discover" 
           style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          See New Profiles
        </a>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Staying active on PayGate increases your visibility and chances of finding that special someone.
        </p>
      </div>
    `
  }),

  loginStreakReward: (firstName: string, streakDays: number) => ({
    subject: `You earned $5 for your ${streakDays}-day streak!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">Streak Reward Earned!</h1>
        <p>Hey ${firstName},</p>
        <p>Congratulations! You've logged in for <strong>${streakDays} consecutive days</strong>!</p>
        <p>As a reward for your dedication, we've added <strong style="color: #10b981;">$5.00</strong> to your wallet.</p>
        <p>Keep logging in daily to earn more rewards - you'll get $5 for every 7 days!</p>
        <a href="https://pay-gate-dating--pawint.replit.app/rewards" 
           style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View Your Rewards
        </a>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Your streak is currently at ${streakDays} days. Don't break it!
        </p>
      </div>
    `
  })
};

// Main send function
export async function sendEmail(
  to: string,
  template: keyof typeof templates,
  data: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    let emailContent: { subject: string; html: string };
    
    switch (template) {
      case 'welcome':
        emailContent = templates.welcome(data.firstName);
        break;
      case 'newMatch':
        emailContent = templates.newMatch(data.firstName, data.matchName);
        break;
      case 'newMessage':
        emailContent = templates.newMessage(data.firstName, data.senderName);
        break;
      case 'gateUnlocked':
        emailContent = templates.gateUnlocked(data.firstName, data.gateNumber, data.matchName);
        break;
      case 'giftReceived':
        emailContent = templates.giftReceived(data.firstName, data.senderName, data.giftName);
        break;
      case 'supportTicketConfirmation':
        emailContent = templates.supportTicketConfirmation(data.firstName, data.ticketSubject);
        break;
      case 'verificationApproved':
        emailContent = templates.verificationApproved(data.firstName);
        break;
      case 'walletDeposit':
        emailContent = templates.walletDeposit(data.firstName, data.amount);
        break;
      case 'interestReceived':
        emailContent = templates.interestReceived(data.firstName, data.senderName, data.message);
        break;
      case 'nearbyAlert':
        emailContent = templates.nearbyAlert(data.firstName, data.nearbyCount);
        break;
      case 'inactivityReminder':
        emailContent = templates.inactivityReminder(data.firstName, data.daysSinceActive, data.seasonalMessage);
        break;
      case 'loginStreakReward':
        emailContent = templates.loginStreakReward(data.firstName, data.streakDays);
        break;
      default:
        throw new Error(`Unknown template: ${template}`);
    }

    const result = await client.emails.send({
      from: fromEmail || 'notification@pawint-app.com',
      to,
      subject: emailContent.subject,
      html: emailContent.html
    });

    console.log(`Email sent successfully: ${template} to ${to}`);
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to send email: ${template} to ${to}`, error);
    return { success: false, error: error.message };
  }
}

// Convenience functions for specific notifications
export const emailService = {
  sendWelcome: (to: string, firstName: string) => 
    sendEmail(to, 'welcome', { firstName }),
  
  sendNewMatch: (to: string, firstName: string, matchName: string) => 
    sendEmail(to, 'newMatch', { firstName, matchName }),
  
  sendNewMessage: (to: string, firstName: string, senderName: string) => 
    sendEmail(to, 'newMessage', { firstName, senderName }),
  
  sendGateUnlocked: (to: string, firstName: string, gateNumber: number, matchName: string) => 
    sendEmail(to, 'gateUnlocked', { firstName, gateNumber, matchName }),
  
  sendGiftReceived: (to: string, firstName: string, senderName: string, giftName: string) => 
    sendEmail(to, 'giftReceived', { firstName, senderName, giftName }),
  
  sendSupportConfirmation: (to: string, firstName: string, ticketSubject: string) => 
    sendEmail(to, 'supportTicketConfirmation', { firstName, ticketSubject }),
  
  sendVerificationApproved: (to: string, firstName: string) => 
    sendEmail(to, 'verificationApproved', { firstName }),
  
  sendWalletDeposit: (to: string, firstName: string, amount: string) => 
    sendEmail(to, 'walletDeposit', { firstName, amount }),
  
  sendInterestReceived: (to: string, firstName: string, senderName: string, message?: string) => 
    sendEmail(to, 'interestReceived', { firstName, senderName, message }),
  
  sendNearbyAlert: (to: string, firstName: string, nearbyCount: number) => 
    sendEmail(to, 'nearbyAlert', { firstName, nearbyCount }),
  
  sendInactivityReminder: (to: string, firstName: string, daysSinceActive: number, seasonalMessage: string) => 
    sendEmail(to, 'inactivityReminder', { firstName, daysSinceActive, seasonalMessage }),
  
  sendLoginStreakReward: (to: string, firstName: string, streakDays: number) => 
    sendEmail(to, 'loginStreakReward', { firstName, streakDays })
};
