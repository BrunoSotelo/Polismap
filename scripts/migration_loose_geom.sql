-- Relax geometry constraint to accept LineString or Polygon
alter table secciones_electorales 
  alter column geom type geometry(Geometry, 4326);
