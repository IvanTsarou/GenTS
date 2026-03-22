import type { BotContext } from '../index';
import type { User } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { findNearestLocation } from '@/lib/clustering';
import { reverseGeocode } from '@/lib/geocoding';
import { searchWikipedia } from '@/lib/wikipedia';
import { getActiveTrip } from '../commands';

type AuthenticatedContext = BotContext & { user: User };

export async function handleLocation(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const location = ctx.message?.location;
  if (!location) return;

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply('❌ Нет активной поездки.');
    return;
  }

  const coordinates = {
    lat: location.latitude,
    lng: location.longitude,
  };

  try {
    const { data: unlinkedMedia } = await supabase
      .from('media')
      .select('*')
      .eq('trip_id', activeTrip.id)
      .eq('user_id', user.id)
      .is('location_id', null)
      .is('lat', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!unlinkedMedia || unlinkedMedia.length === 0) {
      await ctx.reply(
        '📍 Геолокация получена, но нет фото без привязки.\n\n' +
          'Сначала отправьте фото, затем геолокацию.'
      );
      return;
    }

    const { data: existingLocations } = await supabase
      .from('locations')
      .select('*')
      .eq('trip_id', activeTrip.id);

    let targetLocation = findNearestLocation(coordinates, existingLocations || []);

    if (!targetLocation) {
      const geocodeResult = await reverseGeocode(coordinates);
      const wikiResult = geocodeResult
        ? await searchWikipedia(geocodeResult.name)
        : null;

      const { data: newLocation } = await supabase
        .from('locations')
        .insert({
          trip_id: activeTrip.id,
          name: geocodeResult?.name || 'Неизвестное место',
          address: geocodeResult?.address || null,
          city: geocodeResult?.city || null,
          country: geocodeResult?.country || null,
          lat: coordinates.lat,
          lng: coordinates.lng,
          description: wikiResult?.description || null,
          wiki_url: wikiResult?.url || null,
        })
        .select()
        .single();

      targetLocation = newLocation;
    }

    if (!targetLocation) {
      await ctx.reply('❌ Ошибка создания локации.');
      return;
    }

    const mediaIds = unlinkedMedia.map((m) => m.id);

    await supabase
      .from('media')
      .update({
        location_id: targetLocation.id,
        lat: coordinates.lat,
        lng: coordinates.lng,
      })
      .in('id', mediaIds);
  } catch (error) {
    console.error('Location handling error:', error);
    await ctx.reply('❌ Ошибка обработки геолокации.');
  }
}
