create table product_category
(
    id   uuid primary key,
    name text not null
);
create unique index product_category_name_key on product_category (lower(name));

create table shop
(
    id        uuid primary key,
    name      text             not null,
    latitude  double precision not null check (latitude between -90 and 90),
    longitude double precision not null check (longitude between -180 and 180)
);

create table shop_category_order
(
    shop_id     uuid not null references shop on delete cascade,
    category_id uuid not null references product_category on delete cascade,
    position    int  not null,
    primary key (shop_id, category_id)
);

create table product
(
    id             uuid primary key,
    name           text    not null,
    bought         boolean not null default false,
    bought_at      timestamptz,
    category_id    uuid    references product_category on delete set null,
    classification text    not null check (classification in ('PENDING', 'CLASSIFIED', 'UNCLASSIFIED')),
    check (bought = (bought_at is not null))
);

insert into product_category (id, name)
values ('00000000-0000-0000-0001-000000000001', 'Fruits'),
       ('00000000-0000-0000-0001-000000000002', 'Légumes'),
       ('00000000-0000-0000-0001-000000000003', 'Pain'),
       ('00000000-0000-0000-0001-000000000004', 'Fromage'),
       ('00000000-0000-0000-0001-000000000005', 'Produits laitiers'),
       ('00000000-0000-0000-0001-000000000006', 'Viande'),
       ('00000000-0000-0000-0001-000000000007', 'Poisson'),
       ('00000000-0000-0000-0001-000000000008', 'Boissons'),
       ('00000000-0000-0000-0001-000000000009', 'Surgelés'),
       ('00000000-0000-0000-0001-000000000010', 'Ménage');

-- Placeholder coordinates (Bern)
insert into shop (id, name, latitude, longitude)
values ('00000000-0000-0000-0002-000000000001', 'Coop', 46.948, 7.4474),
       ('00000000-0000-0000-0002-000000000002', 'Migros', 46.948, 7.4474);

insert into shop_category_order (shop_id, category_id, position)
values
    -- COOP
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000003', 0), -- Pain
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000001', 1), -- Fruits
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000002', 2), -- Légumes
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000006', 3), -- Viande
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000007', 4), -- Poisson
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000004', 5), -- Fromage
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000005', 6), -- Produits laitiers
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000009', 7), -- Surgelés
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000008', 8), -- Boissons
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000010', 9), -- Ménage
    -- Migros
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000001', 0), -- Fruits
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000002', 1), -- Légumes
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000003', 4), -- Pain
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000005', 2), -- Produits laitiers
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000004', 3), -- Fromage
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000006', 6), -- Viande
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000007', 7), -- Poisson
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000009', 9), -- Surgelés
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000008', 5), -- Boissons
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000010', 8); -- Ménage
