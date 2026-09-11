export type Lang = "en" | "tr" | "ar";

export type LocalizedString = { en: string; tr?: string; ar?: string };

export type Tone = "accent" | "neutral";

export interface Tag {
  label: string;
  tone: Tone;
}

export interface ImageRef {
  src: string;
  alt: LocalizedString;
}

export interface SkillGroup {
  group: LocalizedString;
  items: Tag[];
}

export interface Social {
  label: string;
  url: string;
}

/** A company or client shown in the "trusted by" strip. */
export interface TrustedCompany {
  label: string;
  url?: string | null;
}

export interface Profile {
  name: LocalizedString;
  kicker: LocalizedString;
  headline: LocalizedString;
  intro: LocalizedString;
  about: LocalizedString;
  email: string;
  cv: LocalizedString;
  portrait: ImageRef;
  socials: Social[];
  skills: SkillGroup[];
  /**
   * Optional rather than required so a profile.json written before this field
   * existed stays valid content. Empty means the strip is not rendered at all
   * — an empty "trusted by" says less than nothing.
   */
  trustedBy?: TrustedCompany[];
}

export interface Project {
  id: string;
  title: LocalizedString;
  kicker: LocalizedString;
  summary: LocalizedString;
  tags: Tag[];
  image: ImageRef;
  /** Write-up or repository for the project. */
  url: string | null;
  /**
   * The deployed site, when the project is live. Optional rather than
   * `string | null` so every project committed before this field existed stays
   * valid content.
   */
  liveUrl?: string | null;
  featured: boolean;
  order: number;
}

export interface Video {
  id: string;
  title: LocalizedString;
  youtubeId: string;
  description?: LocalizedString;
  featured: boolean;
  order: number;
}

export interface ArticleMeta {
  slug: string;
  date: string;
  topic: LocalizedString;
  title: LocalizedString;
  standfirst: LocalizedString;
  readingMinutes: number;
  tags: Tag[];
  cover: ImageRef | null;
  featured: boolean;
  published: boolean;
}

export interface Article extends ArticleMeta {
  bodies: Partial<Record<Lang, string>>;
}

export type UiDict = Record<string, LocalizedString>;
