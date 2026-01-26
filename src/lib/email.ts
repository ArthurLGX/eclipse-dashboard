import nodemailer from 'nodemailer';

// Types
export interface SmtpConfigOptions {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_secure: boolean;
  smtp_from_name?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html: string;
}

export interface SendNewsletterOptions {
  recipients: string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  senderName?: string;
  smtpConfig?: SmtpConfigOptions; // Configuration SMTP personnalisée
}

export interface EmailResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

// Créer le transporteur SMTP avec configuration personnalisée ou par défaut
const createTransporter = (customConfig?: SmtpConfigOptions) => {
  // Si une configuration personnalisée est fournie, l'utiliser
  if (customConfig) {
    return nodemailer.createTransport({
      host: customConfig.smtp_host,
      port: customConfig.smtp_port,
      secure: customConfig.smtp_secure,
      auth: {
        user: customConfig.smtp_user,
        pass: customConfig.smtp_password,
      },
    });
  }

  // Sinon, utiliser la configuration par défaut (env vars)
  const service = process.env.SMTP_SERVICE;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    throw new Error('SMTP credentials not configured');
  }

  // Si un service est défini (gmail, outlook, etc.), l'utiliser
  if (service) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
  }

  // Sinon, utiliser la configuration host/port
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

// Envoyer un email simple
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions = {
      from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Envoyer une newsletter à plusieurs destinataires
export const sendNewsletter = async (options: SendNewsletterOptions): Promise<EmailResult> => {
  const { recipients, subject, htmlContent, textContent, smtpConfig } = options;
  
  const result: EmailResult = {
    success: false,
    sent: 0,
    failed: 0,
    errors: [],
  };

  if (!recipients || recipients.length === 0) {
    result.errors.push('No recipients provided');
    return result;
  }

  // Utiliser la config personnalisée ou la config par défaut
  const transporter = createTransporter(smtpConfig);
  
  // Construire l'adresse "From" avec le nom d'expéditeur si disponible
  let from: string;
  if (smtpConfig) {
    const fromName = smtpConfig.smtp_from_name || smtpConfig.smtp_user.split('@')[0];
    from = `"${fromName}" <${smtpConfig.smtp_user}>`;
  } else {
    from = process.env.SMTP_FROM || process.env.SMTP_USER || '';
  }
  
  // Envoyer par batch de 5 emails avec délai entre chaque batch
  const batchSize = 5;
  const delayBetweenBatches = 2500; // 2.5 secondes

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (email) => {
      try {
        const mailOptions = {
          from,
          to: email,
          subject,
          text: textContent,
          html: htmlContent,
        };

        await transporter.sendMail(mailOptions);
        result.sent++;
       
        return true;
      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Masquer partiellement l'email dans les logs
        const maskedEmail = `${email.substring(0, 3)}***@${email.split('@')[1] || 'unknown'}`;
        result.errors.push(`Failed to send to ${maskedEmail}: ${errorMessage}`);
        if (process.env.NODE_ENV === 'development') {
          console.error(`Failed to send email to ${maskedEmail}:`, errorMessage);
        }
        return false;
      }
    });

    await Promise.all(batchPromises);

    // Attendre entre les batches (sauf pour le dernier)
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  // Envoyer une copie à l'admin
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    try {
      await transporter.sendMail({
        from,
        to: adminEmail,
        subject: `${subject}`,
        text: textContent,
        html: htmlContent,
      });
    } catch (error) {
      // Ne pas exposer les détails en production
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send admin copy:', error);
      }
    }
  }

  result.success = result.failed === 0;
  return result;
};

// Vérifier si un utilisateur est admin
export const isUserAdmin = (userEmail: string): boolean => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('ADMIN_EMAIL not configured in environment');
    return false;
  }
  return userEmail.toLowerCase() === adminEmail.toLowerCase();
};

// Vérifier la configuration SMTP
export const checkSmtpConfig = (): { configured: boolean; missing: string[] } => {
  const required = ['SMTP_USER', 'SMTP_PASSWORD'];
  // Optional: 'SMTP_SERVICE', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_FROM', 'ADMIN_EMAIL'
  
  const missing: string[] = [];
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Soit SMTP_SERVICE, soit SMTP_HOST doit être défini
  if (!process.env.SMTP_SERVICE && !process.env.SMTP_HOST) {
    missing.push('SMTP_SERVICE or SMTP_HOST');
  }

  return {
    configured: missing.length === 0,
    missing,
  };
};

