import { createEffect, onCleanup } from "solid-js"
import { usePlatform } from "@/runtime/platform/platform"
import { useGlobal } from "@/runtime/server/runtime"
import { projectSettingsKey, useSettings } from "@/settings/model"
import { sessionStatus } from "@/shell/layout/project-avatar-state"
import { useTabs } from "@/shell/tabs/tabs"

// Reports the sessions this window shows as unread, so the app icon badge counts them like a tab's dot. Main adds
// every window's set together, so a session open in two windows badges once.
export function useUnreadBadge() {
  const platform = usePlatform()
  const tabs = useTabs()
  const global = useGlobal()
  const settings = useSettings()

  createEffect(() => {
    if (!platform.setUnreadSessions) return
    const unread = new Set<string>()

    for (const tab of tabs.store) {
      if (tab.type !== "session") continue
      const ctx = global.serverCtx(tab.server)
      const session = ctx?.data.session.get(tab.sessionId)

      if (!ctx || !session || global.sessionPreferences.muted(tab.server, tab.sessionId)) continue
      const project = projectSettingsKey(ctx.sdk.scope, session.projectID)

      const status = sessionStatus(ctx, tab.sessionId, {
        root: true,
        autoApprove: settings.permissions.autoApproves(project),
      })

      // A pending question or permission shows the same dot as an unread completion.
      if (status === "unread" || status === "input") unread.add(`${tab.server}\n${tab.sessionId}`)
    }

    platform.setUnreadSessions([...unread])
  })

  // A closed window is forgotten by main; a reload or teardown reports none before that.
  onCleanup(() => platform.setUnreadSessions?.([]))
}
