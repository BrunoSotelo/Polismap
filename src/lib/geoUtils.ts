
import { SupabaseClient } from '@supabase/supabase-js';

export interface SectionFeature {
    id: number;
    properties: {
        id: number;
        distrito: number;
    };
    geometry: {
        type: string;
        coordinates: any[];
    };
}

// Ray-casting algorithm for Point-in-Polygon
// https://github.com/substack/point-in-polygon
function pointInPolygon(point: [number, number], vs: [number, number][]) {
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

// Support for MultiPolygon
function pointInGeometry(point: [number, number], geometry: any): boolean {
    if (geometry.type === 'Polygon') {
        // Defines the polygon: [0] is the outer ring
        // Coordinates in GeoJSON are [lng, lat]
        // Our point is [lat, lng] -> wait, standard GeoJSON is [lng, lat]
        // The pointInPolygon function expects consistent axis.
        // Let's assume point is [lng, lat] to match GeoJSON.
        return pointInPolygon(point, geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
        for (const polygon of geometry.coordinates) {
            if (pointInPolygon(point, polygon[0])) return true;
        }
    }
    return false;
}

/**
 * Finds the electoral section containing the given coordinates.
 * @param lat Latitude
 * @param lng Longitude
 * @param sections List of section features (from sections table or GeoJSON)
 */
export function findSection(lat: number, lng: number, sections: any[]): number | null {
    // GeoJSON uses [lng, lat]
    const point: [number, number] = [lng, lat];

    for (const section of sections) {
        // Handle both raw DB row (geom) or Feature object
        const geometry = section.geometry || section.geom;
        const id = section.id || section.properties?.id;

        if (geometry && pointInGeometry(point, geometry)) {
            return id;
        }
    }
    return null;
}

/**
 * Helper to fetch all sections (if not already loaded in checking Context)
 * This is a heavy fetch, so cache it if possible.
 */
let cachedSections: any[] | null = null;

export async function fetchAllSections(supabase: SupabaseClient) {
    if (cachedSections) return cachedSections;

    const { data, error } = await supabase
        .from('secciones_electorales')
        .select('id, geom');

    if (error) {
        console.error("Error fetching sections for geoUtils:", error);
        return [];
    }

    cachedSections = data || [];
    return cachedSections;
}
