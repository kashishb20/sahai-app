import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../../../lib/supabase';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: { timeout: 15000 },
});

// Active 2026 Gemini API models (free & paid tier compatible)
const MODELS = ['gemini-4-hydrogen', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];

export interface ProposedAction {
  type: 'LOG_PAYMENT' | 'RESTOCK_PRODUCT' | 'ADD_UDHAR';
  label: string;
  targetId: string;
  targetName: string;
  amount: number;
  currentValue: number;
  newValue: number;
}

// Normalize Hindi / Punjabi / Hinglish terms for deterministic write commands
function normalizeMultilingualQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/तेल|ਤੇਲ|\btel\b/g, ' oil ')
    .replace(/आटा|आटे|आते|ਆਟਾ|ਆਟੇ|\baate\b|\baata\b|\bata\b/g, ' atta ')
    .replace(/मक्खन|बटर|ਮੱਖਣ|\bmakkhan\b/g, ' butter ')
    .replace(/चीनी|ਖੰਡ|\bcheeni\b|\bchini\b/g, ' sugar ')
    .replace(/चाय|ਚਾਹ|\bchai\b/g, ' tea ')
    .replace(/दाल|ਦਾਲ|\bdaal\b/g, ' dal ')
    .replace(/चावल|ਚੌਲ|\bchawal\b/g, ' rice ')
    .replace(/बिक्री|सेल|बेच|भेज|ਵਿਕਰੀ|\bbikri\b|\bbech\b|\bsakes\b/g, ' sales ')
    .replace(/इंप्रूव|बढ़ा|बढ़ा|ज्यादा|ਵਧਾ|\bbadha\b|\bbadhao\b|\bzyada\b/g, ' increase ')
    .replace(/उधार|बाकी|खाता|ਉਧਾਰ|\bbaki\b|\bkhata\b/g, ' udhar ')
    .replace(/स्टॉक|माल|ਸਟਾਕ|\bmaal\b/g, ' stock ')
    .replace(/दिए|जमा|भुगतान|ਪੈਸੇ ਦਿੱਤੇ|\bdiye\b|\bjama\b/g, ' paid ');
}

// Deterministic intent parser for database write actions (Human-in-the-Loop)
function detectActionIntent(
  message: string,
  products: any[],
  customers: any[]
): { action?: ProposedAction; hintReply?: string } {
  const q = normalizeMultilingualQuery(message).trim();
  const numMatch = q.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) return {};

  const amount = parseFloat(numMatch[1]);
  if (amount <= 0) return {};

  // 1. Udhar Repayment: "Aman paid 200"
  if (/\b(paid|repaid|payment|diye|jama|clear|received)\b/.test(q)) {
    const matchedCustomer = customers.find((c) => {
      const firstName = c.name.toLowerCase().split(/\s+/)[0];
      return q.includes(c.name.toLowerCase()) || (firstName.length >= 3 && q.includes(firstName));
    });

    if (matchedCustomer) {
      const currentDues = Number(matchedCustomer.outstanding_balance || 0);
      return {
        action: {
          type: 'LOG_PAYMENT',
          label: `Record ₹${amount} Udhar Payment from ${matchedCustomer.name}`,
          targetId: matchedCustomer.id,
          targetName: matchedCustomer.name,
          amount,
          currentValue: currentDues,
          newValue: Math.max(0, currentDues - amount),
        },
      };
    }

    const availableNames = customers.map((c) => c.name).join(', ') || 'none yet';
    return {
      hintReply: `Customer not found in ledger. Registered customers: ${availableNames}.`,
    };
  }

  // 2. Add Udhar: "Add 300 udhar to Aman"
  if (/\b(udhar|credit|baki|khata)\b/.test(q) && !/\b(who|list|total|pending|how much|kitna)\b/.test(q)) {
    const matchedCustomer = customers.find((c) => {
      const firstName = c.name.toLowerCase().split(/\s+/)[0];
      return q.includes(c.name.toLowerCase()) || (firstName.length >= 3 && q.includes(firstName));
    });

    if (matchedCustomer) {
      const currentDues = Number(matchedCustomer.outstanding_balance || 0);
      return {
        action: {
          type: 'ADD_UDHAR',
          label: `Add ₹${amount} Udhar to ${matchedCustomer.name}'s Khata`,
          targetId: matchedCustomer.id,
          targetName: matchedCustomer.name,
          amount,
          currentValue: currentDues,
          newValue: currentDues + amount,
        },
      };
    }
  }

  // 3. Restock Product: "Restock 15 Atta"
  if (/\b(restock|add stock|stock|aaya|mangwa)\b/.test(q) && !/\b(low|alert|check|how much|kitna)\b/.test(q)) {
    const matchedProduct = products.find((p) => {
      const words = p.name.toLowerCase().split(/\s+/);
      return q.includes(p.name.toLowerCase()) || words.some((w: string) => w.length >= 3 && q.includes(w));
    });

    if (matchedProduct) {
      const currentStock = Number(matchedProduct.stock_quantity || 0);
      return {
        action: {
          type: 'RESTOCK_PRODUCT',
          label: `Restock +${amount} units of ${matchedProduct.name}`,
          targetId: matchedProduct.id,
          targetName: matchedProduct.name,
          amount,
          currentValue: currentStock,
          newValue: currentStock + amount,
        },
      };
    }
  }

  return {};
}

// Detect user's language from script + selected dropdown
function resolveLanguageInstruction(message: string, selectedLang?: string): string {
  const hasDevanagari = /[\u0900-\u097F]/.test(message);
  const hasGurmukhi = /[\u0A00-\u0A7F]/.test(message);

  if (hasGurmukhi || selectedLang === 'pa-IN') {
    return 'CRITICAL LANGUAGE RULE: Reply ONLY in natural Punjabi (Gurmukhi script, e.g., ਪੰਜਾਬੀ). Do NOT reply in English.';
  }
  if (hasDevanagari || selectedLang === 'hi-IN') {
    return 'CRITICAL LANGUAGE RULE: Reply ONLY in natural Hindi (Devanagari script, e.g., हिन्दी). Do NOT reply in English.';
  }
  return 'CRITICAL LANGUAGE RULE: Reply in the exact same language and script the user wrote in (if Roman Hindi/Hinglish, reply in natural Hinglish; if English, reply in English).';
}

export async function POST(req: Request) {
  try {
    const { message, language } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        reply: 'GEMINI_API_KEY is missing in .env.local. Please add your key and restart the server.',
      });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [productsRes, customersRes, salesRes] = await Promise.all([
      supabase.from('products').select('id, name, purchase_price, selling_price, stock_quantity, min_stock_level'),
      supabase.from('customers').select('id, name, phone, outstanding_balance'),
      supabase
        .from('sales')
        .select('total_amount, payment_type, created_at')
        .gte('created_at', startOfToday.toISOString()),
    ]);

    const products = productsRes.data || [];
    const customers = customersRes.data || [];
    const sales = salesRes.data || [];

    // Check for write action intents first
    const { action: proposedAction, hintReply } = detectActionIntent(message, products, customers);
    if (proposedAction) {
      return NextResponse.json({
        reply: `Please review and confirm this update below:`,
        action: proposedAction,
      });
    }
    if (hintReply) {
      return NextResponse.json({ reply: hintReply });
    }

    const langRule = resolveLanguageInstruction(message, language);

    const systemInstruction = `You are SahAI, an expert Indian Kirana retail advisor for Sharma General Store in Patiala, Punjab.
${langRule}

LIVE STORE DATABASE:
- PRODUCTS: ${JSON.stringify(products)}
- CUSTOMERS (Udhar Ledger): ${JSON.stringify(customers)}
- TODAY_SALES: ${JSON.stringify(sales)}

RULES:
1. Give sharp, practical, personalized advice using the exact product names, stock levels, profit margins (selling_price - purchase_price), and customer names from the database above.
2. Never recommend promoting a product whose stock_quantity is at or below min_stock_level without first warning the owner to restock it.
3. Keep responses concise (3-4 clear sentences or short bullet points) so a busy shopkeeper can read them in 5 seconds.`;

    let lastError = '';
    for (const modelName of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: message,
          config: {
            systemInstruction,
            maxOutputTokens: 800,
          },
        });

        if (response.text) {
          return NextResponse.json({ reply: response.text });
        }
      } catch (err: any) {
        lastError = `${modelName}: ${err?.status || ''} ${err?.message || err}`;
        console.error('Gemini API attempt failed:', lastError);
      }
    }

    return NextResponse.json({
      reply: `Gemini connection error (${lastError}). Check your GEMINI_API_KEY in .env.local.`,
    });
  } catch (error: any) {
    console.error('Chat Route Error:', error);
    return NextResponse.json(
      { reply: 'Server error while connecting to SahAI.' },
      { status: 500 }
    );
  }
}