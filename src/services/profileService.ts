import { supabase } from '@/lib/supabase';
import { ensureEquipment } from '@/services/cosmeticService';
import { Profile } from '@/types/domain';
import { mapCharacter, mapProfile } from '@/services/mappers';

export const ensureProfileAndCharacter = async (userId: string, fallbackUsername: string) => {
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!existingProfile) {
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      username: fallbackUsername,
      unit_preference: 'metric',
      location: 'LevelUp City'
    });
    if (error) throw error;
  }

  const { data: existingCharacter, error: characterError } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (characterError) {
    throw characterError;
  }

  if (!existingCharacter) {
    const { error } = await supabase.from('characters').insert({ user_id: userId, coins: 120 });
    if (error) throw error;
  }

  await ensureEquipment(userId);
};

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return mapProfile(data);
};

export const getCharacter = async (userId: string) => {
  const { data, error } = await supabase.from('characters').select('*').eq('user_id', userId).single();
  if (error) throw error;
  return mapCharacter(data);
};

export const updateProfile = async (
  userId: string,
  values: Partial<
    Pick<
      Profile,
      | 'username'
      | 'location'
      | 'unitPreference'
      | 'privacyControlsEnabled'
      | 'healthDataEnabled'
      | 'emailNotificationsEnabled'
      | 'pushNotificationsEnabled'
    >
  >
) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      username: values.username,
      location: values.location,
      unit_preference: values.unitPreference,
      privacy_controls_enabled: values.privacyControlsEnabled,
      health_data_enabled: values.healthDataEnabled,
      email_notifications_enabled: values.emailNotificationsEnabled,
      push_notifications_enabled: values.pushNotificationsEnabled
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return mapProfile(data);
};
