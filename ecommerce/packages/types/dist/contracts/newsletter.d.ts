export interface NewsletterSubscriptionDto {
    id: string;
    email: string;
    isConfirmed: boolean;
    source?: string;
    confirmedAt?: string;
    createdAt?: string;
}
export interface NewsletterSubscribeDto {
    email: string;
    source?: string;
}
export interface NewsletterConfirmDto {
    token: string;
}
