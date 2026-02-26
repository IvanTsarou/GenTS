import sharp from 'sharp';
import heicConvert from 'heic-convert';

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_QUALITY = 80;

async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  try {
    const result = await heicConvert({
      buffer: buffer,
      format: 'JPEG',
      quality: 0.9,
    });
    return Buffer.from(result);
  } catch (error) {
    console.error('HEIC conversion error:', error);
    throw error;
  }
}

function isHeic(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const header = buffer.slice(4, 12).toString('ascii');
  return header.includes('ftyp') && (
    header.includes('heic') ||
    header.includes('heix') ||
    header.includes('mif1') ||
    buffer.slice(8, 12).toString('ascii') === 'heic'
  );
}

export async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  try {
    const thumbnail = await sharp(buffer)
      .resize(THUMBNAIL_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    return thumbnail;
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    throw error;
  }
}

export async function processImage(inputBuffer: Buffer): Promise<{
  original: Buffer;
  thumbnail: Buffer;
}> {
  let buffer = inputBuffer;

  if (isHeic(inputBuffer)) {
    console.log('Converting HEIC to JPEG...');
    buffer = await convertHeicToJpeg(inputBuffer);
  }

  const original = await sharp(buffer)
    .rotate()
    .jpeg({ quality: 90 })
    .toBuffer();

  const thumbnail = await generateThumbnail(original);

  return { original, thumbnail };
}
