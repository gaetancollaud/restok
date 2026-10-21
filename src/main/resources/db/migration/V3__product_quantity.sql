-- How many to buy; existing products get 1.
alter table product
    add column quantity integer not null default 1 check (quantity >= 1);
