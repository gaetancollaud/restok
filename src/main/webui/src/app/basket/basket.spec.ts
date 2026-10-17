import { boughtList, hiddenFor, Item, orderFor } from './basket';

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

  describe('shop restriction', () => {
    const coop = { id: 'coop', name: 'Coop', aisles: [] };
    const lidl = { id: 'lidl', name: 'Lidl', aisles: [] };
    const restricted: Item[] = [
      { id: '1', name: 'Apples' },
      { id: '2', name: 'Parmesan', shopId: 'lidl' },
      { id: '3', name: 'Coffee', shopId: 'lidl', bought: true, boughtAt: 1 },
    ];

    it('leaves out items for another shop and counts them', () => {
      expect(names(orderFor(restricted, coop))).toEqual(['Apples']);
      expect(hiddenFor(restricted, coop)).toBe(1);
    });

    it('shows items for the selected shop', () => {
      expect(names(orderFor(restricted, lidl))).toEqual(['Apples', 'Parmesan']);
      expect(hiddenFor(restricted, lidl)).toBe(0);
    });

    it('shows everything without a shop (All shops)', () => {
      expect(names(orderFor(restricted))).toEqual(['Apples', 'Parmesan']);
      expect(hiddenFor(restricted)).toBe(0);
    });

    it('keeps every bought item in Bought', () => {
      expect(names(boughtList(restricted))).toEqual(['Coffee']);
    });
  });
});
