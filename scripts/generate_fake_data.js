import { fakerES_MX as faker } from '@faker-js/faker';
import fs from 'fs';
import path from 'path';

const districts = [5, 6];
const counts = {
    affinities: 200,
    leaders: 20,
    bitacoras: 15
};

// CSV Helpers
const createCSVWriter = (filename, headers) => {
    const fullHeader = headers.join(',') + '\n';
    fs.writeFileSync(filename, fullHeader);
    return (row) => {
        const line = row.map(val => {
            if (val === null || val === undefined) return '';
            const str = String(val).replace(/"/g, '""'); // Escape quotes
            return `"${str}"`; // Wrap in quotes
        }).join(',') + '\n';
        fs.appendFileSync(filename, line);
    };
};

const outputDir = 'data_exports';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// 1. Affinities (Simpatizantes)
const affinitiesHeaders = ['nombre', 'direccion', 'edad', 'curp', 'ine_clave', 'seccion_id', 'confidence_score', 'apellido_paterno', 'apellido_materno', 'telefono', 'calle', 'colonia', 'municipio', 'cp'];
const writeAffinity = createCSVWriter(path.join(outputDir, 'affinities.csv'), affinitiesHeaders);

// 2. Leaders (Lideres)
const leadersHeaders = ['nombre', 'telefono', 'email', 'lat', 'lng', 'activo', 'seccion_id'];
const writeLeader = createCSVWriter(path.join(outputDir, 'lideres.csv'), leadersHeaders);

// 3. Bitacoras
const bitacorasHeaders = ['user_id', 'tipo', 'descripcion', 'aforo', 'fecha', 'compromisos', 'comentarios', 'lat', 'lng', 'seccion_id'];
const writeBitacora = createCSVWriter(path.join(outputDir, 'bitacoras.csv'), bitacorasHeaders);


console.log('Generating CSV data...');

districts.forEach(distrito => {
    console.log(`Processing District ${distrito}...`);

    // Helper to pick a random section (mock)
    // We assume section IDs are roughly district * 100 + random(1-50) for simplicity in CSV if we don't have DB access
    // Or we stick to just an integer since the DB will validate. 
    // Wait, the previous SQL used a subquery. For CSV we need literal values.
    // I'll assume valid sections are roughly 500-550 for Dist 5 and 600-650 for Dist 6.
    const getRandomSection = () => {
        const base = distrito * 100; // e.g., 500 or 600
        return base + faker.number.int({ min: 1, max: 50 });
    };

    // 1. Affinities
    for (let i = 0; i < counts.affinities; i++) {
        const firstName = faker.person.firstName();
        const lastName1 = faker.person.lastName();
        const lastName2 = faker.person.lastName();

        writeAffinity([
            `${firstName} ${lastName1} ${lastName2}`, // nombre full
            faker.location.streetAddress({ useFullAddress: true }), // direccion
            faker.number.int({ min: 18, max: 90 }), // edad
            faker.string.alphanumeric(18).toUpperCase(), // curp
            faker.string.alphanumeric(18).toUpperCase(), // ine_clave
            getRandomSection(), // seccion_id
            1.0, // confidence_score
            lastName1, // apellido_paterno
            lastName2, // apellido_materno
            faker.phone.number(), // telefono
            faker.location.street(), // calle
            faker.location.streetAddress(), // colonia (mock)
            'Querétaro', // municipio
            faker.location.zipCode() // cp
        ]);
    }

    // 2. Leaders
    for (let i = 0; i < counts.leaders; i++) {
        writeLeader([
            faker.person.fullName(), // nombre
            faker.phone.number(), // telefono
            faker.internet.email(), // email
            faker.location.latitude({ max: 20.7, min: 20.5 }), // lat
            faker.location.longitude({ max: -100.3, min: -100.5 }), // lng
            true, // activo
            getRandomSection() // seccion_id
        ]);
    }

    // 3. Bitacoras
    for (let i = 0; i < counts.bitacoras; i++) {
        writeBitacora([
            '00000000-0000-0000-0000-000000000000', // user_id placeholder
            faker.helpers.arrayElement(['visita', 'llamada', 'evento', 'incidencia', 'otro']), // tipo
            faker.lorem.sentence(), // descripcion
            faker.number.int({ min: 5, max: 100 }), // aforo
            faker.date.recent({ days: 30 }).toISOString(), // fecha
            faker.lorem.sentence(), // compromisos
            faker.lorem.sentence(), // comentarios
            faker.location.latitude({ max: 20.7, min: 20.5 }), // lat
            faker.location.longitude({ max: -100.3, min: -100.5 }), // lng
            getRandomSection() // seccion_id
        ]);
    }
});

console.log(`Done! CSV files created in ${outputDir}/`);
