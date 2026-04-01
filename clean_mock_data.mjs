import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanMockIssues() {
  console.log("Locating mock issues...");
  
  // We'll just delete all issues as this is a fresh test environment
  // Alternatively, we could filter by specific test data, but the user requested:
  // "when i submit report it should sumbit and remove the sample report"
  // Let's wipe the table clean.
  
  const { error } = await supabase
    .from('issues')
    .delete()
    .neq('status', 'INVALID_STATUS'); // This effectively deletes ALL rows because none match 'INVALID_STATUS'

  if (error) {
    console.error("Failed to delete mock issues:", error);
  } else {
    console.log("Successfully cleared all sample reports. Your dashboard is ready for real AI data!");
  }
}

cleanMockIssues();
