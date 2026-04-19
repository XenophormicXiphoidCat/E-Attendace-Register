import { PUSH_PUBLIC_KEY } from '../config/app'
import { savePushSubscription } from './attendanceService'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export async function registerPushNotifications(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !PUSH_PUBLIC_KEY) {
    return
  }

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    await savePushSubscription(existing.toJSON(), userId)
    return
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(PUSH_PUBLIC_KEY),
  })

  await savePushSubscription(subscription.toJSON(), userId)
}
