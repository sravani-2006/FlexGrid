import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
// Import the modern File API (same as we used for Gemini)
import { File } from 'expo-file-system';

// pick image
export const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });

  if (!result.canceled) {
    return result.assets[0].uri;
  }

  return null;
};

// upload image
export const uploadImage = async (uri) => {
  try {
    console.log("--- MODERN SUPABASE UPLOAD (ArrayBuffer) ---");
    console.log("URI:", uri);

    const fileName = `issue_${Date.now()}.jpg`;

    // ⚡ MODERN SDK 54 WAY: Read as ArrayBuffer
    // This is much more stable for Supabase on React Native/Android
    const file = new File(uri);
    const arrayBuffer = await file.arrayBuffer();
    
    console.log("ArrayBuffer created, size:", arrayBuffer.byteLength);

    const bucketName = 'issue-photos'; 
    console.log(`Uploading to bucket: ${bucketName}...`);

    // Upload the ArrayBuffer directly
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error("❌ SUPABASE UPLOAD ERROR:", error);
      // If it's a "Bucket not found" error, we'll know exactly what to do
      throw new Error(`Supabase Storage: ${error.message || 'Check Bucket/Policy'}`);
    }

    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    console.log("✅ SUCCESS URL:", publicData.publicUrl);
    return publicData.publicUrl;

  } catch (err) {
    console.error("💥 UPLOAD FAILED:", err.message);
    throw err;
  }
};
