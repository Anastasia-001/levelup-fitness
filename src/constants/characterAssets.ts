import { DimensionValue, ImageSourcePropType } from 'react-native';

export type CharacterPose = 'neutral';

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

type Anchor = {
  left: DimensionValue;
  top: DimensionValue;
  width: DimensionValue;
  height: DimensionValue;
};

export const CHARACTER_ASSETS: Record<CharacterPose, CharacterAsset> = {
  neutral: {
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
  }
};
