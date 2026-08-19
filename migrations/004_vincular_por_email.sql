-- findOrCreateUser ahora vincula por email cuando el (proveedor, proveedor_id)
-- no matchea pero el email si -- asi loguearse con Slack despues de haber
-- usado GitHub (o viceversa) cae en la misma cuenta en vez de crear una
-- nueva vacia. UNIQUE (nullable) permite multiples NULL sin problema, solo
-- fuerza unicidad entre emails no-nulos -- ver server/utils/usuarios.ts.
ALTER TABLE usuarios ADD CONSTRAINT usuarios_email_unique UNIQUE (email);
