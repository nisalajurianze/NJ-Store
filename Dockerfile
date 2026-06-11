FROM node:22-bookworm-slim AS build

WORKDIR /app/ecommerce

COPY ecommerce/package.json ecommerce/package-lock.json ./
COPY ecommerce/apps/server/package.json ./apps/server/package.json
COPY ecommerce/apps/store-client/package.json ./apps/store-client/package.json
COPY ecommerce/apps/admin-client/package.json ./apps/admin-client/package.json
COPY ecommerce/packages/types/package.json ./packages/types/package.json
COPY ecommerce/packages/utils/package.json ./packages/utils/package.json
COPY ecommerce/packages/ui/package.json ./packages/ui/package.json

RUN npm ci

COPY ecommerce/tsconfig.base.json ./tsconfig.base.json
COPY ecommerce/apps/server ./apps/server
COPY ecommerce/packages ./packages

RUN npm run build --workspace @njstore/types \
  && npm run build --workspace @njstore/utils \
  && npm run build:app --workspace @njstore/server \
  && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

WORKDIR /app/ecommerce

ENV NODE_ENV=production

COPY --from=build /app/ecommerce/package.json ./package.json
COPY --from=build /app/ecommerce/node_modules ./node_modules
COPY --from=build /app/ecommerce/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/ecommerce/apps/server/dist ./apps/server/dist
COPY --from=build /app/ecommerce/packages/types/package.json ./packages/types/package.json
COPY --from=build /app/ecommerce/packages/types/dist ./packages/types/dist
COPY --from=build /app/ecommerce/packages/utils/package.json ./packages/utils/package.json
COPY --from=build /app/ecommerce/packages/utils/dist ./packages/utils/dist

RUN mkdir -p public/uploads

EXPOSE 5000

CMD ["npm", "run", "start", "--workspace", "@njstore/server"]
