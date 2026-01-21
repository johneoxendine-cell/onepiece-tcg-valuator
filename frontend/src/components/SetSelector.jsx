function SetSelector({ sets, selectedSet, onChange, loading }) {
  return (
    <div>
      <label htmlFor="set-select" className="block text-sm font-medium text-gray-300 mb-1">
        Set
      </label>
      <select
        id="set-select"
        value={selectedSet || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={loading}
        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-op-red focus:border-transparent disabled:opacity-50"
      >
        <option value="">All Sets</option>
        {sets.map((set) => (
          <option key={set.id} value={set.id}>
            {set.name} {set.card_count ? `(${set.card_count} cards)` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SetSelector;
