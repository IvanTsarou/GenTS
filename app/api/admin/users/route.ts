import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function validateAdminToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  return token === process.env.ADMIN_TOKEN;
}

export async function GET(request: NextRequest) {
  if (!validateAdminToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  if (!validateAdminToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { telegram_id, name, is_verified = true, is_admin = false } = body;

    if (!telegram_id) {
      return NextResponse.json(
        { error: 'telegram_id is required' },
        { status: 400 }
      );
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegram_id)
      .single();

    if (existingUser) {
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ is_verified, is_admin, name: name || undefined })
        .eq('telegram_id', telegram_id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }

      return NextResponse.json({ user: updatedUser, action: 'updated' });
    }

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        telegram_id,
        name,
        is_verified,
        is_admin,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json({ user: newUser, action: 'created' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
