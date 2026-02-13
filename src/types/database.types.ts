export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            secciones_electorales: {
                Row: {
                    id: number
                    distrito: number
                    municipio: string | null
                    geom: any
                    meta_data: Json
                    votos_partido_anterior: number | null
                    meta_votos: number | null
                    ganador_anterior: string | null
                    competitividad: number | null
                    created_at: string
                }
                Insert: {
                    id: number
                    distrito: number
                    municipio?: string | null
                    geom?: any
                    meta_data?: Json
                    votos_partido_anterior?: number | null
                    meta_votos?: number | null
                    ganador_anterior?: string | null
                    competitividad?: number | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    distrito?: number
                    municipio?: string | null
                    geom?: any
                    meta_data?: Json
                    votos_partido_anterior?: number | null
                    meta_votos?: number | null
                    ganador_anterior?: string | null
                    competitividad?: number | null
                    created_at?: string
                }
            }
            lideres: {
                Row: {
                    id: string
                    nombre: string
                    telefono: string | null
                    email: string | null
                    seccion_id: number | null
                    lat: number
                    lng: number
                    activo: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    nombre: string
                    telefono?: string | null
                    email?: string | null
                    seccion_id?: number | null
                    lat: number
                    lng: number
                    activo?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    nombre?: string
                    telefono?: string | null
                    email?: string | null
                    seccion_id?: number | null
                    lat?: number
                    lng?: number
                    activo?: boolean
                    created_at?: string
                }
            }
            affinities: {
                Row: {
                    id: string
                    ine_clave: string | null
                    nombre: string | null
                    direccion: string | null
                    curp: string | null
                    fecha_nacimiento: string | null
                    edad: number | null
                    seccion_id: number | null
                    confidence_score: number
                    source_image_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    ine_clave?: string | null
                    nombre?: string | null
                    direccion?: string | null
                    curp?: string | null
                    fecha_nacimiento?: string | null
                    edad?: number | null
                    seccion_id?: number | null
                    confidence_score?: number
                    source_image_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    ine_clave?: string | null
                    nombre?: string | null
                    direccion?: string | null
                    curp?: string | null
                    fecha_nacimiento?: string | null
                    edad?: number | null
                    seccion_id?: number | null
                    confidence_score?: number
                    source_image_url?: string | null
                    created_at?: string
                }
            }
            events: {
                Row: {
                    id: string
                    titulo: string
                    descripcion: string | null
                    tipo: string
                    fecha: string
                    asistentes_estimados: number
                    lat: number | null
                    lng: number | null
                    evidencia_urls: string[]
                    created_at: string
                }
                Insert: {
                    id?: string
                    titulo: string
                    descripcion?: string | null
                    tipo: string
                    fecha: string
                    asistentes_estimados?: number
                    lat?: number | null
                    lng?: number | null
                    evidencia_urls?: string[]
                    created_at?: string
                }
                Update: {
                    id?: string
                    titulo?: string
                    descripcion?: string | null
                    tipo?: string
                    fecha?: string
                    asistentes_estimados?: number
                    lat?: number | null
                    lng?: number | null
                    evidencia_urls?: string[]
                    created_at?: string
                }
            }
            bitacoras: {
                Row: {
                    id: string
                    user_id: string
                    tipo: 'reunion_vecinal' | 'evento_publico' | 'recorrido' | 'otro'
                    descripcion: string | null
                    lat: number | null
                    lng: number | null
                    seccion_id: number | null
                    fotos: string[] | null
                    aforo: number | null
                    fecha: string | null
                    compromisos: string | null
                    comentarios: string | null
                    distrito_id: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string
                    tipo: 'reunion_vecinal' | 'evento_publico' | 'recorrido' | 'otro'
                    descripcion?: string | null
                    lat?: number | null
                    lng?: number | null
                    seccion_id?: number | null
                    fotos?: string[] | null
                    aforo?: number | null
                    fecha?: string | null
                    compromisos?: string | null
                    comentarios?: string | null
                    distrito_id?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    tipo?: 'reunion_vecinal' | 'evento_publico' | 'recorrido' | 'otro'
                    descripcion?: string | null
                    lat?: number | null
                    lng?: number | null
                    seccion_id?: number | null
                    fotos?: string[] | null
                    aforo?: number | null
                    fecha?: string | null
                    compromisos?: string | null
                    comentarios?: string | null
                    distrito_id?: number | null
                    created_at?: string
                }
            },
            profiles: {
                Row: {
                    id: string
                    email: string | null
                    is_admin: boolean | null // boolean
                    created_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    is_admin?: boolean | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    is_admin?: boolean | null
                    created_at?: string
                }
            },
            user_districts: {
                Row: {
                    id: string
                    user_id: string
                    distrito_id: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    distrito_id: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    distrito_id?: number
                    created_at?: string
                }
            }
        }
        Functions: {
            get_section_by_point: {
                Args: {
                    lat_param: number
                    lng_param: number
                }
                Returns: {
                    seccion_id: number
                }[]
            }
        }
    }
}
