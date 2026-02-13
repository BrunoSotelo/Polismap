
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Manual .env parser for robust environment loading
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
    console.log('✅ Loaded .env.local manually');
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: Missing credentials.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../src/data');

async function seedGeoJSON() {
    console.log('🗺️  Starting GeoJSON Seed...');

    const geoJsonPath = path.join(DATA_DIR, 'Distrito6.json');
    if (!fs.existsSync(geoJsonPath)) {
        console.warn(`⚠️  Warning: File not found at ${geoJsonPath}`);
        return;
    }

    const rawData = fs.readFileSync(geoJsonPath, 'utf-8');
    const geojson = JSON.parse(rawData);

    let insertedCount = 0;
    let errorCount = 0;

    for (const feature of geojson.features) {
        // Logic 1: Direct property
        let seccionId = feature.properties.seccion || feature.properties.SECTION;
        const distritoId = feature.properties.distrito || 6;

        // Logic 2: Parse "Sección 381" from name
        if (!seccionId && feature.properties.name) {
            const match = feature.properties.name.match(/Sección\s+(\d+)/i);
            if (match) {
                seccionId = match[1];
            }
        }

        if (!seccionId) {
            console.warn('   Skipping feature without seccion ID', feature.properties);
            continue;
        }

        const { error } = await supabase
            .from('secciones_electorales')
            .upsert({
                id: parseInt(seccionId),
                distrito: parseInt(distritoId),
                geom: feature.geometry,
                meta_data: feature.properties
            });

        if (error) {
            console.error(`   ❌ Error inserting section ${seccionId}:`, error.message);
            errorCount++;
        } else {
            insertedCount++;
        }
    }

    console.log(`✅ GeoJSON Seed Complete: ${insertedCount} inserted, ${errorCount} errors.`);
}

main();

async function main() {
    await seedGeoJSON();
}
