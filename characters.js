// ═══════════════════════════════════════════
// FACESWAPGIFTS — CHARACTER DATA
// Pulled dynamically from Cloudinary
// Format: Character Type-Gender-Age-image-NNN-N.jpg
// ═══════════════════════════════════════════

const CHARACTER_TYPES = [
  { key: 'armed-forces',          label: 'Armed Forces',          emoji: '🎖️' },
  { key: 'cavemen',               label: 'Cavemen',               emoji: '🪨' },
  { key: 'circus-performers',     label: 'Circus Performers',     emoji: '🎪' },
  { key: 'cowboys',               label: 'Cowboys',               emoji: '🤠' },
  { key: 'detectives',            label: 'Detectives',            emoji: '🔍' },
  { key: 'egyptian-pharaohs',     label: 'Egyptian Pharaohs',     emoji: '👑' },
  { key: 'firefighters',          label: 'Firefighters',          emoji: '🔥' },
  { key: 'gangsters',             label: 'Gangsters',             emoji: '🎩' },
  { key: 'gladiators',            label: 'Gladiators',            emoji: '⚔️' },
  { key: 'knights',               label: 'Knights',               emoji: '🛡️' },
  { key: 'medieval-monks',        label: 'Medieval Monks',        emoji: '📿' },
  { key: 'mermaids',              label: 'Mermaids',              emoji: '🧜' },
  { key: 'pirates',               label: 'Pirates',               emoji: '🏴‍☠️' },
  { key: 'policemen',             label: 'Policemen',             emoji: '👮' },
  { key: 'rockstars',             label: 'Rockstars',             emoji: '🎸' },
  { key: 'royalty',               label: 'Royalty',               emoji: '👸' },
  { key: 'steampunk-adventurers', label: 'Steampunk Adventurers', emoji: '🔭' },
  { key: 'superheroes',           label: 'Superheroes',           emoji: '🦸' },
  { key: 'victorians',            label: 'Victorians',            emoji: '🎩' },
  { key: 'vikings',               label: 'Vikings',               emoji: '⚔️' },
];

const AGE_GROUPS = [
  { key: 'toddler',     label: 'Toddler' },
  { key: 'child',       label: 'Child 6-9 years old' },
  { key: 'teenager',    label: 'Teenager 13-16 years old' },
  { key: 'young-adult', label: 'Young Adult 22-30 years old' },
  { key: 'older-adult', label: 'Older Adult 60-70 years old' },
];

const CLOUDINARY_CLOUD = 'dcyp4e7sp';
const CLOUDINARY_BASE  = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload`;

function cloudinaryUrl(publicId, width = 400) {
  return `${CLOUDINARY_BASE}/w_${width},c_fill,q_auto,f_auto/${publicId}`;
}
