export type ImageSource = 'upload' | 'link';

export interface StoredImage {
  url: string;
  source: ImageSource | '';
  storagePath?: string;
  width?: number;
  height?: number;
}

export interface CharacterInfoItem {
  label: string;
  value: string;
}

export interface RelatedWorkLink {
  label: string;
  url: string;
}

export interface CharacterPrompt {
  label: string;
  version: string;
  text: string;
}

export interface Work {
  id: string;
  title: string;
  description: string;
  externalUrl: string;
  order: number;
  ownerId: string;
}

export interface Character {
  id: string;
  name: string;
  workId: string;
  coverImage: StoredImage;
  heroImage: StoredImage;
  tagline: string;
  introduction: string;
  crackUrl: string;
  caveduckUrl: string;
  relatedUrl: string;
  infoItems: CharacterInfoItem[];
  gallery: StoredImage[];
  relatedWorkLinks: RelatedWorkLink[];
  prompts: CharacterPrompt[];
  order: number;
  ownerId: string;
}

export interface Video {
  id: string;
  title: string;
  youtubeUrl: string;
  youtubeId: string;
  description: string;
  characterIds: string[];
  workId: string;
  order: number;
  ownerId: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  coverImage: StoredImage;
  audioUrl: string;
  lyrics: string;
  characterIds: string[];
  workId: string;
  order: number;
  ownerId: string;
}

export type LinkKind = 'notice' | 'archive' | 'header' | 'custom';

export interface LinkItem {
  id: string;
  kind: LinkKind;
  label: string;
  url: string;
  image: StoredImage;
  order: number;
  ownerId: string;
}
