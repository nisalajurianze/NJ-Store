import { catchAsync } from '../utils/catchAsync.js';
const resolveBuildMetadata = () => ({
    commit: process.env.RAILWAY_GIT_COMMIT_SHA ??
        process.env.GITHUB_SHA ??
        process.env.VERCEL_GIT_COMMIT_SHA ??
        null,
    branch: process.env.RAILWAY_GIT_BRANCH ??
        process.env.GITHUB_REF_NAME ??
        process.env.VERCEL_GIT_COMMIT_REF ??
        null,
    service: process.env.RAILWAY_SERVICE_NAME ?? null
});
export const getHealth = catchAsync(async (_req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: 'ok',
            uptime: process.uptime(),
            environment: process.env.NODE_ENV ?? 'development',
            build: resolveBuildMetadata()
        }
    });
});
