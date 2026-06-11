export interface ReviewDto {
    id: string;
    product: string;
    productName?: string;
    user: {
        id: string;
        name: string;
    };
    order: string;
    rating: number;
    title: string;
    comment: string;
    isVerified: boolean;
    isVerifiedBuyer: boolean;
    isApproved: boolean;
    helpfulVotes: number;
    viewerHasHelpfulVote?: boolean;
    adminReply?: string;
    adminRepliedAt?: string;
    createdAt: string;
}
