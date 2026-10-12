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
export async function sendAuthEmail(to: string, kind: "verify" | "signin" | "reset" | "signup", link: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    const action = kind === "signup" ? "Finish your PayGate signup" : kind === "verify" ? "Verify your email" : kind === "reset" ? "Reset your password" : "Sign in to PayGate";
    const expiry = kind === "verify" || kind === "signup" ? "24 hours" : "30 minutes";
    const safeLink = link.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    const result = await client.emails.send({
      from: fromEmail, to,
      subject: `${action} — PayGate Dating`,
      html: `<h1>${action}</h1><p><a href="${safeLink}">${action}</a></p><p>This single-use link expires in ${expiry}. If you did not request it, ignore this email.</p>`,
      text: `${action}: ${link}\nThis single-use link expires in ${expiry}. If you did not request it, ignore this email.`,
    });
    if (result.error) { console.warn("Authentication email rejected by provider."); return false; }
    return !!result.data?.id;
  } catch { console.warn("Authentication email delivery unavailable."); return false; }
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export function migrationEmailContent(link:string) {
  const body="We've upgraded how you sign in to PayGate Dating. Tap below to set your password and you're in.";
  return {subject:"Your PayGate sign-in upgrade",text:`${body}\nSet your password: ${link}\nThis single-use link expires in 30 minutes. Your profile and history are unchanged. If it expires, request a new sign-in link on PayGate.`,
    html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h1>Your next chapter, without the sign-in friction</h1><p>${body}</p><p><a style="background:#76229b;color:white;padding:14px 22px;border-radius:8px;display:inline-block;text-decoration:none" href="${escapeHtml(link)}">Set your password &amp; sign in</a></p><p>Your profile and history are unchanged. This single-use link expires in 30 minutes. If it expires, request a new sign-in link on PayGate.</p></div>`};
}
export async function sendMigrationEmail(to:string,link:string,_memberId:string):Promise<{status:"sent"|"failed"|"uncertain";providerId?:string}> {
  try {
    const {client,fromEmail}=await getResendClient();
    // Durable per-member claiming prevents retries, including uncertain outcomes.
    const result=await client.emails.send({from:fromEmail,to,...migrationEmailContent(link)});
    if(result.error) return {status:"failed"};
    return result.data?.id ? {status:"sent",providerId:result.data.id} : {status:"uncertain"};
  } catch {return {status:"uncertain"};}
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

// Email templates
const templates = {
  subscriptionConfirmation: (firstName: string, tier: string, amount: string, timestamp: string) => ({
    subject: "You're now PayGate Premium!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">You're now PayGate Premium!</h1>
        <p>Hey ${escapeHtml(firstName)},</p>
        <p>Your subscription is active.</p>
        <p><strong>Tier:</strong> ${escapeHtml(tier)}</p>
        <p><strong>Amount paid:</strong> ${escapeHtml(amount)}</p>
        <p><strong>Date:</strong> ${escapeHtml(timestamp)}</p>
      </div>
    `
  }),

  subscriptionAdminAlert: (buyerName: string, buyerEmail: string, tier: string, amount: string, timestamp: string) => ({
    subject: `Premium Subscription: ${tier} — ${amount}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">Premium Subscription</h1>
        <p><strong>Buyer:</strong> ${escapeHtml(buyerName)}</p>
        <p><strong>Buyer email:</strong> ${escapeHtml(buyerEmail)}</p>
        <p><strong>Amount paid:</strong> ${escapeHtml(amount)}</p>
        <p><strong>Tier:</strong> ${escapeHtml(tier)}</p>
        <p><strong>Timestamp:</strong> ${escapeHtml(timestamp)}</p>
      </div>
    `
  }),

  giftPurchaseReceipt: (firstName: string, giftName: string, amount: string, recipientName: string) => ({
    subject: 'Your gift purchase receipt',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">Your Gift Purchase Receipt</h1>
        <p>Hey ${escapeHtml(firstName)},</p>
        <p><strong>Gift:</strong> ${escapeHtml(giftName)}</p>
        <p><strong>Amount paid (PayGate gift service fee):</strong> ${escapeHtml(amount)}</p>
        <p><strong>Recipient:</strong> ${escapeHtml(recipientName)}</p>
        <p>This receipt covers the PayGate service fee only. The gift product and any shipping are paid separately to the retailer.</p>
      </div>
    `
  }),

  giftPurchaseAdminAlert: (buyerName: string, buyerEmail: string, recipientName: string, recipientEmail: string, giftName: string, amount: string, timestamp: string) => ({
    subject: `Gift Purchase: ${amount}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">Gift Purchase</h1>
        <p><strong>Buyer:</strong> ${escapeHtml(buyerName)}</p>
        <p><strong>Buyer email:</strong> ${escapeHtml(buyerEmail)}</p>
        <p><strong>Recipient:</strong> ${escapeHtml(recipientName)}</p>
        <p><strong>Recipient email:</strong> ${escapeHtml(recipientEmail)}</p>
        <p><strong>Gift:</strong> ${escapeHtml(giftName)}</p>
        <p><strong>Amount paid (PayGate gift service fee):</strong> ${escapeHtml(amount)}</p>
        <p><strong>Timestamp:</strong> ${escapeHtml(timestamp)}</p>
      </div>
    `
  }),

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
        <a href="https://paygatedating.com/discover" 
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
        <a href="https://paygatedating.com/matches" 
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
        <a href="https://paygatedating.com/messages" 
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
        <a href="https://paygatedating.com/matches" 
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
        <a href="https://paygatedating.com/matches" 
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
        <a href="https://paygatedating.com/discover" 
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
        <a href="https://paygatedating.com/discover" 
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
        <a href="https://paygatedating.com/matches" 
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
        <a href="https://paygatedating.com/nearby" 
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
        <a href="https://paygatedating.com/discover" 
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
        <a href="https://paygatedating.com/rewards" 
           style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View Your Rewards
        </a>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Your streak is currently at ${streakDays} days. Don't break it!
        </p>
      </div>
    `
  }),

  contactForm: (name: string, email: string, page: string, message: string) => ({
    subject: `[PayGate site feedback] ${page.replace(/[\r\n]+/g, " ")}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6;">New Contact Form Submission</h1>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee; width: 100px;">Name:</td>
             <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td>
             <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
          </tr>
          <tr>
             <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Page:</td>
             <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(page)}</td>
          </tr>
        </table>
        <h3 style="color: #333;">Message:</h3>
         <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(message)}</div>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
           Respond to ${escapeHtml(name)} at ${escapeHtml(email)}.
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
      case 'subscriptionConfirmation':
        emailContent = templates.subscriptionConfirmation(data.firstName, data.tier, data.amount, data.timestamp);
        break;
      case 'subscriptionAdminAlert':
        emailContent = templates.subscriptionAdminAlert(data.buyerName, data.buyerEmail, data.tier, data.amount, data.timestamp);
        break;
      case 'giftPurchaseReceipt':
        emailContent = templates.giftPurchaseReceipt(data.firstName, data.giftName, data.amount, data.recipientName);
        break;
      case 'giftPurchaseAdminAlert':
        emailContent = templates.giftPurchaseAdminAlert(data.buyerName, data.buyerEmail, data.recipientName, data.recipientEmail, data.giftName, data.amount, data.timestamp);
        break;
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
      case 'contactForm':
        emailContent = templates.contactForm(data.name, data.email, data.page, data.message);
        break;
      default:
        throw new Error(`Unknown template: ${template}`);
    }

    const result = await client.emails.send({
      from: 'PayGate Dating <notification@pawint-app.com>',
      to,
      subject: emailContent.subject,
      html: emailContent.html
    });
    if (result.error) {
      throw new Error(result.error.message || "Email provider rejected the message");
    }

    console.log(`Email sent successfully: ${template} to ${to}`);
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to send email: ${template} to ${to}`, error);
    return { success: false, error: error.message };
  }
}

// Convenience functions for specific notifications
export const emailService = {
  sendSubscriptionConfirmation: (to: string, firstName: string, tier: string, amount: string, timestamp: string) =>
    sendEmail(to, 'subscriptionConfirmation', { firstName, tier, amount, timestamp }),

  sendSubscriptionAdminAlert: (to: string, buyerName: string, buyerEmail: string, tier: string, amount: string, timestamp: string) =>
    sendEmail(to, 'subscriptionAdminAlert', { buyerName, buyerEmail, tier, amount, timestamp }),

  sendGiftPurchaseReceipt: (to: string, firstName: string, giftName: string, amount: string, recipientName: string) =>
    sendEmail(to, 'giftPurchaseReceipt', { firstName, giftName, amount, recipientName }),

  sendGiftPurchaseAdminAlert: (to: string, buyerName: string, buyerEmail: string, recipientName: string, recipientEmail: string, giftName: string, amount: string, timestamp: string) =>
    sendEmail(to, 'giftPurchaseAdminAlert', { buyerName, buyerEmail, recipientName, recipientEmail, giftName, amount, timestamp }),

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
    sendEmail(to, 'loginStreakReward', { firstName, streakDays }),

  sendContactForm: (to: string, name: string, email: string, page: string, message: string) =>
    sendEmail(to, 'contactForm', { name, email, page, message })
};
