import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { logger } from './logger.js';

import '../models/AdminPermissionProfile.js';
import '../models/AuditLog.js';
import '../models/BackInStockSubscription.js';
import '../models/Banner.js';
import '../models/Brand.js';
import '../models/Cart.js';
import '../models/Category.js';
import '../models/CompareList.js';
import '../models/Coupon.js';
import '../models/CouponUsage.js';
import '../models/EmailTemplate.js';
import '../models/LoyaltyTransaction.js';
import '../models/ManualExpense.js';
import '../models/NewsletterSubscriber.js';
import '../models/Notification.js';
import '../models/Order.js';
import '../models/Product.js';
import '../models/ProductQuestion.js';
import '../models/ProductVersion.js';
import '../models/RefreshSession.js';
import '../models/ReturnRequest.js';
import '../models/Review.js';
import '../models/ReviewHelpfulVote.js';
import '../models/SiteConfig.js';
import '../models/StoreSetting.js';
import '../models/StoreSettingVersion.js';
import '../models/User.js';
import '../models/Wishlist.js';

const createIndexes = async (): Promise<void> => {
  await connectDatabase();

  const modelNames = mongoose.modelNames().sort();
  for (const modelName of modelNames) {
    const model = mongoose.model(modelName);
    logger.info(`mongo.indexes.create model=${modelName}`);
    await model.createIndexes();
  }

  logger.info(`mongo.indexes.complete models=${modelNames.length}`);
};

createIndexes()
  .catch((error) => {
    logger.error(error as Error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
