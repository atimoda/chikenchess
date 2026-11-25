// The deploy this page was built in: the commit on Vercel, or the build's time elsewhere (next.config.mjs puts it in
// NEXT_PUBLIC_BUILD_ID). /version.json publishes the same one, so a new deploy is noticed even when the version
// number stays the same (all the changes of a day share one version). Empty where it was not set (tests).
export const BUILD_ID: string = process.env.NEXT_PUBLIC_BUILD_ID || ''
