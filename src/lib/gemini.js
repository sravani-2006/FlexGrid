import { GoogleGenerativeAI } from '@google/generative-ai';
// Modern Expo SDK 54 File API
import { File } from 'expo-file-system';

// Ensure you define EXPO_PUBLIC_GEMINI_API_KEY in your .env file
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

console.log("[Gemini Config] Key loaded:", API_KEY ? `${API_KEY.substring(0, 8)}...` : "EMPTY ❌");

/**
 * Converts an ArrayBuffer to a Base64 string.
 * This is needed for the new Expo File API.
 */
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in the Expo/React Native environment
  return btoa(binary);
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
    // 🔄 Trying 'gemini-1.5-flash-002' which is more stable in v1beta environments
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-002" });

    console.log("Gemini AI: Reading image using Modern File API...");
    
    // NEW SDK 54 WAY
    const file = new File(imageUri);
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);

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
          mimeType: "image/jpeg",
        },
      },
    ];

    console.log("Gemini AI: Sending request to Google Generative AI...");
    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();
    
    // Clean up potential markdown formatting if the model still outputs it
    const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(cleanedText);
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
  
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-002" });

  const result = await model.generateContent([
    `Check if this image is a civic issue (pothole, leakage, garbage, road damage).

Return ONLY JSON:
{"valid": true or false}`,
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64,
      },
    },
  ]);

  let text = result.response.text();

  // remove markdown
  text = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(text);
  } catch {
    return { valid: false };
  }
};
