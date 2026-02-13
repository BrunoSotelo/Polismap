
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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkGeom() {
    console.log("Fetching geom...");
    const { data, error } = await supabase
        .from('secciones_electorales')
        .select('id, geom')
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Data type of geom:", typeof data[0].geom);
        console.log("Value sample:", JSON.stringify(data[0].geom).substring(0, 100));
    }
}

checkGeom();
