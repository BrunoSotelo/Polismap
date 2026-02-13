import fs from 'fs';
import readline from 'readline';

// --- CONFIGURATION: Define "Our Alliance" per District ---
// Keys = District IDs (1, 2, ... 15)
// Values = Array of Party columns to sum as "Our Votes"
// If specific district has no alliance, just list 'PAN'.
// If alliance exists, list 'PAN', 'PRI', 'PRD' and relevant combos will be auto-included logic below.
const ALLIANCE_CONFIG = {
    1: ['PAN', 'PRI', 'PRD'],
    2: ['PAN', 'PRI', 'PRD'],
    3: ['PAN', 'PRI', 'PRD'],
    4: ['PAN', 'PRD'],
    5: ['PAN'],
    6: ['PAN', 'PRD'],
    7: ['PAN', 'PRD'],
    8: ['PAN'],
    9: ['PAN', 'PRI'],
    10: ['PAN', 'PRI', 'PRD'],
    11: ['PAN', 'PRI', 'PRD'],
    12: ['PAN', 'PRD'],
    13: ['PAN', 'PRD'],
    14: ['PAN', 'PRI', 'PRD'],
    15: ['PAN', 'PRI', 'PRD']
};

const INPUT_FILE = './Resultados Diputacion local 2024 - Concentrado.csv';
const OUTPUT_FILE = './scripts/update_secciones_stats.sql';

// Maps to store aggregated stats
const sections = {}; // { 'seccion_id': { dist: 1, our_votes: 0, total_votes: 0, winner: '', party_votes: {}, meta: 0 } }

async function processLineByLine() {
    console.log(`Reading ${INPUT_FILE}...`);
    const fileStream = fs.createReadStream(INPUT_FILE);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let header = [];
    let isHeader = true;

    for await (const line of rl) {
        // Simple CSV parse (assuming no commas inside quotes for this specific file format)
        // If the file is stricter, we might need a regex split.
        const cols = line.split(',');

        if (isHeader) {
            header = cols.map(c => c.trim());
            isHeader = false;
            continue;
        }

        // Map columns
        const row = {};
        header.forEach((h, i) => row[h] = cols[i]);

        const distrito = parseInt(row['ID_DISTRITO_LOCAL']);
        const seccion = parseInt(row['SECCION']);

        if (isNaN(seccion)) continue;

        if (!sections[seccion]) {
            sections[seccion] = {
                id: seccion,
                distrito: distrito,
                votes: {} // Map of 'PARTY': count
            };
        }

        // Aggregate votes per party/column
        header.forEach(h => {
            // Ignore metadata columns that don't contain vote counts or should be stored separately
            if (['ID_ESTADO', 'ESTADO', 'ID_DISTRITO_LOCAL', 'DISTRITO_LOCAL', 'SECCION', 'ID_CASILLA', 'TIPO_CASILLA', 'EXT_CONTIGUA', 'UBICACION_CASILLA', 'OBSERVACIONES'].includes(h)) return;

            const val = parseInt(row[h]) || 0;

            if (h === 'TOTAL_VOTOS') {
                sections[seccion].total_votos = (sections[seccion].total_votos || 0) + val;
            } else if (h === 'LISTA_NOMINAL') {
                sections[seccion].lista_nominal = (sections[seccion].lista_nominal || 0) + val;
            } else if (['VOTOS_NULOS', 'CANDIDATOS_NO_REGISTRADOS'].includes(h)) {
                // Ignore for winner calc, but maybe store if needed? For now ignore.
            } else {
                // This is a party or coalition
                if (sections[seccion].votes[h]) {
                    sections[seccion].votes[h] += val;
                } else {
                    sections[seccion].votes[h] = val;
                }
            }
        });
    }

    console.log(`Processed ${Object.keys(sections).length} sections.`);
    generateSQL();
}

function generateSQL() {
    let sql = `-- Auto-generated electoral stats update\n`;

    // Process each section
    for (const secId in sections) {
        const data = sections[secId];
        const dist = data.distrito;

        // 1. Calculate OUR VOTES
        let ourVotes = 0;
        const allowedParties = ALLIANCE_CONFIG[dist] || ['PAN', 'PRI', 'PRD'];

        for (const [key, count] of Object.entries(data.votes)) {
            let countsForUs = false;

            if (allowedParties.includes(key)) {
                countsForUs = true;
            } else if (key.includes('-')) {
                const parts = key.split('-');
                if (parts.every(p => allowedParties.includes(p))) {
                    countsForUs = true;
                }
            }

            if (countsForUs) {
                ourVotes += count;
            }
        }

        // 2. Calculate WINNER
        // Find the party/coalition with max votes in data.votes (which now only contains parties)
        let winnerVals = Object.entries(data.votes).sort((a, b) => b[1] - a[1]);
        let winnerName = winnerVals.length > 0 ? winnerVals[0][0] : 'UNKNOWN';

        // 3. Competitiveness
        let totalVotes = data.total_votos || 0;

        // Fallback if total_votos is missing (sum of parties)
        if (totalVotes === 0 && Object.keys(data.votes).length > 0) {
            totalVotes = Object.values(data.votes).reduce((a, b) => a + b, 0);
        }

        let share = totalVotes > 0 ? (ourVotes / totalVotes) : 0;
        let comp = 2;
        if (share > 0.35) comp = 1; // High/Win
        if (share < 0.15) comp = 3; // Low

        // If we won (winnerName is in our allowed parties or represents our coalition), force Comp=1
        if (allowedParties.includes(winnerName)) {
            comp = 1;
        }
        // Also check if winnerName is a coalition of ours
        if (winnerName.includes('-')) {
            const parts = winnerName.split('-');
            if (parts.every(p => allowedParties.includes(p))) {
                comp = 1;
            }
        }

        let meta = Math.ceil(ourVotes * 1.15);

        sql += `UPDATE secciones_electorales SET votos_partido_anterior = ${ourVotes}, meta_votos = ${meta}, ganador_anterior = '${winnerName}', competitividad = ${comp} WHERE id = ${secId};\n`;
    }

    fs.writeFileSync(OUTPUT_FILE, sql);
    console.log(`Generated SQL at ${OUTPUT_FILE}`);
}

processLineByLine();
