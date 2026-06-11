import { z } from 'zod';
import { CUSTOMER_BEHAVIOR_EVENTS } from '../models/CustomerBehaviorEvent.js';
const analyticsPropertiesSchema = z.record(z.unknown()).default({});
const analyticsEventSchema = z.object({
    event: z.enum(CUSTOMER_BEHAVIOR_EVENTS),
    timestamp: z.string().datetime().optional(),
    anonymousId: z.string().trim().min(8).max(120),
    userId: z.string().trim().max(120).optional(),
    funnelStep: z.string().trim().max(80).optional(),
    acquisition: z
        .object({
        source: z.string().trim().max(120).optional(),
        medium: z.string().trim().max(80).optional(),
        campaign: z.string().trim().max(160).optional()
    })
        .passthrough()
        .optional(),
    properties: analyticsPropertiesSchema
});
export const analyticsEventsSchema = z.object({
    events: z.array(analyticsEventSchema).min(1).max(20)
});
