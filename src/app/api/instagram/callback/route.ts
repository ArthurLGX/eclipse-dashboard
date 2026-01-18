import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const errorReason = searchParams.get('error_reason');

  // Base URL for redirect
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Handle error from Facebook
  if (error) {
    console.error('Instagram OAuth error:', { error, errorDescription, errorReason });
    const errorMsg = errorDescription || errorReason || error;
    return NextResponse.redirect(
      `${baseUrl}/dashboard/instagram?error=${encodeURIComponent(errorMsg)}`
    );
  }

  // No code received
  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/instagram?error=${encodeURIComponent('No authorization code received')}`
    );
  }

  // Build redirect URL with code and state
  const redirectUrl = new URL(`${baseUrl}/dashboard/instagram`);
  redirectUrl.searchParams.set('code', code);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  // Redirect to Instagram page with the code and state
  // The page will handle sending the code to Strapi
  return NextResponse.redirect(redirectUrl.toString());
}

