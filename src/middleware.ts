import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/app(.*)",
  "/pages(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/auth(.*)",
  "/api/health(.*)",
  "/api/test(.*)",
  "/api/extension(.*)",
  "/api/jobs/search",
  "/api/applications",
]);

const isProfileSetupRoute = createRouteMatcher([
  "/auth/profile-setup",
]);

const isApiRoute = createRouteMatcher([
  "/api(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Always protect API routes first
  if (isApiRoute(req)) {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
    return;
  }
  
  // Protect non-public routes
  if (isProtectedRoute(req) && !isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}; 