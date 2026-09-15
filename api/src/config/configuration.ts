export type AppConfig = {
  nodeEnv: string;
  port: number;
  webOrigin: string;
  databaseUrl: string;
  redisUrl: string;
  jwt: { secret: string; accessTtl: string; refreshTtl: string };
  storage: {
    driver: "local" | "s3";
    localRoot: string;
    region?: string;
    bucket?: string;
  };
  email: { driver: "noop" | "smtp"; from: string };
  xai: { apiKey: string; baseUrl: string; visionModel: string };
  /** Vision adapter: gemma (default) or spacexai. Model IDs stay in env, not call sites. */
  visionDriver: string;
  gemma: { apiKey: string; baseUrl: string; visionModel: string };
  ocrDriver: string;
  qualityDriver: string;
  spellcheckDriver: string;
  similarityDriver: string;
  retentionYears: number;
  releaseEmailEnabled: boolean;
  adminBootstrap: { email: string; password: string };
};

export function configuration(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: parseInt(process.env.PORT ?? "3001", 10),
    webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    jwt: {
      secret: process.env.JWT_SECRET ?? "dev-only-change-me",
      accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
      refreshTtl: process.env.JWT_REFRESH_TTL ?? "7d",
    },
    storage: {
      driver: (process.env.STORAGE_DRIVER as "local" | "s3") ?? "local",
      localRoot: process.env.STORAGE_LOCAL_ROOT ?? ".data/storage",
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET,
    },
    email: {
      driver: (process.env.EMAIL_DRIVER as "noop" | "smtp") ?? "noop",
      from: process.env.SMTP_FROM ?? "noreply@localhost",
    },
    xai: {
      apiKey: process.env.XAI_API_KEY ?? "",
      baseUrl: process.env.XAI_BASE_URL ?? "https://api.x.ai/v1",
      visionModel: process.env.XAI_VISION_MODEL ?? "grok-4.5",
    },
    visionDriver: process.env.VISION_DRIVER ?? "gemma",
    gemma: {
      apiKey:
        process.env.GEMMA_API_KEY ??
        process.env.GOOGLE_API_KEY ??
        process.env.GEMINI_API_KEY ??
        "",
      baseUrl:
        process.env.GEMMA_BASE_URL ??
        "https://generativelanguage.googleapis.com/v1beta/openai",
      visionModel: process.env.GEMMA_VISION_MODEL ?? "gemma-3.6",
    },
    ocrDriver: process.env.OCR_DRIVER ?? "noop",
    qualityDriver: process.env.QUALITY_DRIVER ?? "sharp",
    spellcheckDriver: process.env.SPELLCHECK_DRIVER ?? "noop",
    similarityDriver: process.env.SIMILARITY_DRIVER ?? "noop",
    retentionYears: parseInt(process.env.RETENTION_YEARS ?? "5", 10),
    releaseEmailEnabled: process.env.RELEASE_EMAIL_ENABLED === "true",
    adminBootstrap: {
      email: process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@scriptgrade.local",
      password: process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "ChangeMeNow1",
    },
  };
}
