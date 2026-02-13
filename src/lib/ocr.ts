
// import Tesseract from 'tesseract.js'; // Deprecated in favor of Google Vision

export interface ExtractedData {
    // Names
    nombreCommon?: string; // Full name string
    nombres?: string; // First name(s)
    apellidoPaterno?: string;
    apellidoMaterno?: string;

    // Address
    direccion?: string; // Full address string
    calle?: string;
    numero_exterior?: string;
    numero_interior?: string;
    colonia?: string;
    cp?: string;
    municipio?: string;
    estado?: string;

    // Metadata
    curp?: string;
    claveElector?: string;
    seccion?: string;
    fechaNacimiento?: string;
    edad?: number;
    genero?: string; // H or M
    vigencia?: string;

    confidence: number;
    rawText: string;
}

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;

export async function processIneImage(imageFile: File): Promise<ExtractedData> {

    if (!GOOGLE_API_KEY) {
        throw new Error("Falta la API Key de Google Cloud. Configura VITE_GOOGLE_CLOUD_API_KEY en .env.local");
    }

    try {
        const base64Image = await fileToBase64(imageFile);

        // Remove header if present (e.g., "data:image/jpeg;base64,")
        const content = base64Image.split(',')[1];

        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requests: [
                    {
                        image: {
                            content: content
                        },
                        features: [
                            { type: "TEXT_DETECTION" }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Google Vision API Error: ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        // Check structure safely
        if (!data.responses || !data.responses[0] || !data.responses[0].fullTextAnnotation) {
            throw new Error("No se detectó texto legible en la imagen.");
        }

        const fullText = data.responses[0].fullTextAnnotation.text;
        return parseIneText(fullText, 0.90); // Simulated confidence

    } catch (e) {
        console.error("OCR Error:", e);
        throw e;
    }
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
}

function parseIneText(text: string, confidence: number): ExtractedData {
    // Normalization
    const cleanText = text.toUpperCase()
        .replace(/\|/g, 'I')
        .replace(/\r\n/g, '\n');

    const lines = cleanText.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    const data: ExtractedData = {
        confidence: confidence,
        rawText: text
    };

    // --- 1. NOMBRES (Estrategia: Layout común de INE) ---
    // Busca "NOMBRE" y toma las 3 lineas siguientes
    // --- 1. NOMBRES (Estrategia: Layout común de INE) ---
    // Busca "NOMBRE" y extrae todo hasta el siguiente bloque (DOMICILIO o CLAVE o SEXO)
    const nombreIndex = lines.findIndex(l => l.includes('NOMBRE') && l.length < 30); // "NOMBRE" label

    if (nombreIndex !== -1) {
        // Find end of name block
        // Candidates for next section: DOMICILIO, EDAD, SEXO, CURP
        let endIndex = lines.length;
        for (let i = nombreIndex + 1; i < lines.length; i++) {
            if (lines[i].includes('DOMICILIO') || lines[i].includes('SEXO') || lines[i].includes('EDAD') || lines[i].includes('CLAVE')) {
                endIndex = i;
                break;
            }
        }

        // Candidates lines
        const nameLines = lines.slice(nombreIndex + 1, endIndex)
            .filter(l => !isKeyword(l));

        if (nameLines.length === 1) {
            // Unlikely for INE but possible in OCR merge
            data.nombreCommon = nameLines[0];
            // Infer parts? Hard. Just set common.
            const parts = nameLines[0].split(' ');
            if (parts.length >= 3) {
                data.apellidoPaterno = parts[0];
                data.apellidoMaterno = parts[1];
                data.nombres = parts.slice(2).join(' ');
            }
        } else if (nameLines.length === 2) {
            // Probably Paterno / Materno + Nombres OR Paterno + Materno / Nombres
            // Standard INE D/E/F:
            // 1. Paterno
            // 2. Materno
            // 3. Nombres
            // If only 2 lines, maybe Paterno / Materno Nombres?
            data.apellidoPaterno = nameLines[0];
            data.nombres = nameLines[1]; // Fallback
            data.nombreCommon = nameLines.join(' ');
        } else if (nameLines.length >= 3) {
            // Standard
            data.apellidoPaterno = nameLines[0];
            data.apellidoMaterno = nameLines[1];
            data.nombres = nameLines[2];
            data.nombreCommon = `${nameLines[2]} ${nameLines[0]} ${nameLines[1]}`;
        }
    }

    // --- 2. DOMICILIO (Estrategia: Layout común) ---
    // Busca "DOMICILIO"
    const domicilioIndex = lines.findIndex(l => l.includes('DOMICILIO'));
    if (domicilioIndex !== -1 && domicilioIndex + 3 < lines.length) {
        const lineCalle = lines[domicilioIndex + 1]; // CALLE X #Y
        const lineCol = lines[domicilioIndex + 2];   // COL. Z CP W
        const lineMuni = lines[domicilioIndex + 3];  // MUNICIPIO, ESTADO

        if (!isKeyword(lineCalle) && !isKeyword(lineCol)) {
            data.direccion = `${lineCalle}, ${lineCol}, ${lineMuni}`;

            // Parse CALLE and NUM
            // Heuristic: Last token is number, rest is street
            // Or look for " #"
            const lastSpaceInfo = lineCalle.lastIndexOf(' ');
            if (lastSpaceInfo !== -1) {
                const possibleNum = lineCalle.substring(lastSpaceInfo + 1);
                if (/\d/.test(possibleNum)) {
                    data.numero_exterior = possibleNum;
                    data.calle = lineCalle.substring(0, lastSpaceInfo).trim();
                } else {
                    data.calle = lineCalle;
                }
            } else {
                data.calle = lineCalle;
            }

            // Parse CP and COLONIA
            // Look for 5 digits at end or "CP \d{5}"
            const cpMatch = lineCol.match(/\b(\d{5})\b/);
            if (cpMatch) {
                data.cp = cpMatch[1];
                // Colonia is everything else?
                let colStr = lineCol.replace(cpMatch[0], '').replace('CP', '').replace('C.P.', '').trim();
                // Remove trailing punctuation
                colStr = colStr.replace(/[,.-]+$/, '');
                data.colonia = colStr;
            } else {
                data.colonia = lineCol;
            }

            // Parse MUNICIPIO
            data.municipio = lineMuni.split(',')[0].trim();
        }
    }

    // --- 3. CLAVE ELECTOR ---
    // Format: 18 alphanumeric
    const claveMatch = cleanText.match(/\b([A-Z]{6}\d{8}[A-Z]\d{3})\b/) || cleanText.match(/\b([A-Z]{6}\d{8}[HM]\d{3})\b/);
    if (claveMatch) {
        data.claveElector = claveMatch[1];
    } else {
        // Search line by line for "CLAVE DE ELECTOR"
        const claveLabelIndex = lines.findIndex(l => l.includes('CLAVE DE ELECTOR') || l.includes('ELECTOR'));
        if (claveLabelIndex !== -1 && claveLabelIndex + 1 < lines.length) {
            const nextLine = lines[claveLabelIndex + 1];
            const candidate = nextLine.split(' ')[0]; // Take first token
            if (candidate.length >= 14) {
                data.claveElector = candidate;
            }
        }
    }

    // --- 4. CURP ---
    const curpMatch = cleanText.match(/[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d/);
    if (curpMatch) data.curp = curpMatch[0];

    // --- 5. SECCION ---
    // Specifically look for "SECCION" followed by digits
    const seccionMatch = cleanText.match(/SECCI[OÓ]N\s*(\d{4})/);
    if (seccionMatch) {
        data.seccion = seccionMatch[1];
    } else {
        // Fallback: look for 4 digits in lines with "SECCION"
        const secLine = lines.find(l => l.includes('SECCION'));
        if (secLine) {
            const digits = secLine.match(/(\d{4})/);
            if (digits) data.seccion = digits[1];
        }
    }

    // --- 6. FECHA NACIMIENTO & EDAD ---
    const fechaMatch = cleanText.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (fechaMatch) {
        const year = parseInt(fechaMatch[3]);
        if (year > 1900 && year < new Date().getFullYear()) {
            data.fechaNacimiento = `${year}-${fechaMatch[2]}-${fechaMatch[1]}`;
            data.edad = calculateAge(new Date(data.fechaNacimiento));
        }
    }

    // --- 7. GENERO / SEXO ---
    const sexoLine = lines.find(l => l.includes('SEXO'));
    if (sexoLine) {
        if (sexoLine.includes('H')) data.genero = 'H';
        else if (sexoLine.includes('M')) data.genero = 'M';
    }

    // --- 8. VIGENCIA ---
    const vigenciaMatch = cleanText.match(/VIGENCIA\s*(\d{4})/);
    if (vigenciaMatch) {
        data.vigencia = vigenciaMatch[1];
    }

    return data;
}

function isKeyword(line: string): boolean {
    const keywords = ['NOMBRE', 'DOMICILIO', 'CURP', 'CLAVE', 'ELECTOR', 'NACIMIENTO', 'SEXO', 'ESTADO', 'MUNICIPIO', 'LOCALIDAD', 'VIGENCIA', 'VOTAR'];
    return keywords.some(k => line.includes(k) && line.length < 20); // Only treat as keyword if line is relatively short (heuristic)
}

function calculateAge(birthday: Date) {
    const ageDifMs = Date.now() - birthday.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}
