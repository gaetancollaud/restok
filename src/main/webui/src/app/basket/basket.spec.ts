import { boughtList, Item, orderFor } from './basket';

describe('basket', () => {
  const items: Item[] = [
    { id: '1', name: 'Tomatoes', aisle: 'Produce' },
    { id: '2', name: 'Bread', aisle: 'Bakery' },
    { id: '3', name: 'Apples', aisle: 'Produce' },
    { id: '4', name: 'Batteries' },
    { id: '5', name: 'Coffee', bought: true, boughtAt: 1 },
    { id: '6', name: 'Rice', bought: true, boughtAt: 2 },
  ];
  const names = (list: Item[]) => list.map((i) => i.name);

  it('sorts To buy by the shop aisles, unknown aisles last, then by name', () => {
    const coop = { id: 'coop', name: 'Coop', aisles: ['Bakery', 'Produce'] };
    expect(names(orderFor(items, coop))).toEqual(['Bread', 'Apples', 'Tomatoes', 'Batteries']);
  });

  it('sorts To buy by name without a shop', () => {
    expect(names(orderFor(items))).toEqual(['Apples', 'Batteries', 'Bread', 'Tomatoes']);
  });

  it('lists Bought most recent first', () => {
    expect(names(boughtList(items))).toEqual(['Rice', 'Coffee']);
  });
});
