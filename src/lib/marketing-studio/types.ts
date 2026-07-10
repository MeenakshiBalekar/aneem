// Shared contracts between the generators (src/lib/marketing-studio/*.ts),
// the API routes, and the UI. Kept in one place since MarketingContent.content
// is a Json column whose shape depends on `type`.

export interface DetectedProductAttributes {
  typographyStyle: string;
  mood: string;
  aesthetic: string;
  positioning: string;
  targetAudience: string;
  colorPalette: string[];
  designLanguage: string;
  fitObserved: string;
  summary: string;
}

export interface ContentScore {
  hookScore: number;
  scrollStopScore: number;
  luxuryScore: number;
  viralityScore: number;
  conversionScore: number;
  confidenceScore: number;
  expectedCTR: number;
  expectedSaves: number;
  expectedShares: number;
  expectedWatchTime: number;
}

export interface CaptionSet {
  short: string;
  long: string;
  luxury: string;
  funny: string;
  minimal: string;
  emotional: string;
  highConversion: string;
}

export interface HashtagSet {
  small: string[];
  medium: string[];
  large: string[];
  indian: string[];
  streetwear: string[];
  fashion: string[];
  gym: string[];
  oversized: string[];
  cotton: string[];
  lifestyle: string[];
  all30: string[];
}

export interface CarouselSlide {
  slideNumber: number;
  role: string;
  headline: string;
  subtext: string;
  visualDirection: string;
}

export interface StoryCard {
  type: "countdown" | "poll" | "question" | "swipe_up" | "limited_stock" | "offer";
  headline: string;
  subtext: string;
  stickerSuggestion: string;
  cta: string;
}

export interface ProductDescriptionOutput {
  shopifyDescription: string;
  features: string[];
  specifications: Record<string, string>;
  story: string;
  lifestyleParagraph: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  faqs: { question: string; answer: string }[];
}

export interface MetaAdOutput {
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  creativeAngle: string;
  offer: string;
  audienceSuggestion: string;
  hook: string;
}

export interface WhatsAppCampaignOutput {
  broadcast: string;
  urgency: string;
  launch: string;
  discount: string;
  restock: string;
}

export interface EmailCampaignOutput {
  subject: string;
  previewText: string;
  body: string;
  cta: string;
  footer: string;
}

export interface OfferSuggestion {
  name: string;
  mechanic: string;
  reason: string;
  estimatedImpact: string;
}

export interface BundleCreativeOutput {
  bundleName: string;
  tagline: string;
  caption: string;
  savingsCallout: string;
}

export interface ThumbnailConcept {
  theme: string;
  description: string;
  onScreenText: string;
  colorTheme: "black" | "white" | "premium";
}

export interface ReelScene {
  order: number;
  title: string;
  description: string;
  onScreenText: string;
  cameraDirection: string;
  durationSeconds: number;
  effects: string[];
}

export interface MusicSuggestion {
  songName: string;
  mood: string;
  bpm: number;
  reason: string;
  isCopyrightFree: boolean;
}
