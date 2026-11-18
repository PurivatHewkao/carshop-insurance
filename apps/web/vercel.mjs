const services = ['identity', 'catalog', 'sales', 'payment', 'reporting'];

const apiRewrites = services.flatMap((service) => {
  const key = `${service.toUpperCase()}_API_ORIGIN`;
  const value = process.env[key];
  if (!value) return [];

  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${key} must be an HTTPS origin without a path`);
  }

  return [
    {
      source: `/api/v1/${service}/:path*`,
      destination: `${url.origin}/api/v1/:path*`,
    },
  ];
});

export const config = {
  rewrites: [
    ...apiRewrites,
    { source: '/((?!api/).*)', destination: '/index.html' },
  ],
};
