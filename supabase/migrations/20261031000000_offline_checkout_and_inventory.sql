ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price numeric(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS available_stock int GENERATED ALWAYS AS (stock_quantity - reserved_quantity) STORED;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS total_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_address text,
  ADD COLUMN IF NOT EXISTS delivery_lat double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng double precision,
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

UPDATE public.orders SET total_amount = subtotal WHERE total_amount = 0 AND subtotal > 0;
UPDATE public.orders SET user_id = customer_id WHERE user_id IS NULL;
UPDATE public.orders SET phone = customer_phone WHERE phone IS NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS governorate text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS address_lat double precision,
  ADD COLUMN IF NOT EXISTS address_lng double precision;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cod', 'online', 'vodafone_cash', 'instapay', 'fawry'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON public.orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DROP POLICY IF EXISTS "insert_own_orders" ON public.orders;
DROP POLICY IF EXISTS "insert_order_items" ON public.order_items;
DROP POLICY IF EXISTS "update_own_orders" ON public.orders;
CREATE POLICY "update_own_orders" ON public.orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id AND status = 'new')
  WITH CHECK (auth.uid() = customer_id AND status IN ('new', 'cancelled'));

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  date_part text;
  seq int;
BEGIN
  date_part := to_char(now(), 'YYYYMMDD');
  PERFORM pg_advisory_xact_lock(hashtext(date_part)::bigint);
  SELECT COALESCE(MAX(CAST(SPLIT_PART(order_number, '-', 3) AS int)), 0) + 1
    INTO seq
    FROM public.orders
    WHERE order_number LIKE 'CEL-' || date_part || '-%';
  RETURN 'CEL-' || date_part || '-' || lpad(seq::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.place_order(
  p_idempotency_key uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_payment_method text,
  p_city text,
  p_address text,
  p_shipping_address text,
  p_delivery_lat double precision,
  p_delivery_lng double precision,
  p_delivery_notes text,
  p_order_notes text,
  p_language text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  existing_order public.orders%ROWTYPE;
  product_row public.products%ROWTYPE;
  item_row record;
  prepared_item jsonb;
  prepared_items jsonb := '[]'::jsonb;
  selected_price numeric(10,2);
  order_id uuid;
  order_number text;
  order_subtotal numeric(10,2) := 0;
  total_quantity int := 0;
  item_quantity int;
  item_product_id uuid;
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = authenticated_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'An active customer profile is required' USING ERRCODE = '42501';
  END IF;

  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'An idempotency key is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_idempotency_key::text)::bigint);

  SELECT * INTO existing_order
    FROM public.orders
    WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF existing_order.customer_id <> authenticated_user_id THEN
      RAISE EXCEPTION 'Idempotency key belongs to another customer' USING ERRCODE = '42501';
    END IF;
    RETURN jsonb_build_object('id', existing_order.id, 'order_number', existing_order.order_number);
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Order items must be an array' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one order item is required' USING ERRCODE = '22023';
  END IF;
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('cod', 'online', 'vodafone_cash', 'instapay', 'fawry') THEN
    RAISE EXCEPTION 'Unsupported payment method' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(trim(p_customer_name), '') IS NULL OR NULLIF(trim(p_customer_phone), '') IS NULL THEN
    RAISE EXCEPTION 'Customer name and phone are required' USING ERRCODE = '22023';
  END IF;

  BEGIN
    FOR item_row IN
      SELECT (line->>'productId')::uuid AS product_id,
             SUM((line->>'quantity')::int)::int AS quantity
      FROM jsonb_array_elements(p_items) AS line
      GROUP BY (line->>'productId')::uuid
      ORDER BY (line->>'productId')::uuid
    LOOP
      item_product_id := item_row.product_id;
      item_quantity := item_row.quantity;
      IF item_quantity <= 0 THEN
        RAISE EXCEPTION 'Order quantities must be positive' USING ERRCODE = '22023';
      END IF;

      SELECT * INTO product_row
        FROM public.products
        WHERE id = item_product_id
        FOR UPDATE;
      IF NOT FOUND OR product_row.status <> 'active' THEN
        RAISE EXCEPTION 'Product is unavailable: %', item_product_id USING ERRCODE = 'P0001';
      END IF;
      IF product_row.stock_quantity - product_row.reserved_quantity < item_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product: %', item_product_id USING ERRCODE = 'P0001';
      END IF;

      SELECT tier.unit_price INTO selected_price
        FROM public.pricing_tiers AS tier
        WHERE tier.product_id = item_product_id
          AND tier.min_quantity <= item_quantity
          AND (tier.max_quantity IS NULL OR tier.max_quantity >= item_quantity)
        ORDER BY tier.min_quantity ASC, tier.sort_order ASC
        LIMIT 1;

      IF selected_price IS NULL THEN
        SELECT tier.unit_price INTO selected_price
          FROM public.pricing_tiers AS tier
          WHERE tier.product_id = item_product_id
          AND tier.min_quantity <= item_quantity
          ORDER BY tier.min_quantity DESC, tier.sort_order ASC
          LIMIT 1;
      END IF;
      IF selected_price IS NULL THEN
        SELECT tier.unit_price INTO selected_price
          FROM public.pricing_tiers AS tier
          WHERE tier.product_id = item_product_id
          ORDER BY tier.min_quantity ASC, tier.sort_order ASC
          LIMIT 1;
      END IF;
      selected_price := COALESCE(selected_price, product_row.price);
      IF selected_price IS NULL OR selected_price <= 0 THEN
        RAISE EXCEPTION 'Product has no valid price: %', item_product_id USING ERRCODE = 'P0001';
      END IF;

      order_subtotal := order_subtotal + selected_price * item_quantity;
      total_quantity := total_quantity + item_quantity;
      prepared_items := prepared_items || jsonb_build_array(jsonb_build_object(
        'product_id', product_row.id,
        'product_name', CASE WHEN p_language = 'ar' THEN product_row.name_ar ELSE product_row.name_en END,
        'product_image', product_row.image_url,
        'packaging', product_row.packaging,
        'quantity', item_quantity,
        'unit_price', selected_price
      ));
    END LOOP;

    order_number := public.generate_order_number();
    INSERT INTO public.orders (
      order_number, customer_id, user_id, customer_name, customer_phone, phone,
      customer_email, subtotal, total_amount, total_quantity, payment_method,
      status, city, address, shipping_address, delivery_lat, delivery_lng,
      delivery_notes, order_notes, idempotency_key
    ) VALUES (
      order_number, authenticated_user_id, authenticated_user_id,
      p_customer_name, p_customer_phone, p_customer_phone,
      p_customer_email, order_subtotal, order_subtotal, total_quantity,
      p_payment_method, 'new', p_city, p_address, p_shipping_address,
      p_delivery_lat, p_delivery_lng, p_delivery_notes, p_order_notes,
      p_idempotency_key
    ) RETURNING id INTO order_id;

    FOR prepared_item IN SELECT value FROM jsonb_array_elements(prepared_items)
    LOOP
      INSERT INTO public.order_items (
        order_id, product_id, product_name, product_image, packaging,
        quantity, unit_price, total
      ) VALUES (
        order_id,
        (prepared_item->>'product_id')::uuid,
        prepared_item->>'product_name',
        prepared_item->>'product_image',
        prepared_item->>'packaging',
        (prepared_item->>'quantity')::int,
        (prepared_item->>'unit_price')::numeric,
        (prepared_item->>'unit_price')::numeric * (prepared_item->>'quantity')::int
      );

      UPDATE public.products
        SET reserved_quantity = reserved_quantity + (prepared_item->>'quantity')::int
        WHERE id = (prepared_item->>'product_id')::uuid;
    END LOOP;

    INSERT INTO public.notifications (user_id, type, title, message)
    SELECT profile.id, 'new_order', 'طلب جملة جديد',
           format('قام العميل (%s) بطلب جديد برقم %s بقيمة %s', p_customer_name, order_number, order_subtotal)
    FROM public.profiles AS profile
    WHERE profile.role = 'admin' AND profile.status = 'active';

    RETURN jsonb_build_object('id', order_id, 'order_number', order_number);
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO existing_order
      FROM public.orders
      WHERE idempotency_key = p_idempotency_key;
    IF FOUND AND existing_order.customer_id = authenticated_user_id THEN
      RETURN jsonb_build_object('id', existing_order.id, 'order_number', existing_order.order_number);
    END IF;
    RAISE;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(
  uuid, text, text, text, text, text, text, text, double precision,
  double precision, text, text, text, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(
  uuid, text, text, text, text, text, text, text, double precision,
  double precision, text, text, text, jsonb
) TO authenticated;

CREATE OR REPLACE FUNCTION public.release_order_inventory_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.customer_id
     AND NEW.status NOT IN ('new', 'cancelled') THEN
    RAISE EXCEPTION 'Customers may only cancel new orders' USING ERRCODE = '42501';
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status <> 'delivered' THEN
    UPDATE public.products AS product
      SET reserved_quantity = GREATEST(0, product.reserved_quantity - item.quantity)
      FROM public.order_items AS item
      WHERE item.order_id = NEW.id AND item.product_id = product.id;
  ELSIF NEW.status = 'delivered' AND OLD.status NOT IN ('delivered', 'cancelled') THEN
    UPDATE public.products AS product
      SET stock_quantity = GREATEST(0, product.stock_quantity - item.quantity),
          reserved_quantity = GREATEST(0, product.reserved_quantity - item.quantity)
      FROM public.order_items AS item
      WHERE item.order_id = NEW.id AND item.product_id = product.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_inventory_status_change ON public.orders;
CREATE TRIGGER order_inventory_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.release_order_inventory_on_status_change();

CREATE OR REPLACE FUNCTION public.release_order_inventory_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status NOT IN ('delivered', 'cancelled') THEN
    UPDATE public.products AS product
      SET reserved_quantity = GREATEST(0, product.reserved_quantity - item.quantity)
      FROM public.order_items AS item
      WHERE item.order_id = OLD.id AND item.product_id = product.id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS order_inventory_delete ON public.orders;
CREATE TRIGGER order_inventory_delete
  BEFORE DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.release_order_inventory_on_delete();
