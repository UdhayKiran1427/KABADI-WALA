import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLotItems,
  parseAskingPricePaise,
  askingItemRates,
  lotValuePaise,
  primaryItem,
  averageRatePerKgPaise,
  completeItemRates,
  type PricedLotItem,
} from "../../src/lib/domain/lotItems";

const items: PricedLotItem[] = [
  { categoryId: 1, weightGrams: 5000, listedRatePerKgPaise: 12000 }, // PCB 5 kg @ ₹120
  { categoryId: 2, weightGrams: 2000, listedRatePerKgPaise: 4500 }, // Wires 2 kg @ ₹45
];

test("normalizeLotItems merges repeated materials and drops empty weights", () => {
  const result = normalizeLotItems([
    { categoryId: 1, weightGrams: 2000 },
    { categoryId: 2, weightGrams: 0 },
    { categoryId: 1, weightGrams: 3000 },
  ]);
  assert.deepEqual(result, { items: [{ categoryId: 1, weightGrams: 5000 }] });
});

test("normalizeLotItems rejects an empty lot", () => {
  assert.ok("error" in normalizeLotItems([{ categoryId: 1, weightGrams: 0 }]));
});

test("lotValuePaise: PCB 5 kg @120 + Wires 2 kg @45 = Rs 690, with recycler rates when given", () => {
  assert.equal(lotValuePaise(items), 69_000);
  assert.equal(lotValuePaise(items, [{ categoryId: 1, ratePerKgPaise: 13000 }]), 74_000);
});

test("primaryItem picks the heaviest material", () => {
  assert.equal(primaryItem(items).categoryId, 1);
});

test("averageRatePerKgPaise spreads a total over the weight", () => {
  assert.equal(averageRatePerKgPaise(69_000, 7000), 9857);
});

test("completeItemRates fills missing materials and rejects bad rates", () => {
  assert.deepEqual(completeItemRates(items, [{ categoryId: 2, ratePerKgPaise: 5000 }]), {
    rates: [
      { categoryId: 1, ratePerKgPaise: 12000 },
      { categoryId: 2, ratePerKgPaise: 5000 },
    ],
  });
  assert.ok("error" in completeItemRates(items, [{ categoryId: 1, ratePerKgPaise: -1 }]));
});

test("asking price: blank is null, bad values are errors", () => {
  assert.deepEqual(parseAskingPricePaise(""), { paise: null });
  assert.deepEqual(parseAskingPricePaise("2900"), { paise: 290000 });
  assert.ok("error" in parseAskingPricePaise("-5"));
  assert.ok("error" in parseAskingPricePaise("abc"));
});

test("asking item rates add up to the asking price", () => {
  const one = [{ categoryId: 7, weightGrams: 5000, listedRatePerKgPaise: 5000 }];
  // 5 kg wires at ₹50/kg = ₹250; collector asks ₹2900 -> ₹580/kg
  assert.deepEqual(askingItemRates(one, 290000), [{ categoryId: 7, ratePerKgPaise: 58000 }]);
  assert.deepEqual(askingItemRates(one, null), [{ categoryId: 7, ratePerKgPaise: 5000 }]);

  const two = [
    { categoryId: 1, weightGrams: 10000, listedRatePerKgPaise: 2000 },
    { categoryId: 2, weightGrams: 5000, listedRatePerKgPaise: 5000 },
  ];
  const rates = askingItemRates(two, 90000); // listed ₹450 -> asked ₹900, both rates double
  assert.deepEqual(rates, [
    { categoryId: 1, ratePerKgPaise: 4000 },
    { categoryId: 2, ratePerKgPaise: 10000 },
  ]);
  assert.equal(lotValuePaise(two, rates), 90000);
});
