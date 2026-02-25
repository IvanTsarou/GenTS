#!/usr/bin/env node

/**
 * Script to register Telegram webhook
 * Usage: npm run setup-webhook
 *
 * Required environment variables:
 * - TELEGRAM_BOT_TOKEN
 * - TELEGRAM_WEBHOOK_SECRET
 * - APP_URL (your Vercel deployment URL)
 */

const TELEGRAM_API = 'https://api.telegram.org';

async function setupWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const appUrl = process.env.APP_URL;

  if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set');
    process.exit(1);
  }

  if (!appUrl) {
    console.error('❌ APP_URL is not set');
    process.exit(1);
  }

  const webhookUrl = `${appUrl}/api/webhook/telegram`;

  console.log('🔧 Setting up Telegram webhook...');
  console.log(`📍 Webhook URL: ${webhookUrl}`);

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret || undefined,
        allowed_updates: [
          'message',
          'callback_query',
        ],
      }),
    });

    const result = await response.json();

    if (result.ok) {
      console.log('✅ Webhook registered successfully!');
      console.log(`📝 Result: ${result.description}`);
    } else {
      console.error('❌ Failed to register webhook');
      console.error(`📝 Error: ${result.description}`);
      process.exit(1);
    }

    // Get webhook info
    const infoResponse = await fetch(`${TELEGRAM_API}/bot${token}/getWebhookInfo`);
    const info = await infoResponse.json();

    if (info.ok) {
      console.log('\n📊 Webhook Info:');
      console.log(`   URL: ${info.result.url}`);
      console.log(`   Pending updates: ${info.result.pending_update_count}`);
      if (info.result.last_error_message) {
        console.log(`   Last error: ${info.result.last_error_message}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function deleteWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set');
    process.exit(1);
  }

  console.log('🗑️ Deleting Telegram webhook...');

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/deleteWebhook`, {
      method: 'POST',
    });

    const result = await response.json();

    if (result.ok) {
      console.log('✅ Webhook deleted successfully!');
    } else {
      console.error('❌ Failed to delete webhook');
      console.error(`📝 Error: ${result.description}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--delete')) {
  deleteWebhook();
} else {
  setupWebhook();
}
