import type { NotificationType } from '../constants/enums.js';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}
