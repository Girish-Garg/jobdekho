try { process.loadEnvFile() } catch {}

export default {
  schema: './packages/db/src/schema.js',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL },
}
