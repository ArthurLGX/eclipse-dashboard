// ./config/server.ts
type Env = {
  (key: string, defaultValue?: string): string | undefined;
  (key: string, defaultValue?: boolean): boolean | undefined;
  (key: string, defaultValue?: number): number | undefined;
  bool(key: string, defaultValue?: boolean): boolean | undefined;
  int(key: string, defaultValue?: number): number | undefined;
  // Ajoutez d'autres méthodes si nécessaire, comme float, json, array, etc.
  array(key: string, defaultValue?: string[]): string[] | undefined;
};

export default ({ env }: { env: Env }) => ({
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
