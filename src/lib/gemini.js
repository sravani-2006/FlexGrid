import { GoogleGenerativeAI } from '@google/generative-ai';
// Modern Expo SDK 54 File API
import { File } from 'expo-file-system';

// Ensure you define EXPO_PUBLIC_GEMINI_API_KEY in your .env file
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const STATIC_MODEL_CANDIDATES = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

let discoveredModelsCache = null;

const isUnsupportedModelError = (message = '') => {
  const lower = String(message).toLowerCase();
  return (
    lower.includes('not found for api version') ||
    lower.includes('is not supported for generatecontent') ||
    lower.includes('model not found')
  );
};

const noCompatibleModelError = () =>
  new Error('No compatible Gemini model is enabled for this API key (v1beta).');

const scoreModel = (name) => {
  const normalized = name.toLowerCase();
  if (normalized.includes('2.0-flash') && !normalized.includes('lite')) return 100;
  if (normalized.includes('2.0-flash-lite')) return 95;
  if (normalized.includes('1.5-flash')) return 90;
  if (normalized.includes('1.5-pro')) return 80;
  if (normalized.includes('flash')) return 70;
  if (normalized.includes('gemini')) return 50;
  return 10;
};

const getModelCandidates = async () => {
  if (!API_KEY) return STATIC_MODEL_CANDIDATES;
  if (discoveredModelsCache) return discoveredModelsCache;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    const payload = await response.json();
    const apiModels = Array.isArray(payload?.models) ? payload.models : [];

    const supported = apiModels
      .filter((model) => Array.isArray(model?.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent'))
      .map((model) => String(model?.name || '').replace(/^models\//, ''))
      .filter(Boolean)
      .sort((a, b) => scoreModel(b) - scoreModel(a));

    const merged = [...supported, ...STATIC_MODEL_CANDIDATES];
    discoveredModelsCache = [...new Set(merged)];
    return discoveredModelsCache;
  } catch {
    discoveredModelsCache = STATIC_MODEL_CANDIDATES;
    return discoveredModelsCache;
  }
};

const getMimeTypeFromUri = (uri = '') => {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
};

const extractJsonFromText = (text = '') => {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Gemini returned non-JSON response');
  }
};

/**
 * Converts an ArrayBuffer to a Base64 string.
 * This is needed for the new Expo File API.
 */
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary);
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let idx = 0;

  while (idx < binary.length) {
    const c1 = binary.charCodeAt(idx++);
    const c2 = binary.charCodeAt(idx++);
    const c3 = binary.charCodeAt(idx++);

    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (c2 >> 4);
    let e3 = ((c2 & 15) << 2) | (c3 >> 6);
    let e4 = c3 & 63;

    if (Number.isNaN(c2)) {
      e3 = 64;
      e4 = 64;
    } else if (Number.isNaN(c3)) {
      e4 = 64;
    }

    output += chars[e1] + chars[e2] + chars[e3] + chars[e4];
  }

  return output;
};

const generateWithRestFallback = async (prompt, base64Data, mimeType) => {
  const modelCandidates = await getModelCandidates();
  let lastError = null;
  let sawUnsupportedModelOnly = true;

  for (const modelName of modelCandidates) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      const payload = await response.json();
      if (!response.ok) {
        const restMessage = payload?.error?.message || 'Gemini REST request failed';
        lastError = new Error(restMessage);
        if (!isUnsupportedModelError(restMessage)) sawUnsupportedModelOnly = false;
        continue;
      }

      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return extractJsonFromText(text);
    } catch (err) {
      lastError = err;
      if (!isUnsupportedModelError(err?.message)) sawUnsupportedModelOnly = false;
    }
  }

  if (sawUnsupportedModelOnly) {
    throw noCompatibleModelError();
  }
  throw lastError || noCompatibleModelError();
};
/**
 * Converts a file URI into a Base64 string for API calls.
 */
export const uriToBase64 = async (uri) => {
  const file = new File(uri);
  const arrayBuffer = await file.arrayBuffer();
  return arrayBufferToBase64(arrayBuffer);
};
/**
 * Analyzes an image of a civic issue using Gemini AI to extract structured details.
 * @param {string} imageUri - Local URI of the captured/selected image
 * @returns {Promise<{title: string, description: string, category: string, severity: string}>}
 */
export const analyzeIssueImage = async (imageUri) => {
  // LOGGING FOR DIAGNOSIS
  console.log("--- GEMINI API DIAGNOSIS ---");
  console.log("EXPO_PUBLIC_GEMINI_API_KEY detected:", API_KEY ? `PRESENT` : "MISSING ❌");
  
  if (!API_KEY) {
    console.error("Gemini Configuration Error: EXPO_PUBLIC_GEMINI_API_KEY is undefined.");
    throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY in .env");
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const modelCandidates = await getModelCandidates();

    console.log("Gemini AI: Reading image using Modern File API...");
    
    // NEW SDK 54 WAY
    const file = new File(imageUri);
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);
    const mimeType = getMimeTypeFromUri(imageUri);

    if (!base64Data) {
      throw new Error("Failed to convert image to base64");
    }

    const prompt = `
      You are an AI assistant for a civic issue reporting app called FixGrid.
      Analyze this image and determine if it represents a valid civic infrastructure or public maintenance issue (e.g., potholes, water leakage, drainage problem, garbage, road damage, or streetlight issues).
      
      Return a strict JSON object with these exact keys:
      {
        "is_valid_civic_issue": boolean,
        "rejection_reason": "Provide a short reason if not a civic issue, otherwise empty string",
        "title": "A short, clear title for the issue (max 5 words)",
        "description": "A detailed 1-2 sentence description of what is visible",
        "category": "Must be exactly one of: 'Water', 'Road', 'Power', 'Drainage', 'Garbage', 'Streetlight', 'Other'. Choose the best fit.",
        "severity": "Must be exactly one of: 'low', 'medium', 'high'. Estimate based on visible impact or danger."
      }
      Important: If the image is unrelated to public infrastructure (e.g., laptop, personal electronics, food, indoor room, person), set is_valid_civic_issue to false.
      Return ONLY the raw JSON object without markdown formatting.
    `;

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
    ];

    console.log("Gemini AI: Sending request to Google Generative AI...");
    let parsed;
    let sdkError = null;
    let sawUnsupportedModelOnly = true;

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = result.response.text();
        parsed = extractJsonFromText(responseText);
        break;
      } catch (err) {
        sdkError = err;
        if (!isUnsupportedModelError(err?.message)) {
          sawUnsupportedModelOnly = false;
        }
      }
    }

    if (!parsed) {
      if (!sawUnsupportedModelOnly) {
        console.log('Gemini SDK call failed, trying REST fallback:', sdkError?.message);
      }
      try {
        parsed = await generateWithRestFallback(prompt, base64Data, mimeType);
      } catch (fallbackErr) {
        if (sawUnsupportedModelOnly && isUnsupportedModelError(sdkError?.message)) {
          throw noCompatibleModelError();
        }
        throw fallbackErr;
      }
    }

    console.log("Gemini AI Result:", parsed);
    return parsed;
  } catch (err) {
    console.error("--- GEMINI API ERROR DETECTED ---");
    console.error("ERROR MESSAGE:", err.message);
    
    // Check for specific API errors to help the user troubleshoot their key
    const lowError = err.message?.toLowerCase() || '';
    if (lowError.includes("api_key") || lowError.includes("unauthorized") || lowError.includes("403")) {
      throw new Error("Invalid or restricted Gemini API Key. Please check your credentials.");
    }
    
    throw err;
  }
};

/**
 * Validates if an image is a civic infrastructure issue.
 * @param {string} base64 - Base64 encoded image data
 * @returns {Promise<{valid: boolean}>}
 */
export const validateIssueImage = async (base64) => {
  if (!API_KEY) throw new Error("Missing Gemini API Key");
  
  const prompt = `Check if this image is a civic issue (pothole, leakage, garbage, road damage).

Return ONLY JSON:
{"valid": true or false}`;

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const modelCandidates = await getModelCandidates();
    let sawUnsupportedModelOnly = true;

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64,
            },
          },
        ]);

        const text = result.response.text();
        const parsed = extractJsonFromText(text);
        return { valid: !!parsed?.valid };
      } catch (err) {
        if (!isUnsupportedModelError(err?.message)) {
          sawUnsupportedModelOnly = false;
        }
        // try next model
      }
    }

    if (sawUnsupportedModelOnly) {
      throw noCompatibleModelError();
    }

    throw new Error('SDK model fallbacks exhausted');
  } catch (sdkErr) {
    try {
      const parsed = await generateWithRestFallback(prompt, base64, 'image/jpeg');
      return { valid: !!parsed?.valid };
    } catch {
      return { valid: false };
    }
  }
};
