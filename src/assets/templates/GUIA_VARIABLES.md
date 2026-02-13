# Guía de Variables para Plantillas de Reporte (.docx)

Utiliza estas variables dentro de tu archivo Word rodeadas de llaves dobles `{{ }}`. El sistema las reemplazará automáticamente por la información generada por la IA.

## Datos Generales
- `{{fecha_inicio}}`: Fecha de inicio del periodo reportado (DD/MM/YYYY).
- `{{fecha_fin}}`: Fecha de fin del periodo.
- `{{nombre_diputado}}`: Nombre del usuario principal.

## Análisis Estratégico (Generado por IA)
- `{{resumen_ejecutivo}}`: Un párrafo potente resumiendo la semana/mes.
- `{{principales_logros}}`: Lista de hitos alcanzados.
- `{{zonas_desatendidas}}`: Análisis de qué colonias necesitan atención urgente.
- `{{sugerencia_estrategica}}`: Recomendación de acción ("Visitar la zona norte...").

## Estadísticas Duras (Calculadas)
- `{{total_bitacoras}}`: Número total de registros en el periodo.
- `{{total_gestiones}}`: Número de peticiones ciudadanas.
- `{{top_3_colonias}}`: Las 3 colonias con más presencia.

---
**Ejemplo de uso en Word:**

> **Informe Semanal**
> Del {{fecha_inicio}} al {{fecha_fin}}
>
> **Resumen:**
> {{resumen_ejecutivo}}
> ...
