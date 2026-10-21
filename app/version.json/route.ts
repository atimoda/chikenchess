import { RELEASE_LABEL } from '@/lib/release'

/* global Response */

export const dynamic = 'force-static'

export function GET() {
  return Response.json(
    { version: RELEASE_LABEL },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  )
}
