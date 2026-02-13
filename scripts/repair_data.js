
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// --- Geo Logic (Vendored here for script self-containment) ---
function pointInPolygon(point, vs) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function pointInGeometry(point, geometry) {
    if (geometry.type === 'Polygon') {
        return pointInPolygon(point, geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
        for (const polygon of geometry.coordinates) {
            if (pointInPolygon(point, polygon[0])) return true;
        }
    }
    return false;
}

function findSection(lat, lng, sections) {
    const point = [lng, lat];
    for (const section of sections) {
        if (section.geom && pointInGeometry(point, section.geom)) {
            return section.id;
        }
    }
    return null;
}
// ------------------------------------------

// .env setup
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

async function repairData() {
    console.log('🚀 Starting Data Repair...');

    // 1. Fetch Sections
    console.log('Fetching sections...');
    const { data: sections, error: secErr } = await supabase.from('secciones_electorales').select('id, geom');
    if (secErr) {
        console.error('Failed to load sections:', secErr);
        return;
    }
    console.log(`Loaded ${sections.length} sections.`);

    // 2. Repair Bitacoras
    console.log('Fetching broken bitacoras...');
    const { data: bitacoras, error: bitErr } = await supabase
        .from('bitacoras')
        .select('*')
        .is('seccion_id', null)
        .not('lat', 'is', null);

    if (bitErr) {
        console.error('Failed to load bitacoras:', bitErr);
    } else {
        console.log(`Found ${bitacoras.length} bitacoras needing repair.`);
        let repaired = 0;
        for (const b of bitacoras) {
            const sectionId = findSection(b.lat, b.lng, sections);
            if (sectionId) {
                const { error } = await supabase
                    .from('bitacoras')
                    .update({ seccion_id: sectionId })
                    .eq('id', b.id);
                if (!error) repaired++;
            } else {
                console.warn(`Could not find section for Bitacora ${b.id} at ${b.lat}, ${b.lng}`);
            }
        }
        console.log(`✅ Repaired ${repaired} bitacoras.`);
    }

    // 3. Repair Leaders
    console.log('Fetching broken leaders...');
    const { data: leaders, error: leadErr } = await supabase
        .from('lideres')
        .select('*')
        .is('seccion_id', null) // Leaders usually have seccion_id from manual input, but let's check nulls
        .not('lat', 'is', null);

    if (leadErr) {
        console.error('Failed to load leaders:', leadErr);
    } else {
        console.log(`Found ${leaders.length} leaders.`);
        // Note: Leaders might have seccion_id = 0 or mismatch. But let's only fix NULLs for now to be safe.
        // Or if the user wants to enforce Geometry > Manual Input?
        // The user complained about bitacoras. Let's stick to null repair.
        let repaired = 0;
        for (const l of leaders) {
            const sectionId = findSection(l.lat, l.lng, sections);
            if (sectionId) {
                const { error } = await supabase
                    .from('lideres')
                    .update({ seccion_id: sectionId })
                    .eq('id', l.id);
                if (!error) repaired++;
            }
        }
        console.log(`✅ Repaired ${repaired} leaders.`);
    }

    console.log('🎉 Repair Complete.');
}

repairData().catch(console.error);
