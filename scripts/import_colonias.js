
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("Error loading .env file:", result.error);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const GEOJSON_PATH = path.join(__dirname, '../src/data/Colonias.geojson');

async function importColonias() {
    console.log("Starting Colonias import...");

    if (!fs.existsSync(GEOJSON_PATH)) {
        console.error("File not found:", GEOJSON_PATH);
        return;
    }

    const rawContent = fs.readFileSync(GEOJSON_PATH, 'utf-8');
    const geoJson = JSON.parse(rawContent);

    if (!geoJson.features || !Array.isArray(geoJson.features)) {
        console.error("Invalid GeoJSON format");
        return;
    }

    console.log(`Found ${geoJson.features.length} colonies. Batching inserts...`);

    const BATCH_SIZE = 50;
    let successCount = 0;
    let errorCount = 0;

    let batch = [];

    for (let i = 0; i < geoJson.features.length; i++) {
        const feature = geoJson.features[i];
        const props = feature.properties || {};

        // Extract Name and Municipality (modify keys based on your actual GeoJSON properties)
        // Common keys in Mexico: NOMBRE, MUNICIPIO, ENTIDAD, or just 'name'
        const nombre = props.NOMBRE || props.nombre || props.Name || `Colonia ${i}`;
        const municipio = props.MUNICIPIO || props.municipio || 'Querétaro';


        let geometry = feature.geometry;

        if (!geometry) {
            console.warn(`Skipping index ${i}: No geometry.`);
            continue;
        }

        // Force to MultiPolygon if the DB expects it and we have Polygon
        if (geometry.type === 'Polygon') {
            geometry = {
                type: 'MultiPolygon',
                coordinates: [geometry.coordinates]
            };
        }

        batch.push({
            nombre: nombre,
            municipio: municipio,
            geom: geometry // Supabase JS handles formatting if the column is geometry
        });

        if (batch.length >= BATCH_SIZE || i === geoJson.features.length - 1) {
            const { error } = await supabase.from('colonias').insert(batch);

            if (error) {
                console.error(`Error inserting batch at index ${i}:`, error.message);
                errorCount += batch.length;
            } else {
                successCount += batch.length;
                process.stdout.write(`\rInserted: ${successCount}/${geoJson.features.length}`);
            }
            batch = []; // clear batch
        }
    }

    console.log("\nImport complete.");
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
}

importColonias().catch(console.error);
