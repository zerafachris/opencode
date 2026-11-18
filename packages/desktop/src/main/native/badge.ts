import { app } from "electron"

// Each window's contribution: the sessions it shows as unread. Counting the union badges a session open in two
// windows once, and closing one window keeps the other's contribution.
const reported = new Map<number, ReadonlySet<string>>()

export function setUnreadSessions(windowID: number, sessions: readonly string[]) {
  reported.set(windowID, new Set(sessions))
  apply()
}

export function forgetUnreadSessions(windowID: number) {
  if (reported.delete(windowID)) apply()
}

function apply() {
  const count = new Set([...reported.values()].flatMap((sessions) => [...sessions])).size

  // macOS shows this on the Dock icon and Linux on a Unity launcher. A Windows taskbar badge needs an overlay icon
  // instead, so this call reports failure there and changes nothing.
  app.setBadgeCount(count)
}
