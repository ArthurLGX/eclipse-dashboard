'use client';

import React from 'react';
import LegalPageLayout from '@/app/components/LegalPageLayout';
import { useLanguage } from '@/app/context/LanguageContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.eclipsestudiodev.fr';

export default function TermsPage() {
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const content = isFr ? (
    <>
      <p className="text-sm mb-6">Dernière mise à jour : janvier 2025</p>

      <h2>1. Objet</h2>
      <p>
        Les présentes Conditions générales d&apos;utilisation (&quot;CGU&quot;) régissent l&apos;accès et l&apos;utilisation du service Eclipse Dashboard ({APP_URL}) proposé par Eclipse Studio.
      </p>

      <h2>2. Acceptation</h2>
      <p>En créant un compte ou en utilisant le service, vous acceptez ces conditions. Si vous n&apos;acceptez pas, n&apos;utilisez pas le service.</p>

      <h2>3. Description du service</h2>
      <p>Eclipse Dashboard est une plateforme SaaS permettant la gestion de projets, clients, factures, pipeline commercial, suivis IA et intégrations (calendrier, email, WhatsApp, etc.).</p>

      <h2>4. Inscription et compte</h2>
      <p>Vous devez fournir des informations exactes. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité sur votre compte.</p>

      <h2>5. Utilisation acceptable</h2>
      <p>Vous vous engagez à ne pas : utiliser le service à des fins illégales, transmettre des contenus nuisibles, tenter d&apos;accéder aux systèmes sans autorisation, ou nuire au fonctionnement du service.</p>

      <h2>6. Propriété intellectuelle</h2>
      <p>Le service, son code, sa marque et son design sont protégés. Vous conservez la propriété des données que vous saisissez. Vous nous accordez une licence d&apos;utilisation pour fournir le service.</p>

      <h2>7. Abonnement et facturation</h2>
      <p>Les offres payantes sont facturées selon les tarifs affichés. L&apos;essai gratuit peut être résilié à tout moment. Les abonnements sont renouvelables sauf résiliation.</p>

      <h2>8. Résiliation</h2>
      <p>Vous pouvez fermer votre compte à tout moment. Nous pouvons suspendre ou résilier l&apos;accès en cas de violation des CGU.</p>

      <h2>9. Limitation de responsabilité</h2>
      <p>Le service est fourni &quot;en l&apos;état&quot;. Nous ne sommes pas responsables des pertes indirectes, perte de données ou dommages consécutifs.</p>

      <h2>10. Modifications</h2>
      <p>Nous pouvons modifier ces CGU. Les utilisateurs seront notifiés des changements substantiels. La poursuite de l&apos;utilisation vaut acceptation.</p>

      <h2>11. Droit applicable</h2>
      <p>Le droit français est applicable. Les tribunaux français sont compétents en cas de litige.</p>

      <h2>12. Contact</h2>
      <p>Pour toute question : <a href="mailto:legal@eclipsestudiodev.fr" className="underline">legal@eclipsestudiodev.fr</a></p>
    </>
  ) : (
    <>
      <p className="text-sm mb-6">Last updated: January 2025</p>

      <h2>1. Purpose</h2>
      <p>
        These Terms of Service (&quot;ToS&quot;) govern access to and use of the Eclipse Dashboard service ({APP_URL}) offered by Eclipse Studio.
      </p>

      <h2>2. Acceptance</h2>
      <p>By creating an account or using the service, you accept these terms. If you do not accept them, do not use the service.</p>

      <h2>3. Service Description</h2>
      <p>Eclipse Dashboard is a SaaS platform for managing projects, clients, invoices, sales pipeline, AI follow-ups, and integrations (calendar, email, WhatsApp, etc.).</p>

      <h2>4. Registration and Account</h2>
      <p>You must provide accurate information. You are responsible for the confidentiality of your credentials and any activity on your account.</p>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to: use the service for illegal purposes, transmit harmful content, attempt unauthorized access to systems, or impair the service.</p>

      <h2>6. Intellectual Property</h2>
      <p>The service, its code, brand, and design are protected. You retain ownership of the data you enter. You grant us a license to use it to provide the service.</p>

      <h2>7. Subscription and Billing</h2>
      <p>Paid plans are billed according to displayed prices. The free trial may be cancelled at any time. Subscriptions renew unless cancelled.</p>

      <h2>8. Termination</h2>
      <p>You may close your account at any time. We may suspend or terminate access in case of ToS violation.</p>

      <h2>9. Limitation of Liability</h2>
      <p>The service is provided &quot;as is&quot;. We are not liable for indirect losses, data loss, or consequential damages.</p>

      <h2>10. Modifications</h2>
      <p>We may modify these ToS. Users will be notified of substantial changes. Continued use constitutes acceptance.</p>

      <h2>11. Governing Law</h2>
      <p>French law applies. French courts have jurisdiction in case of dispute.</p>

      <h2>12. Contact</h2>
      <p>For any questions: <a href="mailto:legal@eclipsestudiodev.fr" className="underline">legal@eclipsestudiodev.fr</a></p>
    </>
  );

  return (
    <LegalPageLayout title="Conditions générales d'utilisation" titleEn="Terms of Service">
      {content}
    </LegalPageLayout>
  );
}
