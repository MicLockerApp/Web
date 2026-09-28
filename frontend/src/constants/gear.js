// Gear categories and conditions, matching the app backend's enums
// (Backend/MicLocker-Backend/app/gear/models.py) and the iOS browse labels
// (iOS GearModel.swift). One label can cover several backend keys.

export const GEAR_CATEGORIES = [
  { label: 'Guitars', keys: ['guitars'], icon: '🎸' },
  { label: 'Basses', keys: ['basses'], icon: '🎸' },
  { label: 'Amps & Effects', keys: ['amps', 'effects'], icon: '🎛️' },
  { label: 'Studio & Recording', keys: ['recording'], icon: '🎚️' },
  { label: 'Microphones', keys: ['microphones'], icon: '🎤' },
  { label: 'Live Sound & Lighting', keys: ['live_sound'], icon: '💡' },
  { label: 'Keys & Synth', keys: ['keys', 'synths'], icon: '🎹' },
  { label: 'DJ & Production', keys: ['dj'], icon: '💿' },
  { label: 'Drums & Percussion', keys: ['drums'], icon: '🥁' },
  { label: 'Band & Orchestra', keys: ['brass'], icon: '🎺' },
  { label: 'Software & Plugins', keys: ['software_plugins'], icon: '💻' },
  { label: 'Headphones', keys: ['headphones'], icon: '🎧' },
  { label: 'Cables & Accessories', keys: ['cables_accessories'], icon: '🔌' },
];

// Older website category names (links, bookmarks, the home page tiles) → label above.
const LEGACY_CATEGORY_NAMES = {
  'Bass': 'Basses',
  'Keyboards & Synths': 'Keys & Synth',
  'Pro Audio': 'Live Sound & Lighting',
  'Recording Equipment': 'Studio & Recording',
  'Studio Monitors': 'Studio & Recording',
  'DJ Equipment': 'DJ & Production',
  'Effects Pedals': 'Amps & Effects',
  'Amplifiers': 'Amps & Effects',
  'Cables & Connectors': 'Cables & Accessories',
  'Accessories': 'Cables & Accessories',
  'Wind Instruments': 'Band & Orchestra',
  'String Instruments': 'Band & Orchestra',
};

export const categoryByLabel = (label) => {
  if (!label) return null;
  const resolved = LEGACY_CATEGORY_NAMES[label] || label;
  return GEAR_CATEGORIES.find(c => c.label.toLowerCase() === resolved.toLowerCase())
    || GEAR_CATEGORIES.find(c => c.keys.includes(label))
    || null;
};

export const categoryLabelForKey = (key) =>
  (GEAR_CATEGORIES.find(c => c.keys.includes(key)) || {}).label || key;

// When creating/editing a listing, each label is saved as one backend key.
export const categoryKeyForLabel = (label) => {
  const c = categoryByLabel(label);
  return c ? c.keys[0] : null;
};

export const GEAR_CONDITIONS = [
  { label: 'Brand New', key: 'brand_new' },
  { label: 'Mint', key: 'mint' },
  { label: 'Excellent', key: 'excellent' },
  { label: 'Very Good', key: 'very_good' },
  { label: 'Good', key: 'good' },
  { label: 'Fair', key: 'fair' },
];

export const conditionLabelForKey = (key) =>
  (GEAR_CONDITIONS.find(c => c.key === key) || {}).label || key;

export const conditionKeyForLabel = (label) => {
  if (!label) return null;
  const c = GEAR_CONDITIONS.find(x => x.label.toLowerCase() === String(label).toLowerCase() || x.key === label);
  return c ? c.key : null;
};

// Profile roles (backend ProCategory). Kept as the backend's snake_case values.
export const PRO_CATEGORY_LABEL = (cat) =>
  cat ? String(cat).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
