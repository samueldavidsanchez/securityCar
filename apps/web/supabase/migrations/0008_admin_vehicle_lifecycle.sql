-- Securitycar — 0008: admin puede dar de baja un vehículo
--
-- El alcance original del panel admin excluía CRUD de vehículos a propósito
-- (el admin gestionaba accesos y dispositivos, no metadata/borrado). Se
-- necesita en la práctica: al dar de baja a un usuario, soporte necesita
-- poder dar de baja también su vehículo. Igual que el borrado normal
-- (migración 0005), es soft-delete — command_logs sobrevive para auditoría.

create policy "vehicles admin update" on vehicles for update
  using (public.is_admin())
  with check (public.is_admin());
