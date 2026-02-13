
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env vars
// We assume .env.local exists in root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportSections() {
    console.log("Fetching sections...");

    // We need ID, geom, Distrito, Municipio.
    // We do NOT need meta_data for the geometry file (kept in DB to be dynamic)
    // But typically we keep a minimal set of props for styling if DB fails.
    const { data, error } = await supabase
        .from('secciones_electorales')
        .select('id, distrito, municipio, geom');

    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    console.log(`Fetched ${data.length} sections.`);

    const features = data.map(row => {
        if (!row.geom) return null;
        return {
            type: "Feature",
            geometry: row.geom, // PostGIS returns GeoJSON if configured, or we might need to parse. using supabase client usually returns JSON for geometry columns if cast correctly? 
            // Actually, Supabase PostGIS often returns geometry as string or object depending on headers.
            // Let's verify. If it's a string (WKB/Hex), we need conversion.
            // But usually accessing it via JS client gives GeoJSON object if 'select' didn't specify text.
            // Wait, we need to check if we need .select('*, geom:geom::geojson') or similar.
            // Standard supabase-js with postgis: usually returns the geometry object directly if column type is geometry.
            // Let's assume it returns object. If not we'll debug.
            properties: {
                id: row.id,
                distrito: row.distrito,
                municipio: row.municipio,
                type: 'section'
            }
        };
    }).filter(f => f !== null);

    const geojson = {
        type: "FeatureCollection",
        features: features
    };

    const outPath = path.resolve(__dirname, '../public/maps/secciones.json');
    fs.writeFileSync(outPath, JSON.stringify(geojson));
    console.log(`Exported to ${outPath}`);
    console.log(`Total size: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB`);
}

exportSections();
