'use client';

import React from 'react';
import Link from 'next/link';
import LegalPageLayout from '@/app/components/LegalPageLayout';
import { useLanguage } from '@/app/context/LanguageContext';

export default function CookiesPage() {
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const content = isFr ? (
    <>
      <p className="text-sm mb-6">Dernière mise à jour : janvier 2025</p>

      <h2>1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
      <p>
        Un cookie est un petit fichier texte déposé sur votre appareil lorsque vous visitez un site. Il permet de mémoriser vos préférences, de sécuriser votre session ou d&apos;analyser l&apos;usage du site.
      </p>

      <h2>2. Cookies utilisés</h2>
      <p>Nous utilisons les types de cookies suivants :</p>
      <ul>
        <li><strong>Cookies essentiels :</strong> nécessaires au fonctionnement (session, authentification, préférences de langue/theme). Ils ne peuvent pas être désactivés.</li>
        <li><strong>Cookies analytiques :</strong> nous permettent de mesurer l&apos;audience (ex. Fathom) de manière respectueuse de la vie privée, sans suivi publicitaire.</li>
        <li><strong>Cookies tiers :</strong> certains services (Stripe, Google, Meta) peuvent déposer leurs propres cookies selon votre utilisation.</li>
      </ul>

      <h2>3. Durée de conservation</h2>
      <p>Les cookies de session sont supprimés à la fermeture du navigateur. Les cookies persistants (préférences) sont conservés jusqu&apos;à 12 mois ou jusqu&apos;à ce que vous les supprimiez.</p>

      <h2>4. Gestion des cookies</h2>
      <p>Vous pouvez :</p>
      <ul>
        <li>Configurer votre navigateur pour refuser les cookies (certaines fonctionnalités pourraient ne plus fonctionner)</li>
        <li>Utiliser le mode navigation privée pour limiter le dépôt de cookies</li>
        <li>Nous contacter à <a href="mailto:privacy@eclipsestudiodev.fr" className="underline">privacy@eclipsestudiodev.fr</a> pour toute question</li>
      </ul>

      <h2>5. Données stockées localement</h2>
      <p>En plus des cookies, nous utilisons le <strong>localStorage</strong> pour stocker : token d&apos;authentification, préférences (thème, langue, sidebar). Ces données restent sur votre appareil et peuvent être effacées via les paramètres du navigateur.</p>

      <h2>6. Vos droits</h2>
      <p>Conformément au RGPD, vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données. Voir notre <Link href="/privacy" className="underline">Politique de confidentialité</Link> et la page <Link href="/delete-account" className="underline">Supprimer mon compte</Link>.</p>
    </>
  ) : (
    <>
      <p className="text-sm mb-6">Last updated: January 2025</p>

      <h2>1. What is a Cookie?</h2>
      <p>
        A cookie is a small text file placed on your device when you visit a website. It helps remember your preferences, secure your session, or analyze site usage.
      </p>

      <h2>2. Cookies We Use</h2>
      <p>We use the following types of cookies:</p>
      <ul>
        <li><strong>Essential cookies:</strong> required for operation (session, authentication, language/theme preferences). They cannot be disabled.</li>
        <li><strong>Analytics cookies:</strong> allow us to measure audience (e.g. Fathom) in a privacy-respecting way, without advertising tracking.</li>
        <li><strong>Third-party cookies:</strong> some services (Stripe, Google, Meta) may place their own cookies depending on your usage.</li>
      </ul>

      <h2>3. Retention Period</h2>
      <p>Session cookies are deleted when you close the browser. Persistent cookies (preferences) are kept for up to 12 months or until you delete them.</p>

      <h2>4. Managing Cookies</h2>
      <p>You can:</p>
      <ul>
        <li>Configure your browser to refuse cookies (some features may no longer work)</li>
        <li>Use private browsing mode to limit cookie placement</li>
        <li>Contact us at <a href="mailto:privacy@eclipsestudiodev.fr" className="underline">privacy@eclipsestudiodev.fr</a> for any questions</li>
      </ul>

      <h2>5. Locally Stored Data</h2>
      <p>In addition to cookies, we use <strong>localStorage</strong> to store: authentication token, preferences (theme, language, sidebar). This data stays on your device and can be cleared via browser settings.</p>

      <h2>6. Your Rights</h2>
      <p>Under GDPR, you can request access, rectification, or deletion of your data. See our <Link href="/privacy" className="underline">Privacy Policy</Link> and the <Link href="/delete-account" className="underline">Delete my account</Link> page.</p>
    </>
  );

  return (
    <LegalPageLayout title="Cookies et gestion des données" titleEn="Cookies & Data Management">
      {content}
    </LegalPageLayout>
  );
}
