
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '').replace(/\r$/, '');
            if (value) process.env[key] = value;
        }
    });
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkIds() {
    console.log('Checking IDs...');
    const { data, error } = await supabase.from('secciones_electorales').select('id, distrito').limit(10);
    if (error) console.error(error);
    else console.log('Sample IDs:', data);

    // Check if ID 0 exists
    const { data: zeroData } = await supabase.from('secciones_electorales').select('*').eq('id', 0);
    console.log('ID 0 exists?', zeroData && zeroData.length > 0);

    // Check ID 439 (from screenshot)
    const { data: id439 } = await supabase.from('secciones_electorales').select('id, distrito').eq('id', 439);
    console.log('ID 439 exists?', id439);
}

checkIds();
