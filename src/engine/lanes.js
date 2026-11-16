import { BODY, FACE } from "../data/products";

/** The rest of body care, in shelf order. Matched picks stay in the first slider. */
const BODY_LINE = [
  BODY.bodyWash,
  BODY.soapLiquid,
  BODY.bodyMilk,
  BODY.bodyMilkRich,
  BODY.deodorant,
  BODY.handBalm,
  BODY.footBalm,
  BODY.lightLegs,
  FACE.scrub,
  FACE.afterSun,
  BODY.shampoo,
  BODY.volumeShampoo,
  BODY.hairTreatment,
  BODY.stayFresh,
  BODY.toothOil,
];

function uniqueInOrder(lists) {
  const seen = new Set();
  const out = [];
  lists.forEach((list) => {
    (list || []).forEach((product) => {
      if (!product?.id || seen.has(product.id)) return;
      seen.add(product.id);
      out.push(product);
    });
  });
  return out;
}

const HAIR = new Set(["volumeShampoo", "shampoo", "hairTreatment"]);

/** Face carousel order. Similar products stay together. Boosters sit with the serums. */
const SKIN_FLOW = [
  "cleanser",
  "cleansingWater",
  "soapLiquid",
  "tonicCalm",
  "tonicPure",
  "hydroSerum",
  "antiWrinkle",
  "overnightRetinal",
  "eyeSerum",
  "addsEffect",
  "addsGlow",
  "addsRepair",
  "creamLight",
  "creamMedium",
  "creamRich",
  "menMoisturiser",
  "skinPerfection",
  "tinted",
  "lipBalm",
  "afterSun",
  "enzymeMask",
  "exfoliatingMask",
  "peptideMask",
  "purifyingMask",
  "scrub",
];

const BODY_FLOW = [
  "bodyWash",
  "soapLiquid",
  "bodyMilk",
  "bodyMilkRich",
  "bodySet",
  "deodorant",
  "handBalm",
  "footBalm",
  "lightLegs",
  "scrub",
  "afterSun",
  "shampoo",
  "volumeShampoo",
  "hairTreatment",
  "stayFresh",
  "toothOil",
];

function inFlow(list, flow) {
  const rank = new Map(flow.map((id, index) => [id, index]));
  return [...list].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
}

/** Shop rows for the results page. Skincare is the full face match, grouped by product. */
export function buildLanes(face, body, supp) {
  const skincare = face ? inFlow(uniqueInOrder([face.am, face.pm, face.weekly]), SKIN_FLOW) : [];
  const skinIds = new Set(skincare.map((product) => product.id));
  const bodyLane = inFlow(
    uniqueInOrder([body]).filter((product) => !skinIds.has(product.id)),
    BODY_FLOW
  );
  const shown = new Set([...skinIds, ...bodyLane.map((product) => product.id)]);
  const bodyMore = BODY_LINE.filter((product) => product?.id && !shown.has(product.id));
  return {
    skincare,
    body: bodyLane,
    bodyMore,
    supplements: supp ? uniqueInOrder([supp.daily, supp.targeted]) : [],
  };
}

export function bodyLaneLabel(items) {
  return (items || []).some((product) => HAIR.has(product.id)) ? "Body & hair" : "Body";
}
