-- handle_new_user() solo debe correr como trigger AFTER INSERT en auth.users.
-- PostgREST expone por defecto toda funcion del esquema public como RPC;
-- se revoca el EXECUTE directo aunque, al ser una funcion "returns trigger",
-- Postgres ya rechaza invocarla fuera de un trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
