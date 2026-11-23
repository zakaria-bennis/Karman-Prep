/*
 * Two-way table contexts for m-probability (probability.ts): row and column categories with the
 * phrases each question needs ("selecting a red maple", "given that the tree is from site A").
 */
export interface Way {
  name: string;
  /** "selecting ___": a red maple. */
  sel: string;
  /** "given that the tree ___": is a red maple. */
  given: string;
  /** "16 of them are ___": red maples. */
  are: string;
  /** For a column, what follows a row's sel in a joint description: from site A. */
  is?: string;
}

export interface TwoCtx {
  intro: (n: number) => string;
  item: string;
  corner: string;
  groupLabel: string;
  rows: Way[];
  cols: Way[];
}

export const TWO_CTX: TwoCtx[] = [
  {
    intro: (n) =>
      `The table shows the distribution of three types of trees at two sites, for ${n} trees in all.`,
    item: "tree",
    corner: "Type of tree",
    groupLabel: "Site",
    rows: [
      { name: "Red maple", sel: "a red maple", given: "is a red maple", are: "red maples" },
      {
        name: "Chestnut oak",
        sel: "a chestnut oak",
        given: "is a chestnut oak",
        are: "chestnut oaks",
      },
      {
        name: "Black cherry",
        sel: "a black cherry",
        given: "is a black cherry",
        are: "black cherries",
      },
    ],
    cols: [
      {
        name: "Site A",
        sel: "a tree from site A",
        given: "is from site A",
        are: "from site A",
        is: "from site A",
      },
      {
        name: "Site B",
        sel: "a tree from site B",
        given: "is from site B",
        are: "from site B",
        is: "from site B",
      },
    ],
  },
  {
    intro: (n) =>
      `A bin holds ${n} T-shirts for two teams. The table shows the number of T-shirts by size and team.`,
    item: "T-shirt",
    corner: "Size",
    groupLabel: "Team",
    rows: [
      { name: "Small", sel: "a small T-shirt", given: "is small", are: "small" },
      { name: "Medium", sel: "a medium T-shirt", given: "is medium", are: "medium" },
      { name: "Large", sel: "a large T-shirt", given: "is large", are: "large" },
    ],
    cols: [
      {
        name: "Flames",
        sel: "a Flames T-shirt",
        given: "is a Flames T-shirt",
        are: "Flames T-shirts",
        is: "for the Flames",
      },
      {
        name: "Panthers",
        sel: "a Panthers T-shirt",
        given: "is a Panthers T-shirt",
        are: "Panthers T-shirts",
        is: "for the Panthers",
      },
    ],
  },
  {
    intro: (n) =>
      `The table summarizes where ${n} students at a school ate lunch on one day, by grade.`,
    item: "student",
    corner: "Location",
    groupLabel: "Grade",
    rows: [
      {
        name: "On campus",
        sel: "a student who ate on campus",
        given: "ate on campus",
        are: "students who ate on campus",
      },
      {
        name: "Off campus",
        sel: "a student who ate off campus",
        given: "ate off campus",
        are: "students who ate off campus",
      },
    ],
    cols: [
      {
        name: "Grade 10",
        sel: "a student in grade 10",
        given: "is in grade 10",
        are: "in grade 10",
        is: "in grade 10",
      },
      {
        name: "Grade 11",
        sel: "a student in grade 11",
        given: "is in grade 11",
        are: "in grade 11",
        is: "in grade 11",
      },
      {
        name: "Grade 12",
        sel: "a student in grade 12",
        given: "is in grade 12",
        are: "in grade 12",
        is: "in grade 12",
      },
    ],
  },
  {
    intro: (n) => `The table shows the flavor and topping for ${n} orders at an ice cream shop.`,
    item: "order",
    corner: "Flavor",
    groupLabel: "Topping",
    rows: [
      { name: "Chocolate", sel: "a chocolate order", given: "is chocolate", are: "chocolate" },
      { name: "Vanilla", sel: "a vanilla order", given: "is vanilla", are: "vanilla" },
      { name: "Strawberry", sel: "a strawberry order", given: "is strawberry", are: "strawberry" },
    ],
    cols: [
      {
        name: "Sprinkles",
        sel: "an order with sprinkles",
        given: "has sprinkles",
        are: "topped with sprinkles",
        is: "with sprinkles",
      },
      {
        name: "No sprinkles",
        sel: "an order without sprinkles",
        given: "has no sprinkles",
        are: "without sprinkles",
        is: "without sprinkles",
      },
    ],
  },
  {
    intro: (n) =>
      `Three sets of blocks have ${n} blocks in all. The table shows the number of each finish in each set.`,
    item: "block",
    corner: "Finish",
    groupLabel: "Set",
    rows: [
      {
        name: "Wood finish",
        sel: "a wood-finish block",
        given: "has a wood finish",
        are: "wood-finish blocks",
      },
      { name: "Painted", sel: "a painted block", given: "is painted", are: "painted" },
    ],
    cols: [
      {
        name: "Set A",
        sel: "a block from set A",
        given: "is from set A",
        are: "from set A",
        is: "from set A",
      },
      {
        name: "Set B",
        sel: "a block from set B",
        given: "is from set B",
        are: "from set B",
        is: "from set B",
      },
      {
        name: "Set C",
        sel: "a block from set C",
        given: "is from set C",
        are: "from set C",
        is: "from set C",
      },
    ],
  },
];
