
import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import path from 'path';

const templatePath = path.join(process.cwd(), 'public/templates/template_default.docx');

console.log(`🔍 Analizando plantilla: ${templatePath}`);

if (!fs.existsSync(templatePath)) {
    console.error("❌ Error: No se encontró el archivo template_default.docx");
    process.exit(1);
}

const content = fs.readFileSync(templatePath);
const zip = new PizZip(content);

try {
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });
    console.log("✅ La plantilla es VÁLIDA. El formato interno está limpio.");
} catch (error) {
    console.error("\n❌ ERRORES ENCONTRADOS:");
    if (error.properties && error.properties.errors) {
        error.properties.errors.forEach((err, index) => {
            console.error(`\n--- Error #${index + 1} ---`);
            console.error(`Mensaje: ${err.message}`);
            console.error(`Etiqueta (Tag): ${err.properties.xtag}`);
            console.error(`Explicación: ${err.properties.explanation}`);
        });

        console.log("\n🕵️  DIAGNÓSTICO INTERNO (XML):");
        // Try to show the XML context
        try {
            const xml = zip.files['word/document.xml'].asText();
            console.log("Buscando fragmentos rotos en el XML...");
            // Simple regex to find split tags like {{<...>}...}
            const matches = xml.match(/\{\{[^}]*?(<[^>]+>)[^}]*?\}\}/g);
            if (matches) {
                console.log("⚠️ Se encontraron etiquetas 'sucias' con XML inyectado:");
                matches.forEach(m => console.log(`   -> ${m.substring(0, 100)}...`));
            } else {
                console.log("No se detectó inyección obvia, podría ser 'Track Changes' o duplicados.");
            }
        } catch (e) {
            console.log("No se pudo leer el XML interno.");
        }

    } else {
        console.error(error);
    }
}
