
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

async function verify() {
    console.log('Verifying Database Updates...');

    // Check District 5 (No PAN Alliance)
    console.log('\n--- District 5 (Expect: PAN Only vs Morena Alliance) ---');
    // Random section from District 5 (e.g., 387 as user mentioned, or find one)
    // Section 387 is District 5 per CSV.
    const { data: d5, error: e5 } = await supabase.from('secciones_electorales').select('id, meta_data').eq('id', 387).single();
    if (d5) {
        const c = d5.meta_data.electoral_2024.calculated;
        const r = d5.meta_data.electoral_2024.raw;
        console.log(`Section 387:`);
        console.log(`  Raw PAN: ${r.pan}`);
        console.log(`  Calc Blue: ${c.votes_pan_alliance} (Should match PAN if no alliance)`);
        console.log(`  Raw Morena: ${r.morena}, Combos: ${r.morena_pt_pvem + r.morena_pt + r.morena_pvem}`);
        console.log(`  Calc Red: ${c.votes_morena_alliance} (Should be sum)`);
        console.log(`  Winner: ${c.winner}`);
    }

    // Check District 11 (No Morena Alliance, Yes PAN Alliance)
    console.log('\n--- District 11 (Expect: PAN Alliance vs Morena Only) ---');
    // Need a section from District 11. Let's find one.
    // I can query Supabase for section where district=11? No, district is in `meta_data` or column? 
    // Column `distrito`.
    const { data: d11 } = await supabase.from('secciones_electorales').select('id, meta_data').eq('distrito', 11).limit(1).single();
    if (d11) {
        const c = d11.meta_data.electoral_2024.calculated;
        const r = d11.meta_data.electoral_2024.raw;
        console.log(`Section ${d11.id}:`);
        console.log(`  Raw PAN: ${r.pan}, Combos PAN: ${r.pan_pri_prd + r.pan_pri + r.pan_prd}`);
        console.log(`  Calc Blue: ${c.votes_pan_alliance} (Should be sum)`);
        console.log(`  Raw Morena: ${r.morena}`);
        console.log(`  Calc Red: ${c.votes_morena_alliance} (Should match Morena if no alliance)`);
    }
}

verify();
