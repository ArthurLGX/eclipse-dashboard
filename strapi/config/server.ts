// ./config/server.ts
import { env } from '@strapi/utils';

// eslint-disable-next-line import/no-anonymous-default-export
export default () => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  logger: {
    level: 'debug',
    requests: true,
  },
});
