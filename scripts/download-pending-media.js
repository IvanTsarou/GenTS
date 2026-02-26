#!/usr/bin/env node

/**
 * Download pending media files from Telegram
 * 
 * This script downloads large video files that were registered but not uploaded
 * during the trip due to size limitations.
 * 
 * Usage:
 *   node scripts/download-pending-media.js [--trip-id <uuid>] [--upload]
 * 
 * Options:
 *   --trip-id <uuid>  Download only files from specific trip
 *   --upload          Upload downloaded files to Supabase Storage
 *   --list            Just list pending files without downloading
 * 
 * Environment variables required:
 *   TELEGRAM_BOT_TOKEN
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables.');
  console.error('Required: TELEGRAM_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const tripIdIndex = args.indexOf('--trip-id');
const tripId = tripIdIndex !== -1 ? args[tripIdIndex + 1] : null;
const shouldUpload = args.includes('--upload');
const listOnly = args.includes('--list');

const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');

async function main() {
  console.log('🎬 GenTS Media Downloader\n');

  let query = supabase
    .from('media')
    .select('*, trips(name)')
    .eq('pending_download', true)
    .order('created_at', { ascending: true });

  if (tripId) {
    query = query.eq('trip_id', tripId);
  }

  const { data: pendingMedia, error } = await query;

  if (error) {
    console.error('Error fetching pending media:', error);
    process.exit(1);
  }

  if (!pendingMedia || pendingMedia.length === 0) {
    console.log('✅ No pending media to download.');
    return;
  }

  console.log(`📋 Found ${pendingMedia.length} pending file(s):\n`);

  let totalSize = 0;
  for (const media of pendingMedia) {
    const sizeMB = (media.file_size_bytes || 0) / (1024 * 1024);
    totalSize += sizeMB;
    console.log(`  • ${media.original_filename || media.id}`);
    console.log(`    Trip: ${media.trips?.name || 'Unknown'}`);
    console.log(`    Size: ${sizeMB.toFixed(1)} MB`);
    console.log(`    Type: ${media.media_type}`);
    console.log(`    Created: ${new Date(media.created_at).toLocaleString()}`);
    console.log('');
  }

  console.log(`📦 Total size: ${totalSize.toFixed(1)} MB\n`);

  if (listOnly) {
    return;
  }

  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  console.log(`📥 Starting download to: ${DOWNLOAD_DIR}\n`);

  let downloaded = 0;
  let failed = 0;

  for (const media of pendingMedia) {
    const filename = media.original_filename || `${media.id}.mp4`;
    const filepath = path.join(DOWNLOAD_DIR, filename);

    console.log(`⏳ Downloading: ${filename}...`);

    try {
      const fileInfo = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${media.telegram_file_id}`
      ).then(r => r.json());

      if (!fileInfo.ok) {
        console.error(`   ❌ Failed to get file info: ${fileInfo.description}`);
        failed++;
        continue;
      }

      const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.result.file_path}`;
      
      const response = await fetch(fileUrl);
      if (!response.ok) {
        console.error(`   ❌ Failed to download: HTTP ${response.status}`);
        failed++;
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(filepath, buffer);

      console.log(`   ✅ Saved: ${filepath} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);

      if (shouldUpload) {
        console.log(`   📤 Uploading to Supabase Storage...`);

        const mimeType = filename.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
        const storagePath = `trips/${media.trip_id}/videos/${media.id}${path.extname(filename)}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          console.error(`   ❌ Upload failed: ${uploadError.message}`);
        } else {
          const { data: urlData } = supabase.storage
            .from('media')
            .getPublicUrl(storagePath);

          await supabase
            .from('media')
            .update({
              file_url: urlData.publicUrl,
              pending_download: false,
            })
            .eq('id', media.id);

          console.log(`   ✅ Uploaded and updated database`);
        }
      }

      downloaded++;
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      failed++;
    }

    console.log('');
  }

  console.log('━'.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   Downloaded: ${downloaded}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${pendingMedia.length}`);

  if (!shouldUpload && downloaded > 0) {
    console.log(`\n💡 Tip: Run with --upload flag to upload files to Supabase Storage`);
  }
}

main().catch(console.error);
