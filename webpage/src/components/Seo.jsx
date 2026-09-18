import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'CrusherBook';
const SITE_URL = 'https://crusherbook.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/cruhserbook.webp`;
const SITE_DESCRIPTION = 'CrusherBook is stone crusher plant ERP software for sales slips, boulder entry, stock, party ledger, expenses, weighbridge workflow, and profit reports.';

const buildCanonicalUrl = (path = '/') => {
  const normalizedPath = path === '/' ? '' : String(path || '').replace(/\/$/, '');
  return `${SITE_URL}${normalizedPath || ''}` || SITE_URL;
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  description: SITE_DESCRIPTION,
  sameAs: [
    'https://www.facebook.com/crusherbook',
    'https://twitter.com/crusherbook',
    'https://www.linkedin.com/company/crusherbook',
  ],
  contact: {
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    email: 'support@crusherbook.com',
  },
};

export default function Seo({
  title,
  description,
  path = '/',
  keywords,
  type = 'website',
  image = DEFAULT_OG_IMAGE,
  schema = null,
  author = null,
  publishedDate = null,
  modifiedDate = null,
  breadcrumbs = null,
}) {
  const canonicalUrl = buildCanonicalUrl(path);
  const normalizedTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const keywordContent = Array.isArray(keywords) ? keywords.join(', ') : keywords;
  const finalDescription = description || SITE_DESCRIPTION;

  const breadcrumbSchema = breadcrumbs ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  } : null;

  const combinedSchema = schema ? (Array.isArray(schema) ? [...schema] : [schema]) : [];
  if (breadcrumbSchema) combinedSchema.push(breadcrumbSchema);
  combinedSchema.push(organizationSchema);

  return (
    <Helmet prioritizeSeoTags>
      <html lang="en" />
      <title>{normalizedTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      {keywordContent ? <meta name="keywords" content={keywordContent} /> : null}
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="theme-color" content="#0f172a" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="en" href={canonicalUrl} />
      <link rel="icon" type="image/png" href="/favicon%20crusher.png" />
      <link rel="apple-touch-icon" href="/favicon%20crusher.png" />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={normalizedTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@crusherbook" />
      <meta name="twitter:title" content={normalizedTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={image} />

      {author && <meta name="author" content={author} />}
      {publishedDate && <meta property="article:published_time" content={publishedDate} />}
      {modifiedDate && <meta property="article:modified_time" content={modifiedDate} />}

      {combinedSchema.length > 0 && (
        <script type="application/ld+json">
          {JSON.stringify(
            combinedSchema.length === 1 ? combinedSchema[0] : { '@context': 'https://schema.org', '@graph': combinedSchema }
          )}
        </script>
      )}
    </Helmet>
  );
}
