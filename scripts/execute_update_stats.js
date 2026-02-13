
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
    console.error('❌ Error: Missing credentials (VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function executeUpdates() {
    console.log('🚀 Starting execute_update_stats.js...');
    const sqlPath = path.join(__dirname, 'update_secciones_stats.sql');

    if (!fs.existsSync(sqlPath)) {
        console.error('❌ SQL file not found:', sqlPath);
        return;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    const lines = sqlContent.split('\n').filter(l => l.trim().startsWith('UPDATE'));

    console.log(`📝 Found ${lines.length} update statements to process.`);

    let successCount = 0;
    let errorCount = 0;

    // Pattern: UPDATE secciones_electorales SET votos_partido_anterior = 378, meta_votos = 435, ganador_anterior = 'LISTA_NOMINAL', competitividad = 1 WHERE id = 1;
    // Note: Regex needs to be flexible with whitespace
    const regex = /UPDATE secciones_electorales SET votos_partido_anterior = (\d+), meta_votos = (\d+), ganador_anterior = '([^']+)', competitividad = (\d+) WHERE id = (\d+);/;

    // Process in chunks to avoid overwhelming the network
    const CHUNK_SIZE = 50;
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
        const chunk = lines.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(async (line) => {
            const match = line.match(regex);
            if (!match) {
                console.warn('   ⚠️  Skipping malformed line:', line);
                return;
            }

            const [_, votos_partido_anterior, meta_votos, ganador_anterior, competitividad, id] = match;

            const { error } = await supabase
                .from('secciones_electorales')
                .update({
                    votos_partido_anterior: parseInt(votos_partido_anterior),
                    meta_votos: parseInt(meta_votos),
                    ganador_anterior: ganador_anterior,
                    competitividad: parseInt(competitividad)
                })
                .eq('id', parseInt(id));

            if (error) {
                console.error(`   ❌ Error updating section ${id}:`, error.message);
                errorCount++;
            } else {
                successCount++;
            }
        });

        await Promise.all(promises);
        process.stdout.write(`\r✅ Processed ${Math.min(i + CHUNK_SIZE, lines.length)} / ${lines.length} updates...`);
    }

    console.log('\n');
    console.log(`🎉 Finished! Success: ${successCount}, Errors: ${errorCount}`);
}

executeUpdates().catch(err => console.error(err));
