import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { isAdminRole, isSuperAdminRole } from '@/lib/roles'

const isProtectedRoute = createRouteMatcher(['/portal(.*)'])
const isAdminRoute = createRouteMatcher(["/portal/user-management(.*)", "/portal/barangay-settings(.*)"]);
const isSuperAdminRoute = createRouteMatcher(["/portal/audit-logs(.*)"]);
const isResidentOnlyRoute = createRouteMatcher(["/portal/notifications(.*)"]);
// Pages with a /portal counterpart. This includes the post pages share links point to
// (/news/[id], /transparency/[id]), so a signed-in user opening one stays in the portal.
const isPublicOnlyRoute = createRouteMatcher(['/', '/news', '/news/:id', '/about-us', '/transparency', '/transparency/:id'])

export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims, userId } = await auth();
  const isAdmin = isAdminRole(sessionClaims?.metadata?.role);

  if (isAdminRoute(req) && !isAdmin) {
    const url = new URL("/", req.url);
    return NextResponse.redirect(url);
  }

  if (isSuperAdminRoute(req) && !isSuperAdminRole(sessionClaims?.metadata?.role)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isResidentOnlyRoute(req) && isAdmin) {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  if (userId && isPublicOnlyRoute(req)) {
    const { pathname } = req.nextUrl
    return NextResponse.redirect(new URL(pathname === '/' ? '/portal' : `/portal${pathname}`, req.url))
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Always run for Clerk-specific frontend API routes
    '/__clerk/(.*)',
  ],
}