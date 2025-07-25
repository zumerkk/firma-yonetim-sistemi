// 🔔 NOTIFICATION SERVICE - EMAIL/SMS INTEGRATION
// Enterprise notification system with multiple providers

const nodemailer = require('nodemailer');
const twilio = require('twilio');
const Activity = require('../models/Activity');
const User = require('../models/User');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.initializeProviders();
  }

  // 🚀 Initialize notification providers
  async initializeProviders() {
    try {
      // Email (SMTP) Configuration
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        this.emailTransporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        // Verify SMTP connection
        await this.emailTransporter.verify();
        console.log('✅ Email service initialized successfully');
      }

      // SMS (Twilio) Configuration
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        console.log('✅ SMS service initialized successfully');
      }
    } catch (error) {
      console.error('❌ Notification service initialization error:', error);
    }
  }

  // 📧 Send Email
  async sendEmail({
    to,
    subject,
    html,
    text,
    attachments = [],
    priority = 'normal'
  }) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Cahit Sistem'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        text,
        attachments,
        priority: priority === 'high' ? 'high' : 'normal'
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      
      // Log activity
      await this.logNotificationActivity({
        type: 'email',
        recipients: Array.isArray(to) ? to : [to],
        subject,
        status: 'sent',
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId,
        recipients: Array.isArray(to) ? to.length : 1
      };
    } catch (error) {
      console.error('Email send error:', error);
      
      // Log failed activity
      await this.logNotificationActivity({
        type: 'email',
        recipients: Array.isArray(to) ? to : [to],
        subject,
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }

  // 📱 Send SMS
  async sendSMS({ to, message, priority = 'normal' }) {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured');
    }

    try {
      const phoneNumbers = Array.isArray(to) ? to : [to];
      const results = [];

      for (const phoneNumber of phoneNumbers) {
        const result = await this.twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });

        results.push({
          to: phoneNumber,
          sid: result.sid,
          status: result.status
        });
      }

      // Log activity
      await this.logNotificationActivity({
        type: 'sms',
        recipients: phoneNumbers,
        message: message.substring(0, 100),
        status: 'sent',
        count: results.length
      });

      return {
        success: true,
        results,
        recipients: phoneNumbers.length
      };
    } catch (error) {
      console.error('SMS send error:', error);
      
      // Log failed activity
      await this.logNotificationActivity({
        type: 'sms',
        recipients: Array.isArray(to) ? to : [to],
        message: message.substring(0, 100),
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }

  // 🎯 Send Bulk Notification
  async sendBulkNotification({
    type,
    recipients,
    subject,
    message,
    template,
    priority = 'normal',
    scheduled = false,
    scheduleDate = null
  }) {
    try {
      let recipientList = [];

      // Resolve recipients (can be user IDs, groups, or direct contacts)
      for (const recipient of recipients) {
        if (typeof recipient === 'number') {
          // Group ID
          const groupUsers = await this.getGroupUsers(recipient);
          recipientList.push(...groupUsers);
        } else if (typeof recipient === 'string') {
          // Direct email/phone or user ID
          if (recipient.includes('@')) {
            recipientList.push({ email: recipient, type: 'email' });
          } else if (recipient.startsWith('+')) {
            recipientList.push({ phone: recipient, type: 'sms' });
          } else {
            // User ID
            const user = await User.findById(recipient);
            if (user) {
              recipientList.push({
                email: user.email,
                phone: user.telefon,
                name: user.ad + ' ' + user.soyad,
                type: 'user'
              });
            }
          }
        }
      }

      // Remove duplicates
      recipientList = recipientList.filter((item, index, self) => 
        index === self.findIndex(t => t.email === item.email)
      );

      const results = {
        email: { sent: 0, failed: 0 },
        sms: { sent: 0, failed: 0 },
        total: recipientList.length
      };

      // Process notifications
      for (const recipient of recipientList) {
        try {
          if (type === 'email' && recipient.email) {
            const emailContent = this.processTemplate(template || message, recipient);
            await this.sendEmail({
              to: recipient.email,
              subject,
              html: emailContent,
              priority
            });
            results.email.sent++;
          } else if (type === 'sms' && recipient.phone) {
            const smsContent = this.processTemplate(template || message, recipient);
            await this.sendSMS({
              to: recipient.phone,
              message: smsContent,
              priority
            });
            results.sms.sent++;
          }
        } catch (error) {
          console.error(`Failed to send ${type} to ${recipient.email || recipient.phone}:`, error);
          if (type === 'email') results.email.failed++;
          else results.sms.failed++;
        }
      }

      return {
        success: true,
        results,
        message: `Bildirim gönderildi: ${results.email.sent + results.sms.sent} başarılı, ${results.email.failed + results.sms.failed} başarısız`
      };
    } catch (error) {
      console.error('Bulk notification error:', error);
      throw error;
    }
  }

  // 👥 Get group users
  async getGroupUsers(groupId) {
    const groups = {
      1: { name: 'Tüm Kullanıcılar', filter: {} },
      2: { name: 'Admin Kullanıcılar', filter: { rol: 'admin' } },
      3: { name: 'Firma Yöneticileri', filter: { rol: { $in: ['admin', 'kullanici'] } } }
    };

    const group = groups[groupId];
    if (!group) return [];

    const users = await User.find({
      ...group.filter,
      aktif: true,
      email: { $exists: true, $ne: '' }
    }).select('ad soyad email telefon');

    return users.map(user => ({
      email: user.email,
      phone: user.telefon,
      name: user.ad + ' ' + user.soyad,
      type: 'user'
    }));
  }

  // 🎨 Process template variables
  processTemplate(template, data) {
    let processed = template;
    
    // Replace common variables
    const variables = {
      '{name}': data.name || 'Kullanıcı',
      '{email}': data.email || '',
      '{date}': new Date().toLocaleDateString('tr-TR'),
      '{time}': new Date().toLocaleTimeString('tr-TR'),
      '{appName}': process.env.APP_NAME || 'Cahit Sistem'
    };

    Object.entries(variables).forEach(([key, value]) => {
      processed = processed.replace(new RegExp(key, 'g'), value);
    });

    return processed;
  }

  // 📊 Log notification activity
  async logNotificationActivity(data) {
    try {
      await Activity.create({
        tip: 'bildirim',
        aciklama: `${data.type.toUpperCase()} bildirimi: ${data.subject || data.message?.substring(0, 50)}`,
        detaylar: {
          type: data.type,
          recipients: data.recipients,
          status: data.status,
          messageId: data.messageId,
          error: data.error
        },
        kullanici: null, // System notification
        tarih: new Date()
      });
    } catch (error) {
      console.error('Activity log error:', error);
    }
  }

  // 🔄 Auto notifications for system events
  async sendAutoNotification(event, data) {
    try {
      const templates = {
        'firma_created': {
          subject: 'Yeni Firma Eklendi',
          message: 'Yeni firma eklendi: {firmaAdi}. Ekleyen: {kullanici}',
          recipients: [2] // Admin group
        },
        'tesvik_status_changed': {
          subject: 'Teşvik Durumu Değişti',
          message: 'Teşvik belgesi {tesvikId} durumu {eskiDurum} -> {yeniDurum} olarak değiştirildi.',
          recipients: [2, 3] // Admin and managers
        },
        'user_registered': {
          subject: 'Hoş Geldiniz',
          message: 'Merhaba {name}, sistemimize hoş geldiniz! Giriş bilgilerinizi güvenli tutmayı unutmayın.',
          recipients: 'direct' // Send to the user directly
        },
        'system_backup': {
          subject: 'Sistem Yedekleme Tamamlandı',
          message: 'Sistem yedekleme işlemi başarıyla tamamlandı. Tarih: {date}',
          recipients: [2] // Admin group
        }
      };

      const template = templates[event];
      if (!template) return;

      let processedMessage = template.message;
      Object.entries(data).forEach(([key, value]) => {
        processedMessage = processedMessage.replace(`{${key}}`, value);
      });

      if (template.recipients === 'direct' && data.email) {
        await this.sendEmail({
          to: data.email,
          subject: template.subject,
          html: this.generateEmailHTML(template.subject, processedMessage),
          priority: 'normal'
        });
      } else {
        await this.sendBulkNotification({
          type: 'email',
          recipients: template.recipients,
          subject: template.subject,
          message: processedMessage,
          priority: 'normal'
        });
      }
    } catch (error) {
      console.error('Auto notification error:', error);
    }
  }

  // 🎨 Generate HTML email template
  generateEmailHTML(subject, message) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background: #1976d2; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${process.env.APP_NAME || 'Cahit Sistem'}</h1>
          </div>
          <div class="content">
            <h2>${subject}</h2>
            <p>${message.replace(/\n/g, '<br>')}</p>
          </div>
          <div class="footer">
            <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Cahit Sistem'}. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // 📈 Get notification statistics
  async getNotificationStats(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activities = await Activity.find({
        tip: 'bildirim',
        tarih: { $gte: startDate }
      });

      const stats = {
        total: activities.length,
        email: activities.filter(a => a.detaylar?.type === 'email').length,
        sms: activities.filter(a => a.detaylar?.type === 'sms').length,
        success: activities.filter(a => a.detaylar?.status === 'sent').length,
        failed: activities.filter(a => a.detaylar?.status === 'failed').length
      };

      return stats;
    } catch (error) {
      console.error('Notification stats error:', error);
      return { total: 0, email: 0, sms: 0, success: 0, failed: 0 };
    }
  }
}

module.exports = new NotificationService();