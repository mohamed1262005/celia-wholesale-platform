WITH unique_customer_phones AS (
  SELECT
    regexp_replace(phone, '[^0-9]', '', 'g') AS normalized_phone,
    (array_agg(id))[1] AS customer_id
  FROM public.profiles
  WHERE role = 'customer'
    AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') <> ''
  GROUP BY regexp_replace(phone, '[^0-9]', '', 'g')
  HAVING COUNT(*) = 1
)
UPDATE public.orders AS order_row
SET
  customer_id = matched_customer.customer_id::text,
  user_id = matched_customer.customer_id
FROM unique_customer_phones AS matched_customer
WHERE regexp_replace(
    COALESCE(NULLIF(order_row.customer_phone, ''), NULLIF(order_row.phone, ''), ''),
    '[^0-9]',
    '',
    'g'
  ) = matched_customer.normalized_phone
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles AS current_customer
    WHERE current_customer.role = 'customer'
      AND current_customer.id::text IN (order_row.customer_id::text, order_row.user_id::text)
  )
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS previous_admin
    WHERE previous_admin.role = 'admin'
      AND previous_admin.id::text IN (order_row.customer_id::text, order_row.user_id::text)
  );
