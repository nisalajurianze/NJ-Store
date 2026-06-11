import type { AddressDto, SessionDto, UserSummary } from './common.js';
export interface AuthTokensDto {
    accessToken: string;
    expiresIn: number;
}
export interface AuthPayloadDto {
    user: UserSummary;
    tokens: AuthTokensDto;
    sessions: SessionDto[];
    addresses: AddressDto[];
}
export interface LoginDto {
    email: string;
    password: string;
    rememberMe?: boolean;
}
export interface RegisterDto {
    name: string;
    email: string;
    password: string;
    phone?: string;
    language?: 'en' | 'si';
}
export interface ForgotPasswordDto {
    email: string;
}
export interface ResetPasswordDto {
    token: string;
    password: string;
}
export interface GoogleLoginDto {
    credential: string;
    rememberMe?: boolean;
}
export interface VerificationEmailResultDto {
    previewMode: boolean;
    verificationUrl?: string;
}
