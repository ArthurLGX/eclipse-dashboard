// env.d.ts
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            HOST: string;
            PORT: string;
            APP_KEYS: string;
            DATABASE_CLIENT: string;
            DATABASE_HOST: string;
            DATABASE_PORT: string;
            DATABASE_NAME: string;
            DATABASE_USERNAME: string;
            DATABASE_PASSWORD: string;
            DATABASE_SSL: string;
            // Ajoutez ici toutes les autres variables d'environnement que vous utilisez
        }
    }
}
export {};
