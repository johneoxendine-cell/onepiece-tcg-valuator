function ValuationBadge({ valuation }) {
  if (!valuation) {
    return (
      <span className="valuation-badge bg-gray-600">
        No Data
      </span>
    );
  }

  const { status, deviation } = valuation;

  const statusClasses = {
    undervalued: 'bg-green-600',
    overvalued: 'bg-red-600',
    fair: 'bg-gray-600'
  };

  const statusLabels = {
    undervalued: 'Undervalued',
    overvalued: 'Overvalued',
    fair: 'Fair Value'
  };

  const deviationDisplay = deviation > 0 ? `+${deviation.toFixed(1)}%` : `${deviation.toFixed(1)}%`;

  return (
    <div className="flex items-center gap-2">
      <span className={`valuation-badge ${statusClasses[status] || 'bg-gray-600'}`}>
        {statusLabels[status] || status}
      </span>
      <span className={`text-xs font-mono ${deviation > 0 ? 'text-red-400' : deviation < 0 ? 'text-green-400' : 'text-gray-400'}`}>
        {deviationDisplay}
      </span>
    </div>
  );
}

export default ValuationBadge;
