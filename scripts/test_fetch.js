
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing keys.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    console.log("Testing fetch with ANON KEY...");
    const { data, error } = await supabase
        .from('secciones_electorales')
        .select('id, distrito')
        .limit(5);

    if (error) {
        console.error("Fetch Error:", error);
    } else {
        console.log("Fetch Success. Rows:", data.length);
        console.log("Sample:", data[0]);
    }
}

testFetch();
