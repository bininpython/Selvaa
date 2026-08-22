insert into public.achievements (code, name, description, icon, points, threshold, category) values
  ('first_steps', 'Primeiros Passos', 'Conclua sua primeira trilha.', 'footprints', 50, 1, 'activity'),
  ('explorer', 'Explorador', 'Conclua 10 trilhas.', 'compass', 200, 10, 'activity'),
  ('mateiro', 'Mateiro', 'Explore 50 quilômetros.', 'trees', 300, 50000, 'distance'),
  ('trailblazer', 'Desbravador', 'Explore 250 quilômetros.', 'route', 750, 250000, 'distance'),
  ('mountaineer', 'Montanhista', 'Acumule 5.000 metros de elevação.', 'mountain', 600, 5000, 'elevation'),
  ('expeditioner', 'Expedicionário', 'Complete 10 atividades acima de 15 km.', 'tent-tree', 1000, 10, 'activity'),
  ('waterfall_hunter', 'Caçador de Cachoeiras', 'Visite 10 cachoeiras.', 'waves', 450, 10, 'passport'),
  ('nature_guardian', 'Guardião da Natureza', 'Participe de ações ambientais verificadas.', 'shield-check', 800, 5, 'environment')
on conflict (code) do update set name = excluded.name, description = excluded.description;
