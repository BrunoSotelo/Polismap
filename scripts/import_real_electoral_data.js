
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

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

async function importData() {
    console.log('🚀 Starting Smart Import (Dynamic Coalitions)...');

    // 1. Read CSV
    const csvPath = path.resolve(process.cwd(), 'Resultados Diputacion local 2024 - Concentrado.csv');
    if (!fs.existsSync(csvPath)) {
        console.error('❌ CSV file not found at:', csvPath);
        return;
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });

    console.log(`Parsed ${records.length} rows.`);

    // 2. Aggregate by Section AND Detect District Coalitions
    const sections = {}; // sectionId -> stats
    // 2. Strict District Rules (Provided by User)
    // Defines which parties allow amalgamation for each block.
    // Parties NOT in the list run separately.
    const DISTRICT_RULES = {
        1: { pan: ['PAN', 'PRI', 'PRD'], morena: ['MORENA', 'PVEM', 'PT'] },
        2: { pan: ['PAN', 'PRI', 'PRD'], morena: ['MORENA', 'PVEM', 'PT'] },
        3: { pan: ['PAN', 'PRI', 'PRD'], morena: ['MORENA', 'PVEM', 'PT'] },
        4: { pan: ['PAN', 'PRD'], morena: ['MORENA', 'PVEM', 'PT'] },
        5: { pan: ['PAN'], morena: ['MORENA', 'PVEM', 'PT'] },
        6: { pan: ['PAN', 'PRD'], morena: ['MORENA', 'PVEM', 'PT'] }, // PRI solo
        7: { pan: ['PAN', 'PRD'], morena: ['MORENA', 'PVEM', 'PT'] },
        8: { pan: ['PAN'], morena: ['MORENA', 'PT'] },       // PVEM solo
        9: { pan: ['PAN', 'PRI'], morena: ['MORENA', 'PVEM', 'PT'] },
        10: { pan: ['PAN', 'PRI', 'PRD'], morena: ['MORENA', 'PVEM', 'PT'] },
        11: { pan: ['PAN', 'PRI', 'PRD'], morena: ['MORENA'] },           // PT, PVEM solos
        12: { pan: ['PAN', 'PRD'], morena: ['MORENA'] },
        13: { pan: ['PAN', 'PRD'], morena: ['MORENA'] },
        14: { pan: ['PAN', 'PRI', 'PRD'], morena: ['MORENA'] },
        15: { pan: ['PAN', 'PRI', 'PRD'], morena: ['MORENA', 'PVEM', 'PT'] },
    };

    // Helper: Map CSV columns to their constituent parties
    const COLUMN_COMPONENTS = {
        'pan': ['PAN'], 'pri': ['PRI'], 'prd': ['PRD'],
        'morena': ['MORENA'], 'pt': ['PT'], 'pvem': ['PVEM'], 'mc': ['MC'],
        'pan_pri_prd': ['PAN', 'PRI', 'PRD'],
        'pan_pri': ['PAN', 'PRI'],
        'pan_prd': ['PAN', 'PRD'],
        'pri_prd': ['PRI', 'PRD'],
        'morena_pt_pvem': ['MORENA', 'PT', 'PVEM'],
        'morena_pt': ['MORENA', 'PT'],
        'morena_pvem': ['MORENA', 'PVEM'],
        'pt_pvem': ['PT', 'PVEM']
    };

    // Helper: Sum votes for an alliance based on allowed parties
    const calculateAllianceVotes = (stats, allowedParties) => {
        let total = 0;
        const allowedSet = new Set(allowedParties);

        // Iterate over all possible vote fields in 'stats'
        Object.keys(COLUMN_COMPONENTS).forEach(colKey => {
            const components = COLUMN_COMPONENTS[colKey];
            // Check if ALL components of this column are in the allowed alliance
            // e.g. 'pan_pri' (PAN, PRI). If allowed is [PAN, PRD], this fails (PRI not allowed).
            // This prevents counting invalid coalition votes.
            const isFullyValid = components.every(c => allowedSet.has(c));

            if (isFullyValid) {
                total += (stats[colKey] || 0);
            }
        });
        return total;
    };



    // Helper to parse int safely
    const toInt = (val) => {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 0 : parsed;
    };

    // First Pass: Aggregate
    records.forEach(row => {
        const sectionId = toInt(row.SECCION);
        const districtId = toInt(row.ID_DISTRITO_LOCAL);
        if (!sectionId) return;

        if (!sections[sectionId]) {
            sections[sectionId] = {
                district_id: districtId,
                pan: 0, pri: 0, prd: 0, morena: 0, pt: 0, pvem: 0, mc: 0,
                lista_nominal: 0, total_votos: 0,
                // Combos
                pan_pri_prd: 0, pan_pri: 0, pan_prd: 0, pri_prd: 0,
                morena_pt_pvem: 0, morena_pt: 0, morena_pvem: 0, pt_pvem: 0
            };
        }

        const s = sections[sectionId];
        // ... (Same accumulation logic as before) ...
        // Basic Votes
        s.pan += toInt(row.PAN);
        s.pri += toInt(row.PRI);
        s.prd += toInt(row.PRD);
        s.morena += toInt(row.MORENA);
        s.pvem += toInt(row.PVEM);
        s.pt += toInt(row.PT);
        s.mc += toInt(row.MC);
        s.lista_nominal += toInt(row.LISTA_NOMINAL);
        s.total_votos += toInt(row.TOTAL_VOTOS);
        // Coalitions
        s.pan_pri_prd += toInt(row['PAN-PRI-PRD']);
        s.pan_pri += toInt(row['PAN-PRI']);
        s.pan_prd += toInt(row['PAN-PRD']);
        s.pri_prd += toInt(row['PRI-PRD']);
        s.morena_pt_pvem += toInt(row['PVEM-MORENA-PT']);
        s.morena_pt += toInt(row['MORENA-PT']);
        s.morena_pvem += toInt(row['PVEM-MORENA']);
        s.pt_pvem += toInt(row['PVEM-PT']);
    });

    console.log(`Aggregated data for ${Object.keys(sections).length} sections.`);

    // 3. Setup Update Batches
    let successCount = 0;
    let errorCount = 0;

    const sectionIds = Object.keys(sections);
    const BATCH_SIZE = 20;

    for (let i = 0; i < sectionIds.length; i += BATCH_SIZE) {
        const batchIds = sectionIds.slice(i, i + BATCH_SIZE);
        const updates = batchIds.map(async (id) => {
            const stats = sections[id];

            // GET RULE FOR THIS DISTRICT
            // Default to stricter rules (no alliance) if logic missing
            const rules = DISTRICT_RULES[stats.district_id] || { pan: ['PAN'], morena: ['MORENA'] };

            // CALCULATE ALLIANCES
            const votes_pan_side = calculateAllianceVotes(stats, rules.pan);
            const votes_morena_side = calculateAllianceVotes(stats, rules.morena);

            // DETERMINE WINNER
            // Candidates: 
            // 1. PAN Alliance
            // 2. Morena Alliance
            // 3. Rivals (parties NOT in the primary alliances)

            let winner = 'MORENA';
            let max_votes = votes_morena_side;

            if (votes_pan_side > max_votes) {
                winner = 'PAN';
                max_votes = votes_pan_side;
            }

            // Check independent runnings (Parties NOT in alliance rules)
            // e.g. If PRI is not in rules.pan, check its raw vote
            ['PRI', 'PRD', 'PAN', 'MC', 'PVEM', 'PT', 'morena'].forEach(partyTag => {
                const upperTag = partyTag.toUpperCase();

                // If this party is NOT in the main alliances, it competes solo
                const inPan = rules.pan.includes(upperTag);
                const inMorena = rules.morena.includes(upperTag);

                if (!inPan && !inMorena) {
                    // Check its raw votes. 
                    // Note: 'stats' keys are lowercase ('pri', 'mc')
                    const rawVotes = stats[partyTag.toLowerCase()] || 0;
                    if (rawVotes > max_votes) {
                        winner = upperTag;
                        max_votes = rawVotes;
                    }
                }
            });

            // Metadata structure
            const meta_data = {
                electoral_2024: {
                    raw: stats,
                    calculated: {
                        votes_pan_alliance: votes_pan_side,
                        votes_morena_alliance: votes_morena_side,
                        winner: winner,
                        participation_percent: (stats.total_votos / stats.lista_nominal * 100).toFixed(1),
                        config_used: rules // Store config for debugging
                    }
                }
            };

            // Update
            const { error } = await supabase
                .from('secciones_electorales')
                .update({
                    meta_data: meta_data,
                    votos_partido_anterior: votes_pan_side,
                    ganador_anterior: winner
                })
                .eq('id', id);

            if (error) {
                console.error(`Error updating section ${id}:`, error.message);
                errorCount++;
            } else {
                successCount++;
            }
        });

        await Promise.all(updates);
        process.stdout.write(`\rProgress: ${Math.min(i + BATCH_SIZE, sectionIds.length)}/${sectionIds.length} updated...`);
    }

    console.log('\n');
    console.log(`✅ Completed. Success: ${successCount}, Errors: ${errorCount}`);
}

importData().catch(console.error);
