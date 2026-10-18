-- The product's matching product at a supermarket chain, by the chain's own code. At most one per chain.
create table product_link
(
    product_id uuid not null references product on delete cascade,
    chain      text not null check (chain in ('MIGROS', 'COOP', 'ALDI', 'LIDL')),
    code       text not null,
    primary key (product_id, chain)
);
