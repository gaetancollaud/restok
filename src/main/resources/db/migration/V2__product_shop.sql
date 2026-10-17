-- The only shop to buy the product at; null means anywhere. Deleting the shop frees its products.
alter table product
    add column shop_id uuid references shop on delete set null;
