-- Migration: Add OCR fields to affinities table
alter table affinities 
  add column if not exists direccion text,
  add column if not exists curp text,
  add column if not exists fecha_nacimiento date,
  add column if not exists edad integer;

-- Optional: Add comment
comment on column affinities.direccion is 'Extracted address from INE';
comment on column affinities.curp is 'Extracted CURP';
