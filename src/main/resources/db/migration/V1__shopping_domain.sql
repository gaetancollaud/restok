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
    category_id    uuid references product_category on delete set null,
    classification text    not null check (classification in ('PENDING', 'CLASSIFIED', 'UNCLASSIFIED'))
);

insert into product_category (id, name)
select gen_random_uuid(), name
from unnest(array ['Fruits', 'Légumes', 'Pain', 'Fromage', 'Produits laitiers', 'Viande', 'Poisson', 'Boissons', 'Surgelés', 'Ménage']) as name;
