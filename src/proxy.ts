import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/home(.*)', '/document-request(.*)', '/complaint(.*)', '/transparency(.*)', '/security(.*)'])
const isAdminRoute = createRouteMatcher(["/user-management(.*)"]);
const isPublicOnlyRoute = createRouteMatcher(['/'])

export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims } = await auth();
  const isAdmin = sessionClaims?.metadata?.role === "admin";

  if (isAdminRoute(req) && !isAdmin) {
    const url = new URL("/", req.url);
    return NextResponse.redirect(url);
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
  
  const { userId } = await auth()
  if (userId && isPublicOnlyRoute(req)) {
    return NextResponse.redirect(new URL('/home', req.url))
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