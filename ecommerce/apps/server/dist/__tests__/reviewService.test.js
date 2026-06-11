import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { Review } from '../models/Review.js';
import { ReviewHelpfulVote } from '../models/ReviewHelpfulVote.js';
import { User } from '../models/User.js';
import { reviewService } from '../services/reviewService.js';
import { clearTestDB, setupTestDB, teardownTestDB } from './testSetup.js';
const TEST_TIMEOUT = 60000;
beforeAll(async () => {
    await setupTestDB();
}, TEST_TIMEOUT);
afterAll(async () => {
    await teardownTestDB();
}, TEST_TIMEOUT);
beforeEach(async () => {
    await clearTestDB();
});
describe('reviewService helpful votes', () => {
    it('stores helpful votes in the dedicated collection and reports the viewer state', async () => {
        const author = await User.create({
            name: 'Review Author',
            email: 'author@example.com',
            password: 'Password123!'
        });
        const viewer = await User.create({
            name: 'Helpful Viewer',
            email: 'viewer@example.com',
            password: 'Password123!'
        });
        const productId = new Types.ObjectId();
        const review = await Review.create({
            product: productId,
            user: author._id,
            order: new Types.ObjectId(),
            rating: 5,
            title: 'Excellent setup',
            comment: 'The purchase and setup experience was smooth.',
            isApproved: true
        });
        const markedHelpful = await reviewService.toggleHelpfulVote(review._id.toString(), viewer._id.toString());
        expect(markedHelpful.helpfulVotes).toBe(1);
        expect(markedHelpful.viewerHasHelpfulVote).toBe(true);
        await expect(ReviewHelpfulVote.countDocuments({ review: review._id, user: viewer._id })).resolves.toBe(1);
        const listedReviews = await reviewService.listProductReviews(productId.toString(), viewer._id.toString());
        expect(listedReviews).toHaveLength(1);
        expect(listedReviews[0]?.viewerHasHelpfulVote).toBe(true);
        const unmarkedHelpful = await reviewService.toggleHelpfulVote(review._id.toString(), viewer._id.toString());
        expect(unmarkedHelpful.helpfulVotes).toBe(0);
        expect(unmarkedHelpful.viewerHasHelpfulVote).toBe(false);
        await expect(ReviewHelpfulVote.countDocuments({ review: review._id, user: viewer._id })).resolves.toBe(0);
    }, TEST_TIMEOUT);
});
