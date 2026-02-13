
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

async function testSpatial() {
    console.log('Testing spatial filter...');
    const lat = 20.5888;
    const lng = -100.3899;
    // WKT Point
    const wkt = `POINT(${lng} ${lat})`;

    // Note: Supabase JS filters for PostGIS might need specific syntax or extensions.
    // Commonly used: .filter('geom', 'st_contains', ...) isn't standard in JS lib unless PostgREST supports it.
    // Usually one uses .rpc for this.

    // BUT, let's try a simple filter if possible.
    // Actually, I'll essentially try to recreate the "Client Side" logic but fetching all data first to see if it's feasible.

    console.log("Fetching all geometries to test client-side feasibility...");
    const { data, error } = await supabase.from('secciones_electorales').select('id, geom');

    if (error) {
        console.error("Fetch error:", error);
        return;
    }

    console.log(`Fetched ${data.length} sections.`);
    console.log(`Sample geom:`, JSON.stringify(data[0].geom).substring(0, 50));

    // If I can fetch them, I can use @turf/boolean-point-in-polygon in the frontend!
    // It's robust.
}

testSpatial();
