
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../Resultados Diputacion local 2024 - Concentrado.csv');

try {
    const data = fs.readFileSync(csvPath, 'utf8');
    const lines = data.split('\n');
    const headers = lines[0].split(',');

    const swingSections = [];

    // Find column indices
    const idxDistrito = headers.indexOf('DISTRITO_LOCAL'); // Adjust if needed based on file check
    const idxIdDistrito = headers.indexOf('ID_DISTRITO_LOCAL');
    const idxSeccion = headers.indexOf('SECCION');
    const idxTotal = headers.indexOf('TOTAL_VOTOS');

    // Parties to compare (Top ones based on file)
    const parties = ['PAN', 'PRI', 'MORENA', 'PVEM', 'MC', 'PT'];
    const idxParties = parties.map(p => ({ name: p, idx: headers.indexOf(p) }));

    let count6 = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].split(',');
        if (line.length < 5) continue;

        const distritoId = line[idxIdDistrito];

        // Filter for District 6 (Assuming ID is '6' or Name contains '6')
        if (distritoId !== '6') continue;
        count6++;

        const seccion = line[idxSeccion];
        // Calculate votes
        const votes = idxParties.map(p => ({
            name: p.name,
            count: parseInt(line[p.idx]) || 0
        }));

        // Sort by votes descending
        votes.sort((a, b) => b.count - a.count);

        const first = votes[0];
        const second = votes[1];
        const total = parseInt(line[idxTotal]) || 1;

        const margin = first.count - second.count;
        const marginPercent = (margin / total) * 100;

        // CRITERIA: Swing section if margin < 10%
        if (marginPercent < 15) {
            swingSections.push({
                seccion,
                winner: first.name,
                runnerUp: second.name,
                margin: Math.round(marginPercent * 10) / 10, // 1 decimal
                total_votes: total
            });
        }
    }

    console.log(`Found ${swingSections.length} swing sections in District 6 out of ${count6} total rows.`);
    console.log(JSON.stringify(swingSections, null, 2));

} catch (err) {
    console.error("Error reading CSV:", err);
}
