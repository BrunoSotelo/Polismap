
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');
console.log("Loading env from:", envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("Error loading .env file:", result.error);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role Key for Admin writes

console.log("URL Loaded:", !!supabaseUrl, supabaseUrl?.slice(0, 10) + '...');
console.log("Key Loaded:", !!supabaseServiceKey, supabaseServiceKey?.slice(0, 10) + '...');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    // process.exit(1); // Try to proceed? No, fatal.
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DATA_DIR = path.join(__dirname, '../src/data');

async function seedDistricts() {
    console.log("Starting seed process...");

    const files = fs.readdirSync(DATA_DIR).filter(f => f.match(/Distrito(\d+).*\.(json|geojson)$/));
    console.log(`Found ${files.length} district files.`);

    for (const file of files) {
        const distMatch = file.match(/Distrito(\d+)/);
        const distritoId = distMatch ? parseInt(distMatch[1]) : 0;
        const filePath = path.join(DATA_DIR, file);

        console.log(`Processing ${file} (Distrito ${distritoId})...`);

        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const geoJson = JSON.parse(rawContent);

        if (!geoJson.features || !Array.isArray(geoJson.features)) {
            console.warn(`Skipping ${file}: Invalid GeoJSON structure.`);
            continue;
        }

        const rowsToInsert = [];

        for (const feature of geoJson.features) {
            let sectionId = feature.properties?.id;

            // Fallback: extract ID from name "Sección 123"
            if (!sectionId && feature.properties?.name) {
                const match = feature.properties.name.match(/Sección\s+(\d+)/i);
                if (match) sectionId = parseInt(match[1]);
            }

            if (!sectionId) {
                console.warn(`Skipping feature in ${file}: No Section ID found.`);
                continue;
            }

            // Convert LineString to Polygon if needed (Polygon Close Fix)
            if (feature.geometry.type === 'LineString') {
                const coords = feature.geometry.coordinates;
                const first = coords[0];
                const last = coords[coords.length - 1];
                if (first[0] === last[0] && first[1] === last[1]) {
                    feature.geometry.type = 'Polygon';
                    feature.geometry.coordinates = [coords];
                }
            }

            rowsToInsert.push({
                id: sectionId,
                distrito: distritoId,
                municipio: 'Querétaro', // Default or extract?
                geom: feature.geometry, // Supabase/PostGIS can often ingest GeoJSON geometry object directly
                meta_data: feature.properties
            });
        }

        if (rowsToInsert.length > 0) {
            // Deduplicate rows by ID before upserting (Distrito 6 seems to have duplicates internally)
            const uniqueRows = Array.from(new Map(rowsToInsert.map(item => [item.id, item])).values());

            // Upsert to avoid Duplicates
            const { error } = await supabase
                .from('secciones_electorales')
                .upsert(uniqueRows, { onConflict: 'id' });

            if (error) {
                console.error(`Error inserting ${file}:`, error);
            } else {
                console.log(`Successfully inserted ${uniqueRows.length} sections from ${file} (deduplicated from ${rowsToInsert.length}).`);
            }
        }
    }

    console.log("Seeding complete.");
}

seedDistricts().catch(console.error);
