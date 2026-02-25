import sharp from 'sharp';

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_QUALITY = 80;

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

export async function processImage(buffer: Buffer): Promise<{
  original: Buffer;
  thumbnail: Buffer;
}> {
  const original = await sharp(buffer)
    .rotate()
    .jpeg({ quality: 90 })
    .toBuffer();

  const thumbnail = await generateThumbnail(original);

  return { original, thumbnail };
}
