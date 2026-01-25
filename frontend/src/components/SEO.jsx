import { Helmet } from 'react-helmet-async';

// Breadcrumb structured data component
export function BreadcrumbSchema({ items }) {
  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbList)}
      </script>
    </Helmet>
  );
}

// Product structured data for cards
export function CardProductSchema({ card }) {
  if (!card || !card.current_price) return null;

  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": card.name,
    "description": `${card.name} from ${card.set_name || 'One Piece TCG'}. ${card.rarity || ''} card.`,
    "image": card.image_url,
    "brand": {
      "@type": "Brand",
      "name": "One Piece TCG"
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "USD",
      "price": card.current_price,
      "availability": "https://schema.org/InStock",
      "url": card.tcgplayer_id
        ? `https://www.tcgplayer.com/product/${card.tcgplayer_id}`
        : "https://optcgmarket.com/cards"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(product)}
      </script>
    </Helmet>
  );
}

// FAQ structured data
export function FAQSchema({ faqs }) {
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(faqPage)}
      </script>
    </Helmet>
  );
}

export default { BreadcrumbSchema, CardProductSchema, FAQSchema };
