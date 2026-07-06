-- Seed de catálogo para desarrollo (idempotente por 'code'/valores).
-- Paquetes de fichas — precios en CENTAVOS de COP (enteros).
insert into coin_packages (coins, bonus_coins, price_cents_cop, sort) values
  (100,    0,   490000, 1),    -- 100 fichas · $4.900 COP
  (500,   50,  2450000, 2),    -- 500 (+50 bonus) · $24.500
  (1200, 200,  4900000, 3),    -- 1.200 (+200) · $49.000
  (3000, 700, 11900000, 4)     -- 3.000 (+700) · $119.000
on conflict do nothing;

-- Regalos — bean_value ≈ 40% del coin_cost ⇒ comisión de plataforma ~60%.
insert into gifts (code, name, coin_cost, bean_value, tier, sort) values
  ('rose',   'Rosa',      10,    4, 1, 1),
  ('heart',  'Corazón',   50,   20, 1, 2),
  ('crown',  'Corona',   200,   80, 2, 3),
  ('rocket', 'Cohete',  1000,  400, 3, 4),
  ('castle', 'Castillo',5000, 2000, 4, 5)
on conflict (code) do nothing;
