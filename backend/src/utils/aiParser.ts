export interface ParsedPropertyDraft {
  type?: 'VILLA' | 'APARTMENT' | 'LAND' | 'BUILDING' | 'OFFICE' | string;
  neighborhood?: string;
  price?: number;
  area?: number;
  streetWidth?: number;
  deedNumber?: string;
}

export interface IAIParserEngine {
  parse(text: string): Promise<ParsedPropertyDraft>;
}

/**
 * Heuristic-based Parser using Regex and Keyword matching for Arabic real estate descriptions
 */
export class HeuristicParserEngine implements IAIParserEngine {
  async parse(text: string): Promise<ParsedPropertyDraft> {
    const draft: ParsedPropertyDraft = {};
    const normalizedText = this.normalizeArabic(text);

    // 1. Extract Type
    if (normalizedText.includes('فيلا') || normalizedText.includes('فلل')) {
      draft.type = 'VILLA';
    } else if (normalizedText.includes('شقه') || normalizedText.includes('شقق')) {
      draft.type = 'APARTMENT';
    } else if (normalizedText.includes('ارض') || normalizedText.includes('اراضي')) {
      draft.type = 'LAND';
    } else if (normalizedText.includes('عماره') || normalizedText.includes('عماير')) {
      draft.type = 'BUILDING';
    } else if (normalizedText.includes('مكتب') || normalizedText.includes('مكاتب') || normalizedText.includes('معرض')) {
      draft.type = 'OFFICE';
    } else {
      draft.type = 'VILLA'; // Default fallback
    }

    // 2. Extract Neighborhood (حي)
    // Matches expressions like "حي الياسمين" or "في حي النرجس"
    const neighborhoodRegex = /(?:حي\s+|في\s+حي\s+)([^\s،,.]+)/i;
    const neighborhoodMatch = normalizedText.match(neighborhoodRegex);
    if (neighborhoodMatch && neighborhoodMatch[1]) {
      draft.neighborhood = neighborhoodMatch[1].trim();
    } else {
      // Direct keyword search fallback for common Riyadh neighborhoods
      const commonNeighborhoods = ['الياسمين', 'الملقا', 'الصحافة', 'النخيل', 'العقيق', 'القيروان', 'النرجس', 'القرطبة', 'العارض', 'الندى'];
      for (const nh of commonNeighborhoods) {
        if (normalizedText.includes(nh)) {
          draft.neighborhood = nh;
          break;
        }
      }
      if (!draft.neighborhood) {
        draft.neighborhood = 'الياسمين'; // Default fallback
      }
    }

    // 3. Extract Area (المساحة)
    // Matches "مساحة 450" or "المساحة: 400" or "400 متر" or "400م"
    const areaRegex = /(?:مساحه|المساحه)\s*(?::|تساوي)?\s*([\d,.]+)|([\d,.]+)\s*(?:متر|م٢|م)/i;
    const areaMatch = normalizedText.match(areaRegex);
    if (areaMatch) {
      const areaValStr = areaMatch[1] || areaMatch[2];
      if (areaValStr) {
        const areaVal = parseFloat(areaValStr.replace(/,/g, ''));
        if (!isNaN(areaVal)) draft.area = areaVal;
      }
    }
    if (!draft.area) draft.area = 300; // Default fallback

    // 4. Extract Price (السعر)
    // Matches "بسعر 3,500,000" or "السعر: 1200000" or "بمليون ونصف" etc.
    const priceRegex = /(?:سعر|السعر|بسعر|المطلوب|سوم|سيمت|بـ)\s*(?::|تساوي)?\s*([\d,.]+)/i;
    const priceMatch = normalizedText.match(priceRegex);
    if (priceMatch && priceMatch[1]) {
      const priceVal = parseFloat(priceMatch[1].replace(/,/g, ''));
      if (!isNaN(priceVal) && priceVal > 1000) { // filter out small numbers that might be street widths or area
        draft.price = priceVal;
      }
    }
    // Check for text based millions e.g. "مليون"
    if (!draft.price) {
      if (normalizedText.includes('مليون')) {
        const millionMatch = normalizedText.match(/([\d.]+)\s*مليون/);
        if (millionMatch && millionMatch[1]) {
          draft.price = parseFloat(millionMatch[1]) * 1000000;
        }
      }
    }
    if (!draft.price) draft.price = 1500000; // Default fallback

    // 5. Extract Street Width (عرض الشارع)
    // Matches "شارع 20" or "عرض الشارع 15" or "شارع عرض 18م"
    const streetRegex = /(?:شارع|عرض\s+الشارع|شارع\s+عرض)\s*([\d,.]+)/i;
    const streetMatch = normalizedText.match(streetRegex);
    if (streetMatch && streetMatch[1]) {
      const streetVal = parseFloat(streetMatch[1].replace(/,/g, ''));
      if (!isNaN(streetVal)) draft.streetWidth = streetVal;
    }
    if (!draft.streetWidth) draft.streetWidth = 15; // Default fallback

    // 6. Extract Deed Number (رقم الصك)
    // Matches "صك رقم 12345" or "رقم الصك 12345"
    const deedRegex = /(?:صك\s*رقم|رقم\s*الصك|صك)\s*([\d]+)/i;
    const deedMatch = normalizedText.match(deedRegex);
    if (deedMatch && deedMatch[1]) {
      draft.deedNumber = deedMatch[1];
    } else {
      // fallback: generate a random deed number so user doesn't get duplicate errors if they edit
      draft.deedNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    }

    return draft;
  }

  // Normalizes Arabic characters for easier pattern matching (e.g. converting ة to ه, أ/إ to ا)
  private normalizeArabic(str: string): string {
    return str
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      // convert Arabic digits to English digits
      .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  }
}

/**
 * Future LLM API Engine Mock
 */
export class LlmApiParserEngine implements IAIParserEngine {
  private apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  async parse(text: string): Promise<ParsedPropertyDraft> {
    console.log('Using LLM API Engine with key:', this.apiKey.substring(0, 4) + '...');
    // In future: make Axios request to OpenAI / Gemini API and return parsed JSON.
    // For now, delegate to heuristic as a fallback.
    const fallback = new HeuristicParserEngine();
    return fallback.parse(text);
  }
}

/**
 * AI Parser Manager
 */
export class AIParserService {
  private static engine: IAIParserEngine = new HeuristicParserEngine();

  public static setEngine(newEngine: IAIParserEngine) {
    this.engine = newEngine;
  }

  public static async parseText(text: string): Promise<ParsedPropertyDraft> {
    return this.engine.parse(text);
  }
}
