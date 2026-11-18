import { expect, story } from "../../stories/playwright/story"

const playground = "timeline-playground--playground"

story("a subagent row leads with its status chip", async ({ mount }) => {
  const timeline = await mount(playground, { args: { scenario: "Background work", activity: true } })
  const rows = timeline.locator('[data-component="timeline-subagent"] > [data-slot="timeline-event-item"]')

  await expect(rows.locator('[data-slot="timeline-event-item-status"]')).toHaveText([
    "Started",
    "Started",
    "Updated",
    "Completed",
    "Failed",
    "Started",
    "Started",
    "Completed",
    "Stopped",
  ])
  // Agent names are capitalized by CSS, so their text is as configured.
  await expect(rows.nth(3).locator("> *")).toHaveText(["Completed", "review Agent", "Review the theme store"])
})

// The timeline is a list of events: a start keeps its ring even while its subagent has not reported back.
story("a started subagent never spins", async ({ mount }) => {
  const timeline = await mount(playground, { args: { scenario: "Subagent between tools", activity: true } })
  const status = timeline.locator('[data-component="timeline-subagent"] [data-slot="timeline-event-item-status"]')

  await expect(status).toHaveText("Started")
  await expect(status.locator('svg[data-slot="timeline-event-item-glyph"] circle')).toHaveCount(1)
  await expect(status.locator('[data-component="session-progress-indicator-v2"]')).toHaveCount(0)
})

story("a failed tool row truncates a long command and keeps its status badge on one unclipped line", async ({ mount }) => {
  const timeline = await mount(playground, { args: { scenario: "Every tool", preset: "everything", width: "480" } })
  await timeline.getByRole("button", { name: "Shell Exit 1" }).click()

  const shell = timeline.locator(".tool-collapsible").filter({ hasText: "Exit 1" })
  const badge = shell.locator('[data-component="tag"]')
  const errorCard = timeline.locator('[data-kind="tool-error-card"][data-tool="webfetch"]')
  const errorBadge = errorCard.locator('[data-component="tag"]')

  await expect(badge).toHaveText("Exit 1")
  await expect(errorBadge).toHaveText("Failed")

  const errorWithinTrigger = await errorCard.evaluate((card) => {
    const trigger = card.querySelector<HTMLElement>('[data-component="tool-trigger"]')!.getBoundingClientRect()
    const tag = card.querySelector<HTMLElement>('[data-component="tag"]')!.getBoundingClientRect()
    return tag.top >= trigger.top && tag.bottom <= trigger.bottom
  })
  expect(errorWithinTrigger).toBe(true)

  const metrics = await shell.evaluate((row) => {
    const trigger = row.querySelector<HTMLElement>('[data-component="tool-trigger"]')!
    const main = row.querySelector<HTMLElement>('[data-slot="basic-tool-tool-info-main"]')!
    const tag = row.querySelector<HTMLElement>('[data-component="tag"]')!
    const value = row.querySelector<HTMLElement>('[data-slot="shell-submessage-value"]')!
    const triggerBox = trigger.getBoundingClientRect()
    const mainBox = main.getBoundingClientRect()
    const tagBox = tag.getBoundingClientRect()
    const tagStyle = getComputedStyle(tag)
    const valueStyle = getComputedStyle(value)

    return {
      triggerContentVisibility: getComputedStyle(trigger).contentVisibility,
      mainAlignItems: getComputedStyle(main).alignItems,
      tagWhiteSpace: tagStyle.whiteSpace,
      tagFlexShrink: tagStyle.flexShrink,
      tagHeight: Math.round(tagBox.height),
      tagTopOffset: Math.abs(tagBox.top - mainBox.top),
      tagBottomOffset: Math.abs(tagBox.bottom - mainBox.bottom),
      tagWithinTrigger: tagBox.top >= triggerBox.top && tagBox.bottom <= triggerBox.bottom,
      valueOverflowX: valueStyle.overflowX,
      valueTextOverflow: valueStyle.textOverflow,
      valueTruncated: value.scrollWidth > value.clientWidth,
    }
  })

  expect(metrics).toEqual({
    triggerContentVisibility: "visible",
    mainAlignItems: "center",
    tagWhiteSpace: "nowrap",
    tagFlexShrink: "0",
    tagHeight: 16,
    tagTopOffset: 0,
    tagBottomOffset: 0,
    tagWithinTrigger: true,
    valueOverflowX: "hidden",
    valueTextOverflow: "ellipsis",
    valueTruncated: true,
  })
})

