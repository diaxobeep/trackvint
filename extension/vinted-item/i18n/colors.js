/**
 * Traduction des noms de couleurs anglais → français.
 * Vinted stocke parfois les couleurs en anglais dans le payload Next.js.
 */
const COLOR_EN_TO_FR = {
  Black: 'Noir',
  White: 'Blanc',
  Grey: 'Gris',
  Gray: 'Gris',
  Red: 'Rouge',
  Blue: 'Bleu',
  Navy: 'Bleu marine',
  'Light blue': 'Bleu clair',
  Green: 'Vert',
  'Dark green': 'Vert foncé',
  'Light green': 'Vert clair',
  Khaki: 'Kaki',
  Mint: 'Menthe',
  Yellow: 'Jaune',
  Mustard: 'Moutarde',
  Orange: 'Orange',
  Pink: 'Rose',
  'Light pink': 'Rose clair',
  'Hot pink': 'Rose fuchsia',
  Fuchsia: 'Fuchsia',
  Purple: 'Violet',
  Lilac: 'Lilas',
  Brown: 'Marron',
  Beige: 'Beige',
  Cream: 'Crème',
  Multi: 'Multicolore',
  Multicolor: 'Multicolore',
  Multicolour: 'Multicolore',
  Gold: 'Doré',
  Silver: 'Argenté',
  Bronze: 'Bronze',
  Copper: 'Cuivre',
  Turquoise: 'Turquoise',
  Coral: 'Corail',
  Burgundy: 'Bordeaux',
  Apricot: 'Abricot',
  Salmon: 'Saumon',
  Rose: 'Rose',
};

/**
 * @param {string} colorName
 * @returns {string}
 */
export function translateColorName(colorName) {
  const trimmed = colorName.trim();
  return COLOR_EN_TO_FR[trimmed] ?? trimmed;
}
