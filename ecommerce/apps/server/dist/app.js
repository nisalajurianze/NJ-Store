import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoose from 'mongoose';
import morgan from 'morgan';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { getHealth } from './controllers/healthController.js';
import { openApiSpec } from './docs/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import { requireAuthCsrfToken } from './middleware/csrf.js';
import { applyQueryTimeoutPlugin, queryTimeoutErrorHandler } from './middleware/queryTimeout.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import siteConfigRoutes from './routes/siteConfigRoutes.js';
import footerRoutes from './routes/footerRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import homeFeedRoutes from './routes/homeFeedRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { AppError } from './utils/AppError.js';
import { winstonStream } from './utils/logger.js';
import { extractApiVersion } from './middleware/apiVersion.js';
import { mongoSanitize, xssSanitize } from './middleware/sanitize.js';
import { performanceMonitor } from './middleware/performanceMonitor.js';
import { resolveLocalAssetPath } from './services/uploadService.js';
import { isAllowedOrigin } from './utils/origin.js';
// Apply the query-timeout plugin to every Mongoose schema registered from
// this point forward. Models loaded before this line are unaffected, but all
// application models are imported lazily via route handlers so this runs first.
mongoose.plugin(applyQueryTimeoutPlugin);
const app = express();
const allowedOrigins = new Set([env.CLIENT_URL, env.ADMIN_URL]);
const sensitiveRoutePrefixes = ['/api/v1/auth', '/api/v1/admin', '/api/v1/cart', '/api/v1/orders', '/api/v1/contact', '/api/v1/newsletter', '/api/v1/notifications'];
const shouldEnforceHttps = env.NODE_ENV === 'production';
const getForwardedProto = (value) => {
    if (Array.isArray(value)) {
        return value[0];
    }
    return value?.split(',')[0]?.trim().toLowerCase();
};
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
    if (req.path === '/api/v1/health') {
        next();
        return;
    }
    if (!shouldEnforceHttps) {
        next();
        return;
    }
    const forwardedProto = getForwardedProto(req.headers['x-forwarded-proto']);
    const isSecureRequest = req.secure || forwardedProto === 'https';
    if (isSecureRequest) {
        next();
        return;
    }
    const host = req.get('host');
    if (!host) {
        next(new AppError('Host header is required', 400));
        return;
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
        res.redirect(308, `https://${host}${req.originalUrl}`);
        return;
    }
    res.status(400).json({
        success: false,
        message: 'HTTPS is required'
    });
});
app.use(helmet({
    crossOriginOpenerPolicy: {
        policy: 'same-origin-allow-popups'
    },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            scriptSrc: ["'self'", 'https://accounts.google.com'],
            imgSrc: ["'self'", 'data:', 'res.cloudinary.com', 'https:'],
            connectSrc: ["'self'", env.CLIENT_URL, env.ADMIN_URL],
            frameSrc: ["'self'", 'https://www.google.com', 'https://maps.google.com'],
            formAction: ["'self'", env.CLIENT_URL, env.ADMIN_URL]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true
}));
app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin, allowedOrigins, env.NODE_ENV)) {
            callback(null, true);
            return;
        }
        callback(new AppError('Origin not allowed', 403));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'X-CSRF-Token'],
    optionsSuccessStatus: 204,
    maxAge: 600
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use((req, res, next) => {
    const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const isSensitiveRoute = sensitiveRoutePrefixes.some((prefix) => req.path.startsWith(prefix)) || req.path === '/api/v1/coupons/apply';
    if (isMutation || isSensitiveRoute) {
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});
app.use(mongoSanitize);
app.use(xssSanitize);
app.use(hpp());
app.use(compression({ threshold: 1024 }));
app.use(cookieParser());
app.use(morgan('combined', { stream: winstonStream }));
app.use(extractApiVersion);
app.use((req, _res, next) => {
    req.requestId = crypto.randomUUID();
    next();
});
app.use(performanceMonitor);
app.use(requireAuthCsrfToken);
app.get('/api/v1/health', getHealth);
app.use('/api', globalRateLimiter);
app.get('/api/v1/docs.json', (_req, res) => {
    res.json(openApiSpec);
});
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    explorer: true,
    customSiteTitle: 'NJ Store API Docs'
}));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'public', 'uploads'), {
    fallthrough: true,
    etag: true,
    maxAge: '1d'
}));
app.get(/^\/uploads\/(.+)$/, (req, res, next) => {
    const relativePath = String(req.params[0] ?? '').replace(/^\/+/, '');
    if (!relativePath) {
        next(new AppError('Asset not found', 404));
        return;
    }
    res.sendFile(resolveLocalAssetPath(`local:${relativePath}`), (error) => {
        if (!error) {
            return;
        }
        if (error.statusCode === 404 || error.code === 'ENOENT') {
            next(new AppError('Asset not found', 404));
            return;
        }
        next(error);
    });
});
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/brands', brandRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/newsletter', newsletterRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/site-config', siteConfigRoutes);
app.use('/api/v1/footer', footerRoutes);
app.use('/api/v1/banners', bannerRoutes);
app.use('/api/v1/home-feed', homeFeedRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use((_req, _res, next) => {
    next(new AppError('Route not found', 404));
});
app.use(queryTimeoutErrorHandler);
app.use(errorHandler);
export default app;
