/**
 * Extraction profil lead (HTML Walego/Folk ou texte générique).
 * POST { htmlBody?, contentText?, leadId, source? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractLeadProfileUnified } from '@/utils/extract-lead-profile';
import { downloadAndCacheProfilePic } from '@/lib/walego-avatar-cache';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { htmlBody, contentText, leadId, source } = body as {
      htmlBody?: string;
      contentText?: string;
      leadId?: string;
      source?: string;
    };

    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json({ error: 'leadId (string) is required' }, { status: 400 });
    }

    const profile = extractLeadProfileUnified(
      typeof htmlBody === 'string' ? htmlBody : null,
      typeof contentText === 'string' ? contentText : null,
      source
    );

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
    console.error('[extract-lead-profile] Error:', error);
    return NextResponse.json({ error: 'Failed to extract lead profile' }, { status: 500 });
  }
}
