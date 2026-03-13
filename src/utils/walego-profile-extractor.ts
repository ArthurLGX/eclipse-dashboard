/**
 * Extracteur de profil depuis les mails HTML Walego
 * Extrait photo LinkedIn, nom, titre et lien du bloc header du lead
 */

import { load } from 'cheerio';

export interface WalegoLeadProfile {
  profilePicUrl: string | null;
  name: string | null;
  title: string | null;
  linkedinUrl: string | null;
}

/**
 * Extrait le profil lead depuis le corps HTML d'un mail Walego.
 * Structure typique : bloc avec img (alt="Profile Picture"), h2 (nom), p (titre), a "LinkedIn Profile"
 */
export function extractLeadProfile(htmlBody: string): WalegoLeadProfile {
  const result: WalegoLeadProfile = {
    profilePicUrl: null,
    name: null,
    title: null,
    linkedinUrl: null,
  };

  if (!htmlBody?.trim()) return result;

  try {
    const $ = load(htmlBody);

    // Photo : <img alt="Profile Picture" src="...">
    const profileImg = $('img[alt="Profile Picture"]').first();
    const src = profileImg.attr('src');
    if (src?.trim()) {
      result.profilePicUrl = src.trim();
    }

    // Nom : <h2> dans le même bloc parent
    const h2 = $('h2').first();
    const nameText = h2.text()?.trim();
    if (nameText) {
      result.name = nameText;
    }

    // Titre : premier <p> après le <h2> (ou dans le même div parent)
    const parentDiv = h2.parent();
    const paragraphs = parentDiv.find('p');
    // Premier p peut être le titre (après h2 dans la structure)
    const titleP = paragraphs.first();
    const titleText = titleP.text()?.trim();
    // Exclure si c'est le lien LinkedIn ("LinkedIn Profile")
    if (titleText && !titleText.toLowerCase().includes('linkedin')) {
      result.title = titleText;
    }
    // Sinon prendre le premier p qui n'est pas le lien
    if (!result.title && paragraphs.length > 1) {
      const secondP = paragraphs.eq(1);
      const secondText = secondP.text()?.trim();
      if (secondText && !secondText.toLowerCase().includes('linkedin')) {
        result.title = secondText;
      }
    }

    // LinkedIn : <a> avec texte "LinkedIn Profile"
    const linkedinLink = $('a').filter(function () {
      return $(this).text().trim().toLowerCase() === 'linkedin profile';
    }).first();
    const href = linkedinLink.attr('href');
    if (href?.trim()) {
      result.linkedinUrl = href.trim();
    }
  } catch (error) {
    console.error('[walego-profile-extractor] Error parsing HTML:', error);
  }

  return result;
}
