import { useState } from 'react';
import { Link } from 'react-router-dom';

function SetCard({ set }) {
  const { id, name, image_url, set_code } = set;
  const [imageError, setImageError] = useState(false);

  // Use set_code from API or extract from name as fallback
  const displayCode = set_code || extractSetCode(name, id);

  return (
    <div className="set-card">
      {/* Set Image/Logo Area */}
      <div className="aspect-[4/3] bg-gradient-to-br from-dark-border to-dark-bg flex items-center justify-center overflow-hidden">
        {image_url && !imageError ? (
          <img
            src={image_url}
            alt={name}
            className="w-full h-full object-contain p-2"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="text-center p-4">
            <span className="text-2xl font-bold text-white/80">{displayCode}</span>
          </div>
        )}
      </div>

      {/* Set Info */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-white truncate" title={name}>
          {formatSetName(name, displayCode)}
        </h3>

        <Link
          to={`/cards?set_id=${id}`}
          className="btn-orange inline-block mt-3 text-center w-full"
        >
          View Collection
        </Link>
      </div>
    </div>
  );
}

// Extract set code like "OP01", "ST01", etc. from set name or id
function extractSetCode(name, id) {
  // Try to find pattern like OP01, ST01, EB01, etc. in the name
  const codeMatch = name.match(/\b(OP|ST|EB|PRB)\d+\b/i);
  if (codeMatch) {
    return codeMatch[0].toUpperCase();
  }

  // Try from id
  const idMatch = id?.match(/(op|st|eb|prb)-?\d+/i);
  if (idMatch) {
    return idMatch[0].toUpperCase().replace('-', '');
  }

  // Fallback: first 2-4 chars of name
  const words = name.split(' ');
  if (words.length >= 2) {
    return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

// Format set name (optionally remove redundant code)
function formatSetName(name, code) {
  // If the name starts with the code, keep it as is
  if (name.toUpperCase().startsWith(code)) {
    return name;
  }
  return name;
}

export default SetCard;
