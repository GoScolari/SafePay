export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiUrl: process.env.API_URL ?? 'http://localhost:3000',

  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    name: process.env.DB_NAME ?? 'safepay_db',
    user: process.env.DB_USER ?? '',
    pass: process.env.DB_PASS ?? '',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '30d',
  },

  mercadoPago: {
    appId: process.env.MP_APP_ID ?? '',
    clientSecret: process.env.MP_CLIENT_SECRET ?? '',
    webhookSecret: process.env.MP_WEBHOOK_SECRET ?? '',
    marketplaceFee: parseInt(process.env.MP_MARKETPLACE_FEE ?? '990', 10),
  },

  twilio: {
    sid: process.env.TWILIO_SID ?? '',
    token: process.env.TWILIO_TOKEN ?? '',
    serviceSid: process.env.TWILIO_SERVICE_SID ?? '',
  },

  aws: {
    s3Bucket: process.env.AWS_S3_BUCKET ?? 'safepay-files',
    region: process.env.AWS_REGION ?? 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },

  firebase: {
    key: process.env.FIREBASE_KEY ?? '',
  },
});
