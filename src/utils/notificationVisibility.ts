import type { Notification } from '../data/mockData';

/** اعلان عمومی (بدون گیرنده) برای همه؛ با گیرنده فقط برای همان کاربر */
export function isNotificationVisibleToUser(n: Notification, user: { id: number } | null): boolean {
  if (!user) return false;
  if (n.recipient_user_id == null || n.recipient_user_id === undefined) return true;
  return n.recipient_user_id === user.id;
}
