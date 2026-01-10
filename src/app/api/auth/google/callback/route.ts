import { NextRequest, NextResponse } from 'next/server';

/**
 * Callback route for Google OAuth authentication via Strapi
 * This route handles the redirect from Strapi after Google authentication
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accessToken = searchParams.get('access_token');
  const error = searchParams.get('error');

  // Base URL for redirects
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Handle errors
  if (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(error)}`
    );
  }

  // If no token, redirect to login with error
  if (!accessToken) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('No access token received')}`
    );
  }

  try {
    // Fetch user info from Strapi using the access token
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
    const userResponse = await fetch(`${strapiUrl}/api/users/me?populate=*`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data');
    }

    const user = await userResponse.json();

    // Create the redirect URL with auth data
    // We pass the data via URL and let the client handle storage
    const redirectUrl = new URL(`${baseUrl}/auth/callback`);
    redirectUrl.searchParams.set('token', accessToken);
    redirectUrl.searchParams.set('user', JSON.stringify({
      id: user.id,
      username: user.username,
      email: user.email,
      provider: user.provider,
      confirmed: user.confirmed,
      blocked: user.blocked,
      profile_picture: user.profile_picture,
    }));

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Error processing Google callback:', error);
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('Authentication failed')}`
    );
  }
}

