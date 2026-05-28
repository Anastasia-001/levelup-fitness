import { getCosmeticById, STARTER_EQUIPMENT } from '@/constants/cosmetics';
import { supabase } from '@/lib/supabase';
import { CosmeticCategory, CosmeticItem, EquippedCosmetics, OwnedCosmetic } from '@/types/domain';

export const mapOwnedCosmetic = (row: {
  user_id: string;
  item_id: string;
  acquired_at: string;
}): OwnedCosmetic => ({
  userId: row.user_id,
  itemId: row.item_id,
  acquiredAt: row.acquired_at
});

export const mapEquippedCosmetics = (row: {
  user_id: string;
  head_item_id: string | null;
  shirt_item_id: string | null;
  pants_item_id: string | null;
  shoes_item_id: string | null;
  accessory_item_id: string | null;
  frame_item_id: string | null;
  updated_at: string;
}): EquippedCosmetics => ({
  userId: row.user_id,
  headItemId: row.head_item_id,
  shirtItemId: row.shirt_item_id,
  pantsItemId: row.pants_item_id,
  shoesItemId: row.shoes_item_id,
  accessoryItemId: row.accessory_item_id,
  frameItemId: row.frame_item_id,
  updatedAt: row.updated_at
});

export const ensureEquipment = async (userId: string) => {
  const { data, error } = await supabase
    .from('equipped_cosmetics')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return mapEquippedCosmetics(data);

  const { data: inserted, error: insertError } = await supabase
    .from('equipped_cosmetics')
    .insert({
      user_id: userId,
      head_item_id: STARTER_EQUIPMENT.head,
      shirt_item_id: STARTER_EQUIPMENT.shirt,
      pants_item_id: STARTER_EQUIPMENT.pants,
      shoes_item_id: STARTER_EQUIPMENT.shoes
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return mapEquippedCosmetics(inserted);
};

export const listOwnedCosmetics = async (userId: string) => {
  const { data, error } = await supabase
    .from('owned_cosmetics')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data.map(mapOwnedCosmetic);
};

export const getInventory = async (userId: string) => {
  const [ownedCosmetics, equippedCosmetics] = await Promise.all([
    listOwnedCosmetics(userId),
    ensureEquipment(userId)
  ]);

  return { ownedCosmetics, equippedCosmetics };
};

export const isCosmeticUnlocked = (
  item: CosmeticItem,
  ownedIds: string[],
  level: number
) => item.price === 0 || ownedIds.includes(item.id) || (item.unlockLevel ?? 1) <= level && item.price === 0;

export const purchaseCosmetic = async (userId: string, item: CosmeticItem, currentCoins: number) => {
  if (item.price <= 0) {
    throw new Error('This item is unlocked through progression.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('owned_cosmetics')
    .select('*')
    .eq('user_id', userId)
    .eq('item_id', item.id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    throw new Error('You already own this cosmetic.');
  }

  if (currentCoins < item.price) {
    throw new Error('Not enough coins.');
  }

  const nextCoins = currentCoins - item.price;
  const { error: coinError } = await supabase
    .from('characters')
    .update({ coins: nextCoins })
    .eq('user_id', userId);

  if (coinError) throw coinError;

  const { data: owned, error: ownedError } = await supabase
    .from('owned_cosmetics')
    .insert({ user_id: userId, item_id: item.id })
    .select()
    .single();

  if (ownedError) throw ownedError;
  return { coins: nextCoins, ownedCosmetic: mapOwnedCosmetic(owned) };
};

export const equipCosmetic = async (
  userId: string,
  category: CosmeticCategory,
  itemId: string | null
) => {
  const payload = {
    user_id: userId,
    head_item_id: category === 'head' ? itemId : undefined,
    shirt_item_id: category === 'shirt' ? itemId : undefined,
    pants_item_id: category === 'pants' ? itemId : undefined,
    shoes_item_id: category === 'shoes' ? itemId : undefined,
    accessory_item_id: category === 'accessory' ? itemId : undefined,
    frame_item_id: category === 'frame' ? itemId : undefined
  };

  const { data, error } = await supabase
    .from('equipped_cosmetics')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return mapEquippedCosmetics(data);
};

export const getEquippedItems = (equipment: EquippedCosmetics | null) => ({
  head: getCosmeticById(equipment?.headItemId) ?? getCosmeticById(STARTER_EQUIPMENT.head),
  shirt: getCosmeticById(equipment?.shirtItemId) ?? getCosmeticById(STARTER_EQUIPMENT.shirt),
  pants: getCosmeticById(equipment?.pantsItemId) ?? getCosmeticById(STARTER_EQUIPMENT.pants),
  shoes: getCosmeticById(equipment?.shoesItemId) ?? getCosmeticById(STARTER_EQUIPMENT.shoes),
  accessory: getCosmeticById(equipment?.accessoryItemId),
  frame: getCosmeticById(equipment?.frameItemId)
});
