import { boughtList, hiddenFor, Item, nearestShop, orderFor, parseQuantity } from './basket';

describe('basket', () => {
  describe('nearestShop', () => {
    // 0.0009° of latitude is about 100 m
    const at = (id: string, meters: number) => ({ id, name: id, latitude: 46.5 + (meters / 100) * 0.0009, longitude: 6.6 });

    it('picks a shop within 200 m', () => {
      expect(nearestShop([at('coop', 50)], 46.5, 6.6)?.id).toBe('coop');
    });

    it('picks the nearest of two close shops', () => {
      expect(nearestShop([at('coop', 150), at('migros', 80)], 46.5, 6.6)?.id).toBe('migros');
    });

    it('picks nothing beyond 200 m', () => {
      expect(nearestShop([at('coop', 250)], 46.5, 6.6)).toBeUndefined();
    });

    it('ignores shops without a location', () => {
      expect(nearestShop([{ id: 'lidl', name: 'Lidl' }, at('coop', 50)], 46.5, 6.6)?.id).toBe('coop');
    });
  });

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

  describe('parseQuantity', () => {
    it.each([
      ['2 apples', 'apples', 2],
      ['3x eggs', 'eggs', 3],
      ['eggs x3', 'eggs', 3],
      ['eggs 3', 'eggs', 3],
      ['2X eggs', 'eggs', 2],
      ['4× eggs', 'eggs', 4],
      [' apples ', 'apples', 1],
      ['500g butter', '500g butter', 1],
      ['7', '7', 1],
      ['0 apples', '0 apples', 1],
      ['1000 apples', '1000 apples', 1],
      ['2 apples 3', 'apples 3', 2],
      ['coca 0 zero', 'coca 0 zero', 1],
    ])('reads %j as %j × %d', (text, name, quantity) => {
      expect(parseQuantity(text)).toEqual({ name, quantity });
    });
  });
});
