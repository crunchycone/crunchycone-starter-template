# Email Provider Implementation Guide

This guide explains how to implement different email providers in the CrunchyCone starter template.

## Overview

The email system uses a provider pattern, making it easy to swap between different email services. The default `ConsoleEmailProvider` logs emails to the console, perfect for development.

## Email Provider Interface

All email providers must implement this interface:

```typescript
export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<void>;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}
```

## Implementing Email Providers

### 1. SendGrid

First, install the SendGrid package:

```bash
npm install @sendgrid/mail
```

Create `lib/email/providers/sendgrid.ts`:

```typescript
import sgMail from "@sendgrid/mail";
import { EmailProvider, EmailOptions } from "../email";

export class SendGridProvider implements EmailProvider {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await sgMail.send({
        to: options.to,
        from: options.from || process.env.EMAIL_FROM || "noreply@example.com",
        subject: options.subject,
        text: options.text || options.html,
        html: options.html,
      });
    } catch (error) {
      console.error("SendGrid error:", error);
      throw new Error("Failed to send email");
    }
  }
}
```

### 2. Resend

Install Resend:

```bash
npm install resend
```

Create `lib/email/providers/resend.ts`:

```typescript
import { Resend } from "resend";
import { EmailProvider, EmailOptions } from "../email";

export class ResendProvider implements EmailProvider {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.resend.emails.send({
        from: options.from || process.env.EMAIL_FROM || "noreply@example.com",
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    } catch (error) {
      console.error("Resend error:", error);
      throw new Error("Failed to send email");
    }
  }
}
```

### 3. AWS SES

Install AWS SDK:

```bash
npm install @aws-sdk/client-ses
```

Create `lib/email/providers/aws-ses.ts`:

```typescript
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { EmailProvider, EmailOptions } from "../email";

export class AWSSESProvider implements EmailProvider {
  private client: SESClient;

  constructor(region: string, credentials?: { accessKeyId: string; secretAccessKey: string }) {
    this.client = new SESClient({
      region,
      credentials,
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const command = new SendEmailCommand({
        Source: options.from || process.env.EMAIL_FROM || "noreply@example.com",
        Destination: {
          ToAddresses: [options.to],
        },
        Message: {
          Subject: {
            Data: options.subject,
          },
          Body: {
            Text: options.text ? { Data: options.text } : undefined,
            Html: { Data: options.html },
          },
        },
      });

      await this.client.send(command);
    } catch (error) {
      console.error("AWS SES error:", error);
      throw new Error("Failed to send email");
    }
  }
}
```

### 4. Nodemailer (SMTP)

Install Nodemailer:

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

Create `lib/email/providers/smtp.ts`:

```typescript
import nodemailer from "nodemailer";
import { EmailProvider, EmailOptions } from "../email";

export class SMTPProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor(config: {
    host: string;
    port: number;
    secure?: boolean;
    auth: {
      user: string;
      pass: string;
    };
  }) {
    this.transporter = nodemailer.createTransport(config);
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: options.from || process.env.EMAIL_FROM || "noreply@example.com",
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    } catch (error) {
      console.error("SMTP error:", error);
      throw new Error("Failed to send email");
    }
  }
}
```

## Configuration

### Environment Variables

Add these to your `.env` file based on your provider:

```env
# General
EMAIL_FROM=noreply@yourdomain.com
EMAIL_PROVIDER=sendgrid # or resend, aws-ses, smtp, console

# SendGrid
SENDGRID_API_KEY=your-api-key

# Resend
RESEND_API_KEY=your-api-key

# AWS SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Initialize Provider on App Start

Create `lib/email/config.ts`:

```typescript
import { setEmailProvider } from "./email";
import { ConsoleEmailProvider } from "./email";
import { SendGridProvider } from "./providers/sendgrid";
import { ResendProvider } from "./providers/resend";
import { AWSSESProvider } from "./providers/aws-ses";
import { SMTPProvider } from "./providers/smtp";

export function initializeEmailProvider() {
  const provider = process.env.EMAIL_PROVIDER || "console";

  switch (provider) {
    case "sendgrid":
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error("SENDGRID_API_KEY is required");
      }
      setEmailProvider(new SendGridProvider(process.env.SENDGRID_API_KEY));
      break;

    case "resend":
      if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is required");
      }
      setEmailProvider(new ResendProvider(process.env.RESEND_API_KEY));
      break;

    case "aws-ses":
      if (!process.env.AWS_REGION) {
        throw new Error("AWS_REGION is required");
      }
      setEmailProvider(
        new AWSSESProvider(
          process.env.AWS_REGION,
          process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              }
            : undefined
        )
      );
      break;

    case "smtp":
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error("SMTP configuration is incomplete");
      }
      setEmailProvider(
        new SMTPProvider({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_PORT === "465",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        })
      );
      break;

    case "console":
    default:
      setEmailProvider(new ConsoleEmailProvider());
      console.log("Using ConsoleEmailProvider (emails will be logged to console)");
      break;
  }
}
```

### Initialize in Your App

Add to `app/layout.tsx` or create an initializer:

```typescript
import { initializeEmailProvider } from "@/lib/email/config";

// Initialize email provider on app start
if (typeof window === "undefined") {
  initializeEmailProvider();
}
```

## Testing Email Providers

### Development Testing

For development, you can use services like:

1. **Mailtrap** - Catches emails in a test inbox
2. **Ethereal Email** - Generates test SMTP credentials
3. **MailHog** - Local SMTP testing server

### Example with Ethereal:

```typescript
// For testing only - Ethereal Email
const testAccount = await nodemailer.createTestAccount();

setEmailProvider(
  new SMTPProvider({
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  })
);
```

## Best Practices

1. **Error Handling**: Always wrap email sending in try-catch blocks
2. **Retry Logic**: Implement retry logic for transient failures
3. **Queue System**: For production, consider using a queue (Bull, BullMQ) for email sending
4. **Templates**: Store email templates separately for easier management
5. **Monitoring**: Log email sending success/failure for monitoring
6. **Rate Limiting**: Respect provider rate limits
7. **Unsubscribe Links**: Include unsubscribe links in marketing emails
8. **SPF/DKIM**: Configure domain authentication for better deliverability

## Troubleshooting

### Common Issues

1. **Emails going to spam**
   - Configure SPF, DKIM, and DMARC records
   - Use a reputable email service
   - Avoid spam trigger words

2. **Rate limiting**
   - Implement exponential backoff
   - Use provider's batch sending APIs
   - Consider upgrading your plan

3. **Invalid API keys**
   - Double-check environment variables
   - Ensure keys have correct permissions
   - Check for whitespace in keys

4. **Template rendering issues**
   - Test templates with various email clients
   - Use inline CSS for better compatibility
   - Provide text alternatives

## Advanced Features

### Email Queues with BullMQ

```typescript
import { Queue, Worker } from "bullmq";
import { sendEmail } from "@/lib/email/email";

// Create queue
export const emailQueue = new Queue("emails");

// Add to queue
await emailQueue.add("send-email", {
  to: user.email,
  subject: "Welcome!",
  html: "<h1>Welcome</h1>",
});

// Process queue
new Worker("emails", async (job) => {
  await sendEmail(job.data);
});
```

### Email Tracking

Track opens and clicks:

```typescript
// Add tracking pixel
const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/email/track?id=${emailId}" width="1" height="1" />`;

// Add to email HTML
html += trackingPixel;
```

## Security Considerations

1. **API Key Storage**: Never commit API keys to version control
2. **Input Validation**: Always validate email addresses
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Authentication**: Ensure email sending endpoints are protected
5. **Content Security**: Sanitize user-generated content in emails
