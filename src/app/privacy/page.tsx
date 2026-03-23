'use client';

import React from 'react';
import Link from 'next/link';
import LegalPageLayout from '@/app/components/LegalPageLayout';
import { useLanguage } from '@/app/context/LanguageContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.eclipsestudiodev.fr';

export default function PrivacyPage() {
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const content = isFr ? (
    <>
      <p className="text-sm mb-6">Dernière mise à jour : janvier 2025</p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Eclipse Studio (&quot;nous&quot;, &quot;notre&quot;) exploite le service Eclipse Dashboard accessible à {APP_URL}.
        Nous sommes responsables du traitement de vos données personnelles.
      </p>

      <h2>2. Données collectées</h2>
      <p>Nous collectons les données suivantes lorsque vous utilisez notre service :</p>
      <ul>
        <li><strong>Données de compte :</strong> email, nom d&apos;utilisateur, mot de passe (hashé), photo de profil (si connexion Google)</li>
        <li><strong>Données professionnelles :</strong> projets, clients, contacts, factures, devis, tâches</li>
        <li><strong>Données techniques :</strong> adresse IP, type de navigateur, logs d&apos;accès</li>
        <li><strong>Données de facturation :</strong> informations de paiement via Stripe (nous ne stockons pas les numéros de carte)</li>
      </ul>

      <h2>3. Finalités du traitement</h2>
      <p>Vos données sont utilisées pour :</p>
      <ul>
        <li>Fournir et faire fonctionner le dashboard</li>
        <li>Gérer votre compte et l&apos;authentification</li>
        <li>Traiter les paiements et abonnements</li>
        <li>Envoyer des notifications (emails, WhatsApp si configuré)</li>
        <li>Améliorer nos services et supporter les utilisateurs</li>
      </ul>

      <h2>4. Base légale</h2>
      <p>Le traitement repose sur : l&apos;exécution du contrat, notre intérêt légitime, et votre consentement lorsque requis (cookies, newsletters).</p>

      <h2>5. Destinataires et sous-traitants</h2>
      <p>Nous partageons des données avec :</p>
      <ul>
        <li><strong>Strapi / hébergeur :</strong> base de données et API</li>
        <li><strong>Stripe :</strong> paiements</li>
        <li><strong>Google :</strong> authentification OAuth, calendrier</li>
        <li><strong>Meta (Facebook/WhatsApp/Instagram) :</strong> intégrations si activées par l&apos;utilisateur</li>
        <li><strong>Fathom, services d&apos;analytics :</strong> mesure d&apos;audience (anonymisée)</li>
      </ul>

      <h2>6. Conservation</h2>
      <p>Vos données sont conservées tant que votre compte est actif. Après suppression de compte, les données sont effacées sous 30 jours, sauf obligations légales.</p>

      <h2>7. Vos droits</h2>
      <p>Vous disposez des droits suivants : accès, rectification, effacement, limitation, portabilité, opposition. Contact : <a href="mailto:privacy@eclipsestudiodev.fr" className="underline">privacy@eclipsestudiodev.fr</a></p>
      <p>Pour supprimer votre compte et vos données : <Link href="/delete-account" className="underline font-medium">Demande de suppression de compte</Link></p>
      <p>Réclamation possible auprès de la CNIL (France) ou de l&apos;autorité compétente de votre pays.</p>

      <h2>8. Sécurité</h2>
      <p>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données (chiffrement, accès restreint).</p>
    </>
  ) : (
    <>
      <p className="text-sm mb-6">Last updated: January 2025</p>

      <h2>1. Data Controller</h2>
      <p>
        Eclipse Studio (&quot;we&quot;, &quot;our&quot;) operates the Eclipse Dashboard service available at {APP_URL}.
        We are responsible for processing your personal data.
      </p>

      <h2>2. Data Collected</h2>
      <p>We collect the following data when you use our service:</p>
      <ul>
        <li><strong>Account data:</strong> email, username, password (hashed), profile picture (if Google login)</li>
        <li><strong>Business data:</strong> projects, clients, contacts, invoices, quotes, tasks</li>
        <li><strong>Technical data:</strong> IP address, browser type, access logs</li>
        <li><strong>Billing data:</strong> payment information via Stripe (we do not store card numbers)</li>
      </ul>

      <h2>3. Purposes of Processing</h2>
      <p>Your data is used to:</p>
      <ul>
        <li>Provide and operate the dashboard</li>
        <li>Manage your account and authentication</li>
        <li>Process payments and subscriptions</li>
        <li>Send notifications (emails, WhatsApp if configured)</li>
        <li>Improve our services and user support</li>
      </ul>

      <h2>4. Legal Basis</h2>
      <p>Processing is based on: contract performance, our legitimate interest, and your consent when required (cookies, newsletters).</p>

      <h2>5. Recipients and Sub-processors</h2>
      <p>We share data with:</p>
      <ul>
        <li><strong>Strapi / hosting:</strong> database and API</li>
        <li><strong>Stripe:</strong> payments</li>
        <li><strong>Google:</strong> OAuth authentication, calendar</li>
        <li><strong>Meta (Facebook/WhatsApp/Instagram):</strong> integrations when enabled by the user</li>
        <li><strong>Fathom, analytics services:</strong> audience measurement (anonymized)</li>
      </ul>

      <h2>6. Retention</h2>
      <p>Your data is retained while your account is active. After account deletion, data is erased within 30 days, except where required by law.</p>

      <h2>7. Your Rights</h2>
      <p>You have the right to: access, rectification, erasure, restriction, portability, objection. Contact: <a href="mailto:privacy@eclipsestudiodev.fr" className="underline">privacy@eclipsestudiodev.fr</a></p>
      <p>To delete your account and data: <Link href="/delete-account" className="underline font-medium">Account deletion request</Link></p>
      <p>You may lodge a complaint with your local data protection authority.</p>

      <h2>8. Security</h2>
      <p>We implement appropriate technical and organizational measures to protect your data (encryption, restricted access).</p>
    </>
  );

  return (
    <LegalPageLayout title="Politique de confidentialité" titleEn="Privacy Policy">
      {content}
    </LegalPageLayout>
  );
}
