import { RELEASE_LABEL } from '@/lib/release'
import { BUILD_ID } from '@/lib/build-id'

/* global Response */

export const dynamic = 'force-static'

export function GET() {
  return Response.json(
    { version: RELEASE_LABEL, build: BUILD_ID },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  )
}
