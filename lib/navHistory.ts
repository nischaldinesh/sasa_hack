// Counts client side navigations in this tab, so back buttons can tell whether
// there is an in-app page to go back to. Updated by AppNav on every path change.
let navigations = -1; // the first path seen is the landing page, not a navigation

export function recordNavigation() {
  navigations += 1;
}

export function hasInAppHistory(): boolean {
  return navigations > 0;
}
