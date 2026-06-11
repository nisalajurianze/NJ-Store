#!/usr/bin/env node

const mongoose = require('mongoose');

const defaultMongoRootUsername = process.env.MONGO_ROOT_USERNAME || 'njstore';
const defaultMongoRootPassword = process.env.MONGO_ROOT_PASSWORD || 'njstore-dev-mongo-password';
const DEFAULT_URI = `mongodb://${encodeURIComponent(defaultMongoRootUsername)}:${encodeURIComponent(defaultMongoRootPassword)}@127.0.0.1:27017/admin?authSource=admin&directConnection=true`;
const DEFAULT_SET_NAME = 'rs0';
const DEFAULT_MEMBER = '127.0.0.1:27017';
const DEFAULT_TIMEOUT_SECONDS = 90;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    uri: DEFAULT_URI,
    setName: DEFAULT_SET_NAME,
    member: DEFAULT_MEMBER,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS
  };

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    const next = args[index + 1];

    if (!next) {
      break;
    }

    if (current === '--uri') {
      options.uri = next;
      index += 1;
      continue;
    }

    if (current === '--set-name') {
      options.setName = next;
      index += 1;
      continue;
    }

    if (current === '--member') {
      options.member = next;
      index += 1;
      continue;
    }

    if (current === '--timeout-seconds') {
      options.timeoutSeconds = Number(next);
      index += 1;
    }
  }

  return options;
};

const withAdmin = async (uri, action) => {
  const connection = await mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 3000
  }).asPromise();

  try {
    return await action(connection.db.admin());
  } finally {
    await connection.close();
  }
};

const isWritablePrimary = (hello, setName) =>
  hello &&
  hello.setName === setName &&
  (hello.isWritablePrimary === true || hello.ismaster === true);

const ensureReplicaSet = async ({ uri, setName, member, timeoutSeconds }) => {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const ready = await withAdmin(uri, async (admin) => {
        const hello = await admin.command({ hello: 1 });

        if (isWritablePrimary(hello, setName)) {
          return true;
        }

        if (hello.setName !== setName) {
          try {
            await admin.command({
              replSetInitiate: {
                _id: setName,
                members: [{ _id: 0, host: member }]
              }
            });
          } catch (error) {
            const message = String(error && error.message ? error.message : error);
            const alreadyInitialized =
              error?.codeName === 'AlreadyInitialized' || message.includes('already initialized');

            if (!alreadyInitialized) {
              throw error;
            }
          }
        }

        return false;
      });

      if (ready) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(2000);
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error(`Replica set '${setName}' did not become writable within ${timeoutSeconds} seconds.`);
};

const main = async () => {
  const options = parseArgs();
  await ensureReplicaSet(options);
  process.stdout.write('PRIMARY_READY\n');
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
