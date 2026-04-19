const sentKeys = new Set<string>()

export async function ensureBrowserNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported'
  }

  if (Notification.permission === 'default') {
    return Notification.requestPermission()
  }

  return Notification.permission
}

export async function notifyBrowser(title: string, body: string, dedupeKey: string) {
  if (sentKeys.has(dedupeKey)) {
    return
  }

  const permission = await ensureBrowserNotificationPermission()
  if (permission !== 'granted') {
    return
  }

  sentKeys.add(dedupeKey)
  new Notification(title, { body })
}
