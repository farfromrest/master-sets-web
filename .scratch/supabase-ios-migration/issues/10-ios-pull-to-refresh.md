Status: completed

# Pull-to-refresh for dual-session stale data

## Context

The app is online-only with no real-time sync. When a user makes changes on the web app and then opens the iOS app (or vice versa), the iOS data will be stale until the next sign-in. Pull-to-refresh gives a manual escape hatch.

## Decisions

- **What refreshes**: `userDataService` only — catalogue data is admin-managed and rare enough that kill+relaunch is acceptable
- **Which views**: `DashboardView` and `SetBinderView`
- **Mark mode**: block pull-to-refresh while mark mode is active — no silent discard of pending changes
- **API**: add `userDataService.refresh()` that reuses the stored `userId`, so views don't need access to `AuthService`

## Checklist

- [ ] Add `refresh()` to `UserDataService` — re-fetches tracked sets and owned slots using stored `userId`
- [ ] Add `.refreshable` to `DashboardView` list calling `await userDataService.refresh()`
- [ ] Add `.refreshable` to `SetBinderView` list, disabled (or omitted) while mark mode is active
- [ ] Verify: make a change on web, pull-to-refresh on iOS, change appears

## Definition of Done

- Dashboard reflects web changes after a pull-to-refresh without restarting the app
- Binder reflects web changes after a pull-to-refresh
- Pulling while mark mode is active does nothing
