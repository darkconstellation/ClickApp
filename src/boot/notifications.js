import { ensureNotificationServiceWorker } from 'src/utils/notifications'

export default async () => {
  void ensureNotificationServiceWorker()
}
