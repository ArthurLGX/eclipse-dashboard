/**
 * @deprecated Utiliser POST /api/smart-follow-up/extract-lead-profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractLeadProfileUnified } from '@/utils/extract-lead-profile';
import { downloadAndCacheProfilePic } from '@/lib/walego-avatar-cache';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { htmlBody, leadId } = body;

    if (!htmlBody || typeof htmlBody !== 'string') {
      return NextResponse.json({ error: 'htmlBody (string) is required' }, { status: 400 });
    }

    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json({ error: 'leadId (string) is required' }, { status: 400 });
    }

    const profile = extractLeadProfileUnified(htmlBody, null, 'walego');

    let avatarPath: string | null = null;
    if (profile.profilePicUrl) {
      avatarPath = await downloadAndCacheProfilePic(profile.profilePicUrl, leadId);
    }

    return NextResponse.json({
      profilePicUrl: profile.profilePicUrl,
      name: profile.name,
      title: profile.title,
      linkedinUrl: profile.linkedinUrl,
      avatarPath,
    });
  } catch (error) {
    console.error('[extract-walego-profile] Error:', error);
    return NextResponse.json({ error: 'Failed to extract Walego profile' }, { status: 500 });
  }
}
