import { DimensionValue, ImageSourcePropType, ViewStyle } from 'react-native';
import { CharacterPoseId } from '@/types/domain';

export type CharacterPose = CharacterPoseId;

export type CharacterAsset = {
  source: ImageSourcePropType;
  canvas: { width: number; height: number };
  anchors: {
    head: Anchor;
    torso: Anchor;
    waist: Anchor;
    legs: Anchor;
    shoes: Anchor;
    wrist: Anchor;
  };
};

export type PosePresentation = {
  transform: Exclude<NonNullable<ViewStyle['transform']>, string>;
  accent: string;
  postureLabel: string;
};

type Anchor = {
  left: DimensionValue;
  top: DimensionValue;
  width: DimensionValue;
  height: DimensionValue;
};

const BASE_CHARACTER_ASSET: CharacterAsset = {
  source: require('../../assets/characters/levelup-starter.png'),
  canvas: { width: 505, height: 1821 },
  anchors: {
    head: { left: '20%', top: '2%', width: '62%', height: '19%' },
    torso: { left: '12%', top: '18%', width: '76%', height: '23%' },
    waist: { left: '19%', top: '37%', width: '64%', height: '8%' },
    legs: { left: '17%', top: '40%', width: '68%', height: '46%' },
    shoes: { left: '4%', top: '84%', width: '94%', height: '14%' },
    wrist: { left: '76%', top: '42%', width: '15%', height: '9%' }
  }
};

export const CHARACTER_ASSETS: Record<CharacterPose, CharacterAsset> = {
  neutral: BASE_CHARACTER_ASSET,
  ready_to_run: BASE_CHARACTER_ASSET,
  stretch: BASE_CHARACTER_ASSET,
  post_workout_victory: BASE_CHARACTER_ASSET,
  recovery: BASE_CHARACTER_ASSET,
  confident: BASE_CHARACTER_ASSET
};

export const POSE_PRESENTATIONS: Record<CharacterPose, PosePresentation> = {
  neutral: { transform: [], accent: '#35F6FF', postureLabel: 'Calm stance' },
  ready_to_run: { transform: [{ translateX: -4 }, { rotate: '-1.8deg' }, { scale: 1.015 }], accent: '#35F6FF', postureLabel: 'Forward stance' },
  stretch: { transform: [{ translateX: 5 }, { rotate: '2deg' }, { scaleY: 0.985 }], accent: '#47F39A', postureLabel: 'Mobility stance' },
  post_workout_victory: { transform: [{ translateY: -5 }, { rotate: '-0.8deg' }, { scale: 1.025 }], accent: '#FFD66E', postureLabel: 'Positive finish' },
  recovery: { transform: [{ translateY: 5 }, { rotate: '1.3deg' }, { scale: 0.985 }], accent: '#A8B7CB', postureLabel: 'Cooldown stance' },
  confident: { transform: [{ translateY: -3 }, { scale: 1.035 }], accent: '#8F5CFF', postureLabel: 'Confident stance' }
};
