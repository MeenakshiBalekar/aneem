import "server-only";
import { callClaudeJSON, isAIConfigured } from "./claude";
import { getProductContext, BRAND_VOICE } from "./context";
import type {
  CaptionSet,
  HashtagSet,
  CarouselSlide,
  StoryCard,
  ProductDescriptionOutput,
  MetaAdOutput,
  WhatsAppCampaignOutput,
  EmailCampaignOutput,
} from "./types";

interface GenResult<T> {
  data: T;
  isMock: boolean;
}

async function generate<T>(system: string, prompt: string, mock: () => T, maxTokens = 1200): Promise<GenResult<T>> {
  if (!isAIConfigured()) return { data: mock(), isMock: true };
  try {
    const data = await callClaudeJSON<T>(system, prompt, maxTokens);
    return { data, isMock: false };
  } catch {
    return { data: mock(), isMock: true };
  }
}

// ---------------------------------------------------------------------------
// Captions
// ---------------------------------------------------------------------------

export async function generateCaptions(productId: string): Promise<GenResult<CaptionSet>> {
  const { contextBlock, product } = await getProductContext(productId);
  const system = `You are Aneem's social copywriter. ${BRAND_VOICE}`;
  const prompt = `${contextBlock}\n\nWrite 7 Instagram captions for this product, each in a distinct register. Return JSON:
{
  "short": "under 15 words, punchy",
  "long": "60-100 words, tells a story about the piece",
  "luxury": "elevated, minimal, premium fashion-house tone",
  "funny": "genuinely funny, self-aware streetwear humor, not cringe",
  "minimal": "under 8 words",
  "emotional": "connects to identity/confidence, not just product features",
  "highConversion": "leads with the offer/price, clear CTA, urgency"
}`;
  return generate(system, prompt, () => mockCaptions(product.title));
}

function mockCaptions(title: string): CaptionSet {
  return {
    short: `${title}. Dress louder.`,
    long: `Some pieces you wear. This one you live in. ${title} is built for the days that don't go as planned — heavyweight cotton, a fit that moves with you, and enough presence to not need a second layer. This is the one you'll reach for first.`,
    luxury: `${title} — considered construction, quiet confidence.`,
    funny: `POV: your closet finally has one (1) piece that goes with everything and doesn't require ironing.`,
    minimal: `${title}.`,
    emotional: `You don't dress for the room. You dress for you. ${title}.`,
    highConversion: `${title} — live now. Free shipping above ₹1499. Tap to shop before your size is gone.`,
  };
}

// ---------------------------------------------------------------------------
// Hashtags
// ---------------------------------------------------------------------------

export async function generateHashtags(productId: string): Promise<GenResult<HashtagSet>> {
  const { contextBlock } = await getProductContext(productId);
  const system = `You are an Instagram growth strategist for Indian streetwear brands.`;
  const prompt = `${contextBlock}\n\nGenerate exactly 30 Instagram hashtags for this product, categorized. Mix reach sizes deliberately (small = under 100K posts, medium = 100K-1M, large = 1M+). Return JSON with each array containing 3-5 hashtags (with # prefix) and "all30" containing the deduplicated union of all 30:
{
  "small": [], "medium": [], "large": [], "indian": [], "streetwear": [], "fashion": [], "gym": [], "oversized": [], "cotton": [], "lifestyle": [], "all30": []
}`;
  return generate(system, prompt, mockHashtags, 900);
}

function mockHashtags(): HashtagSet {
  const base = {
    small: ["#AneemWear", "#StreetwearIndia", "#OversizedFitIndia"],
    medium: ["#StreetwearBrand", "#OversizedTshirt", "#IndianStreetwear"],
    large: ["#Streetwear", "#OOTD", "#Fashion"],
    indian: ["#MadeInIndia", "#IndianFashion", "#DesiStreetwear"],
    streetwear: ["#StreetwearFashion", "#StreetStyle", "#UrbanWear"],
    fashion: ["#FashionIndia", "#MensFashion", "#StyleInspo"],
    gym: ["#GymWear", "#Activewear", "#Fitfam"],
    oversized: ["#OversizedFit", "#BoxyFit", "#DropShoulder"],
    cotton: ["#PremiumCotton", "#CottonTee", "#HeavyweightCotton"],
    lifestyle: ["#StreetStyleIndia", "#EverydayWear", "#WardrobeStaple"],
  };
  const all30 = Array.from(new Set(Object.values(base).flat())).slice(0, 30);
  return { ...base, all30 };
}

// ---------------------------------------------------------------------------
// Carousel (10 slides)
// ---------------------------------------------------------------------------

export async function generateCarousel(productId: string): Promise<GenResult<CarouselSlide[]>> {
  const { contextBlock } = await getProductContext(productId);
  const system = `You are Aneem's content strategist designing a 10-slide Instagram carousel. ${BRAND_VOICE}`;
  const prompt = `${contextBlock}\n\nDesign a 10-slide carousel following this exact structure: 1 Hook, 2 Product, 3 Fabric, 4 Close-up, 5 Fit, 6 Lifestyle, 7 Customer Benefit, 8 Premium Features, 9 Offer, 10 Call to Action. Return a JSON array of 10 objects:
[{ "slideNumber": 1, "role": "Hook", "headline": "short punchy text for the slide", "subtext": "supporting line", "visualDirection": "what the image/shot should show" }, ...]`;
  return generate(system, prompt, mockCarousel, 1800);
}

function mockCarousel(): CarouselSlide[] {
  const roles = ["Hook", "Product", "Fabric", "Close-up", "Fit", "Lifestyle", "Customer Benefit", "Premium Features", "Offer", "Call to Action"];
  return roles.map((role, i) => ({
    slideNumber: i + 1,
    role,
    headline: `${role} — swipe to see why this is different`,
    subtext: "Built for the days that don't go as planned.",
    visualDirection: `${role} shot — clean studio lighting, product-forward composition`,
  }));
}

// ---------------------------------------------------------------------------
// Stories (3)
// ---------------------------------------------------------------------------

export async function generateStories(productId: string): Promise<GenResult<StoryCard[]>> {
  const { contextBlock } = await getProductContext(productId);
  const system = `You are Aneem's social media manager writing Instagram Stories. ${BRAND_VOICE}`;
  const prompt = `${contextBlock}\n\nWrite 3 Instagram Stories, each using a different interactive format from: countdown, poll, question, swipe_up, limited_stock, offer (pick the 3 most effective for this product). Return JSON array:
[{ "type": "countdown", "headline": "", "subtext": "", "stickerSuggestion": "what the interactive sticker should say/ask", "cta": "" }, ...]`;
  return generate(system, prompt, mockStories, 800);
}

function mockStories(): StoryCard[] {
  return [
    { type: "limited_stock", headline: "Almost gone", subtext: "Restocking isn't guaranteed.", stickerSuggestion: "Only a few sizes left", cta: "Shop before it's gone" },
    { type: "poll", headline: "Which fit are you?", subtext: "Help us pick the next drop.", stickerSuggestion: "Oversized vs Regular", cta: "Vote now" },
    { type: "swipe_up", headline: "New drop is live", subtext: "First 50 orders ship free.", stickerSuggestion: "Swipe up to shop", cta: "Shop the drop" },
  ];
}

// ---------------------------------------------------------------------------
// Product description
// ---------------------------------------------------------------------------

export async function generateProductDescription(productId: string): Promise<GenResult<ProductDescriptionOutput>> {
  const { contextBlock } = await getProductContext(productId);
  const system = `You are an ecommerce copywriter and SEO specialist for a premium streetwear brand. ${BRAND_VOICE}`;
  const prompt = `${contextBlock}\n\nWrite a complete Shopify-style product page description package. Return JSON:
{
  "shopifyDescription": "150-250 word product description, story-driven then practical",
  "features": ["5-7 bullet features"],
  "specifications": { "Fabric": "", "Fit": "", "GSM": "", "Care": "", "Origin": "" },
  "story": "2-3 sentence brand/product story",
  "lifestyleParagraph": "paragraph on how/when to wear it",
  "seoTitle": "under 60 chars, keyword-rich",
  "metaDescription": "under 155 chars",
  "keywords": ["8-10 SEO keywords"],
  "faqs": [{ "question": "", "answer": "" }] // 4 FAQs
}`;
  return generate(system, prompt, mockDescription, 1800);
}

function mockDescription(): ProductDescriptionOutput {
  return {
    shopifyDescription:
      "Built for the days that don't go as planned. Heavyweight cotton, a boxy oversized cut, and just enough detail to make it interesting without trying too hard. This is the piece you reach for first — on the street, in the studio, or nowhere in particular.",
    features: ["Heavyweight cotton construction", "Oversized drop-shoulder fit", "Reinforced seams", "Pre-shrunk fabric", "Ribbed collar"],
    specifications: { Fabric: "100% Cotton", Fit: "Oversized", GSM: "240", Care: "Machine wash cold", Origin: "Made in India" },
    story: "Aneem exists for the ones who dress louder than they talk. Every piece is built heavyweight, cut oversized, and made to last past the trend cycle.",
    lifestyleParagraph: "Wear it loose with track pants for the street, or layer it under a coach jacket when the weather turns. Built to be the one constant in a wardrobe that changes every season.",
    seoTitle: "Premium Oversized Streetwear Tee | Aneem",
    metaDescription: "Heavyweight oversized streetwear tee, 240 GSM cotton. Free shipping above ₹1499, COD available. Shop Aneem.",
    keywords: ["oversized t-shirt", "streetwear India", "premium cotton tee", "Aneem", "oversized fit"],
    faqs: [
      { question: "How does the fit run?", answer: "Oversized and boxy — size down for a slimmer fit." },
      { question: "Is COD available?", answer: "Yes, Cash on Delivery is available pan-India." },
      { question: "What's the fabric weight?", answer: "240 GSM heavyweight cotton." },
      { question: "What's the return policy?", answer: "Free size exchange within 7 days of delivery." },
    ],
  };
}

// ---------------------------------------------------------------------------
// Meta ad
// ---------------------------------------------------------------------------

export async function generateMetaAd(productId: string): Promise<GenResult<MetaAdOutput>> {
  const { contextBlock } = await getProductContext(productId);
  const system = `You are a Meta Ads media buyer/copywriter for a premium streetwear DTC brand. ${BRAND_VOICE}`;
  const prompt = `${contextBlock}\n\nWrite a complete Meta (Facebook/Instagram) ad. Return JSON:
{
  "primaryText": "under 125 chars, scroll-stopping",
  "headline": "under 40 chars",
  "description": "under 30 chars",
  "cta": "e.g. Shop Now, Learn More",
  "creativeAngle": "the strategic angle this ad takes (e.g. social proof, scarcity, product demo)",
  "offer": "the specific offer/hook used",
  "audienceSuggestion": "who to target — interests/demographics",
  "hook": "the first line/visual hook to stop the scroll"
}`;
  return generate(system, prompt, mockMetaAd, 600);
}

function mockMetaAd(): MetaAdOutput {
  return {
    primaryText: "Heavyweight cotton. Oversized fit. Built for the streets, not the store window.",
    headline: "Premium Oversized Streetwear",
    description: "Free shipping ₹1499+",
    cta: "Shop Now",
    creativeAngle: "Product demo + fabric quality proof",
    offer: "Free shipping above ₹1499",
    audienceSuggestion: "18-30, interests: streetwear, hypebeast culture, gym, fashion",
    hook: "This isn't your average oversized tee.",
  };
}

// ---------------------------------------------------------------------------
// WhatsApp campaign
// ---------------------------------------------------------------------------

export async function generateWhatsAppCampaign(productId: string): Promise<GenResult<WhatsAppCampaignOutput>> {
  const { contextBlock } = await getProductContext(productId);
  const system = `You are Aneem's WhatsApp marketing copywriter. Messages must be short (under 300 chars), include one emoji max, and end with a clear CTA + short link placeholder [link].`;
  const prompt = `${contextBlock}\n\nWrite 5 WhatsApp broadcast message variants. Return JSON:
{ "broadcast": "general announcement", "urgency": "scarcity-driven", "launch": "new drop announcement", "discount": "% off framing", "restock": "back in stock framing" }`;
  return generate(system, prompt, mockWhatsApp, 700);
}

function mockWhatsApp(): WhatsAppCampaignOutput {
  return {
    broadcast: "New at Aneem 🖤 Heavyweight oversized streetwear, just dropped. Shop now: [link]",
    urgency: "Almost sold out — your size won't last. Shop before it's gone: [link]",
    launch: "The drop you've been waiting for is live. First 50 orders ship free. [link]",
    discount: "15% off this weekend only. Use code WEEKEND15. Shop: [link]",
    restock: "It's back. Your size is back in stock — for now. Shop: [link]",
  };
}

// ---------------------------------------------------------------------------
// Email campaign
// ---------------------------------------------------------------------------

export async function generateEmailCampaign(productId: string): Promise<GenResult<EmailCampaignOutput>> {
  const { contextBlock } = await getProductContext(productId);
  const system = `You are Aneem's email marketing copywriter. ${BRAND_VOICE}`;
  const prompt = `${contextBlock}\n\nWrite a promotional email. Return JSON:
{ "subject": "under 50 chars", "previewText": "under 90 chars", "body": "150-200 words, HTML-paragraph-friendly plain text", "cta": "button text", "footer": "one line, brand sign-off" }`;
  return generate(system, prompt, mockEmail, 900);
}

function mockEmail(): EmailCampaignOutput {
  return {
    subject: "This one's built different.",
    previewText: "Heavyweight cotton, oversized fit, free shipping above ₹1499.",
    body: "Some pieces you wear. This one you live in.\n\nBuilt from 240 GSM heavyweight cotton in a boxy, oversized fit — this is the piece that makes the rest of your fit look intentional. No loud branding, no gimmicks. Just fabric that holds its shape and a cut that works with everything else in your closet.\n\nFree shipping on orders above ₹1499. COD available pan-India.",
    cta: "Shop Now",
    footer: "Aneem — Dress Louder.",
  };
}
