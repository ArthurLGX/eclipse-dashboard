/**
 * Cron tasks configuration for scheduled emails and newsletters
 * 
 * This file configures cron jobs that run periodically to:
 * 1. Send scheduled emails when their time has come
 * 2. Send scheduled newsletters when their time has come
 */

import { Strapi } from '@strapi/strapi';

export default {
  /**
   * Cron job to send scheduled emails
   * Runs every minute to check for emails that need to be sent
   */
  sendScheduledEmails: {
    task: async ({ strapi }: { strapi: Strapi }) => {
      try {
        const now = new Date();
        
        // Find all scheduled emails that are due
        const scheduledEmails = await strapi.entityService.findMany('api::sent-email.sent-email', {
          filters: {
            status_mail: 'scheduled',
            scheduled_at: {
              $lte: now.toISOString(),
            },
          },
          populate: ['users'],
        });

        if (!scheduledEmails || scheduledEmails.length === 0) {
          return;
        }

        console.log(`[CRON] Found ${scheduledEmails.length} scheduled emails to send`);

        for (const email of scheduledEmails) {
          try {
            // Get user's SMTP config
            const userId = email.users?.[0]?.id;
            if (!userId) {
              console.error(`[CRON] No user found for email ${email.id}`);
              await updateEmailStatus(strapi, email.id, 'failed', 'No user associated');
              continue;
            }

            const smtpConfig = await strapi.entityService.findMany('api::smtp-config.smtp-config', {
              filters: {
                users: {
                  id: userId,
                },
              },
              limit: 1,
            });

            if (!smtpConfig || smtpConfig.length === 0) {
              console.error(`[CRON] No SMTP config found for user ${userId}`);
              await updateEmailStatus(strapi, email.id, 'failed', 'SMTP not configured');
              continue;
            }

            const config = smtpConfig[0];
            
            // Decrypt password
            const { decrypt } = require('../src/utils/encryption');
            const decryptedPassword = decrypt(config.smtp_password);

            // Setup nodemailer
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
              host: config.smtp_host,
              port: config.smtp_port || 587,
              secure: config.smtp_port === 465,
              auth: {
                user: config.smtp_user,
                pass: decryptedPassword,
              },
            });

            // Parse recipients
            const recipients = typeof email.recipients === 'string' 
              ? JSON.parse(email.recipients) 
              : email.recipients;

            // Send email
            await transporter.sendMail({
              from: `"${config.sender_name || 'No Name'}" <${config.sender_email || config.smtp_user}>`,
              to: recipients.join(', '),
              subject: email.subject,
              html: email.content,
            });

            // Update status to sent
            await updateEmailStatus(strapi, email.id, 'sent');
            console.log(`[CRON] Successfully sent scheduled email ${email.id}`);

          } catch (error) {
            console.error(`[CRON] Failed to send email ${email.id}:`, error);
            await updateEmailStatus(strapi, email.id, 'failed', error.message);
          }
        }
      } catch (error) {
        console.error('[CRON] Error in sendScheduledEmails:', error);
      }
    },
    options: {
      rule: '* * * * *', // Every minute
    },
  },

  /**
   * Cron job to send scheduled newsletters
   * Runs every minute to check for newsletters that need to be sent
   */
  sendScheduledNewsletters: {
    task: async ({ strapi }: { strapi: Strapi }) => {
      try {
        const now = new Date();
        
        // Find all scheduled newsletters that are due
        const scheduledNewsletters = await strapi.entityService.findMany('api::newsletter.newsletter', {
          filters: {
            n_status: 'scheduled',
            send_at: {
              $lte: now.toISOString(),
            },
          },
          populate: ['author', 'subscribers'],
        });

        if (!scheduledNewsletters || scheduledNewsletters.length === 0) {
          return;
        }

        console.log(`[CRON] Found ${scheduledNewsletters.length} scheduled newsletters to send`);

        for (const newsletter of scheduledNewsletters) {
          try {
            const authorId = newsletter.author?.id;
            if (!authorId) {
              console.error(`[CRON] No author found for newsletter ${newsletter.id}`);
              await updateNewsletterStatus(strapi, newsletter.id, 'failed');
              continue;
            }

            // Get user's SMTP config
            const smtpConfig = await strapi.entityService.findMany('api::smtp-config.smtp-config', {
              filters: {
                users: {
                  id: authorId,
                },
              },
              limit: 1,
            });

            if (!smtpConfig || smtpConfig.length === 0) {
              console.error(`[CRON] No SMTP config found for user ${authorId}`);
              await updateNewsletterStatus(strapi, newsletter.id, 'failed');
              continue;
            }

            const config = smtpConfig[0];
            
            // Decrypt password
            const { decrypt } = require('../src/utils/encryption');
            const decryptedPassword = decrypt(config.smtp_password);

            // Setup nodemailer
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
              host: config.smtp_host,
              port: config.smtp_port || 587,
              secure: config.smtp_port === 465,
              auth: {
                user: config.smtp_user,
                pass: decryptedPassword,
              },
            });

            // Get subscriber emails
            const subscribers = newsletter.subscribers || [];
            if (subscribers.length === 0) {
              console.warn(`[CRON] No subscribers for newsletter ${newsletter.id}`);
              await updateNewsletterStatus(strapi, newsletter.id, 'sent'); // Mark as sent anyway
              continue;
            }

            // Get HTML content (stored during scheduling)
            const htmlContent = newsletter.html_content || newsletter.content;

            // Send to each subscriber
            let sentCount = 0;
            for (const subscriber of subscribers) {
              try {
                await transporter.sendMail({
                  from: `"${config.sender_name || 'Newsletter'}" <${config.sender_email || config.smtp_user}>`,
                  to: subscriber.email,
                  subject: newsletter.subject,
                  html: htmlContent,
                });
                sentCount++;
              } catch (error) {
                console.error(`[CRON] Failed to send to ${subscriber.email}:`, error);
              }
            }

            // Update status to sent
            await updateNewsletterStatus(strapi, newsletter.id, 'sent');
            console.log(`[CRON] Successfully sent newsletter ${newsletter.id} to ${sentCount}/${subscribers.length} subscribers`);

          } catch (error) {
            console.error(`[CRON] Failed to send newsletter ${newsletter.id}:`, error);
            await updateNewsletterStatus(strapi, newsletter.id, 'failed');
          }
        }
      } catch (error) {
        console.error('[CRON] Error in sendScheduledNewsletters:', error);
      }
    },
    options: {
      rule: '* * * * *', // Every minute
    },
  },
};

async function updateEmailStatus(strapi: Strapi, emailId: number, status: string, errorMessage?: string) {
  await strapi.entityService.update('api::sent-email.sent-email', emailId, {
    data: {
      status_mail: status,
      sent_at: status === 'sent' ? new Date().toISOString() : undefined,
      error_message: errorMessage,
    },
  });
}

async function updateNewsletterStatus(strapi: Strapi, newsletterId: number, status: string) {
  await strapi.entityService.update('api::newsletter.newsletter', newsletterId, {
    data: {
      n_status: status,
      send_at: status === 'sent' ? new Date().toISOString() : undefined,
    },
  });
}


