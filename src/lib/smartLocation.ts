import { supabase } from './supabase';
import { findSection, fetchAllSections } from './geoUtils'; // Import geometry utils

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;

interface ResolutionResult {
    seccion_id: number;
    method: 'direct' | 'geospatial' | 'fallback';
    original_seccion?: string;
    found_seccion?: number;
}

export async function resolveSection(seccionInput: string | number, address: string): Promise<ResolutionResult> {
    const seccionNum = typeof seccionInput === 'string' ? parseInt(seccionInput) : seccionInput;

    if (isNaN(seccionNum)) {
        throw new Error("Sección inválida");
    }

    // 1. Try Direct Lookup
    const { data: existingSectionQuery } = await supabase
        .from('secciones_electorales')
        .select('id')
        .eq('id', seccionNum)
        .maybeSingle();

    const existingSection = existingSectionQuery as any;

    if (existingSection) {
        return {
            seccion_id: existingSection.id,
            method: 'direct'
        };
    }

    console.warn(`Sección ${seccionNum} no encontrada. Intentando geolocalización...`);

    // 2. If not found, try Geocoding + Spatial Lookup
    if (!GOOGLE_API_KEY) {
        console.error("No API Key found for Geocoding fallback");
        return { seccion_id: seccionNum, method: 'fallback' };
    }

    try {
        const { lat, lng } = await geocodeAddress(address);
        console.log(`Geocoded Address: ${lat}, ${lng}`);

        // Client-Side Spatial Lookup (Robust)
        const sections = await fetchAllSections(supabase);
        const start = performance.now();
        const foundId = findSection(lat, lng, sections);
        const end = performance.now();
        console.log(`Spatial search duration: ${(end - start).toFixed(2)}ms`);

        if (foundId) {
            console.log("Spatial Lookup Found Section:", foundId);
            return {
                seccion_id: foundId,
                method: 'geospatial',
                original_seccion: seccionNum.toString(),
                found_seccion: foundId
            };
        } else {
            console.warn("Point is outside any known section polygon.");
        }

    } catch (err) {
        console.error("Smart Location Error:", err);
    }

    // Default fallback: Return the input section (letting the DB decide if it accepts it or not)
    // Since we relaxed the FK constraint, this will save the "old" section number even if it doesn't exist in the map.
    return {
        seccion_id: seccionNum,
        method: 'fallback'
    };
}

async function geocodeAddress(address: string): Promise<{ lat: number, lng: number }> {
    // Basic cleaning
    const cleanAddress = address.replace(/\n/g, ', ');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanAddress)}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new Error(`Geocoding failed: ${data.status}`);
    }

    const location = data.results[0].geometry.location;
    return {
        lat: location.lat,
        lng: location.lng
    };
}
