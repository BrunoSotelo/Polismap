
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const csvPath = path.resolve(process.cwd(), 'Resultados Diputacion local 2024 - Concentrado.csv');
const fileContent = fs.readFileSync(csvPath, 'utf-8');
const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true
});

const districts = {};

records.forEach(row => {
    const dist = parseInt(row.ID_DISTRITO_LOCAL);
    if (!dist) return;

    if (!districts[dist]) {
        districts[dist] = {
            pan_coalition_votes: 0,
            morena_coalition_votes: 0
        };
    }

    const pan_combos =
        parseInt(row['PAN-PRI-PRD'] || 0) +
        parseInt(row['PAN-PRI'] || 0) +
        parseInt(row['PAN-PRD'] || 0) +
        parseInt(row['PRI-PRD'] || 0);

    const morena_combos =
        parseInt(row['PVEM-MORENA-PT'] || 0) +
        parseInt(row['PVEM-MORENA'] || 0) +
        parseInt(row['PVEM-PT'] || 0) +
        parseInt(row['MORENA-PT'] || 0);

    districts[dist].pan_coalition_votes += pan_combos;
    districts[dist].morena_coalition_votes += morena_combos;
});

console.log('District Coalition Analysis (Non-zero means Alliance existed):');
console.table(districts);
