const COMMON_RARITIES = [
  { value: '', label: 'All Rarities' },
  { value: 'Leader', label: 'Leader' },
  { value: 'SEC', label: 'Secret Rare (SEC)' },
  { value: 'SR', label: 'Super Rare (SR)' },
  { value: 'R', label: 'Rare (R)' },
  { value: 'UC', label: 'Uncommon (UC)' },
  { value: 'C', label: 'Common (C)' },
];

function RarityFilter({ selectedRarity, onChange, customRarities = [] }) {
  // Merge common rarities with any custom ones from the API
  const allRarities = [...COMMON_RARITIES];

  customRarities.forEach((rarity) => {
    if (!allRarities.some((r) => r.value === rarity)) {
      allRarities.push({ value: rarity, label: rarity });
    }
  });

  return (
    <div>
      <label htmlFor="rarity-filter" className="block text-sm font-medium text-gray-300 mb-1">
        Rarity
      </label>
      <select
        id="rarity-filter"
        value={selectedRarity || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-op-red focus:border-transparent"
      >
        {allRarities.map((rarity) => (
          <option key={rarity.value} value={rarity.value}>
            {rarity.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default RarityFilter;
