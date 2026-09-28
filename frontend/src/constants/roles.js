// Profile roles — the app backend's ProCategory enum.
const ROLE_KEYS = [
  'musician', 'artist', 'audio_engineer', 'studio', 'venue', 'photographer',
  'videographer', 'manager', 'actor', 'comedian', 'merchant', 'show_pro',
  'services', 'public_speaker', 'church', 'tattoo_artist', 'hair', 'makeup',
  'promoter',
];

const LABELS = {
  audio_engineer: 'Audio Engineer',
  show_pro: 'Show Pro',
  public_speaker: 'Public Speaker',
  tattoo_artist: 'Tattoo Artist',
};

export const roleLabel = (key) =>
  LABELS[key] || (key ? key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '');

export const PRO_CATEGORIES = ROLE_KEYS.map(key => ({ value: key, id: key, key, label: roleLabel(key), name: roleLabel(key) }));
