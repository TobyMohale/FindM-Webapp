ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid references public.profiles(id) on delete set null;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS size text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS details text;
