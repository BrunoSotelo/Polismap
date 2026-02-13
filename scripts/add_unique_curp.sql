-- Make CURP unique to prevent duplicates
ALTER TABLE public.affinities 
ADD CONSTRAINT affinities_curp_key UNIQUE (curp);

NOTIFY pgrst, 'reload schema';
