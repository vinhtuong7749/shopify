import nodemailer from "nodemailer";

const MAX_RECIPIENTS = 50;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function parseRecipients(value) {
  return String(value || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function isEmail(value) {
  return EMAIL_PATTERN.test(String(value || "").trim());
}

function parseAddressHeader(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].replace(/^"|"$/g, "").trim(),
      email: match[2].trim(),
    };
  }
  return {
    name: "",
    email: raw,
  };
}

function buildFrom({ fromName, fromEmail, preferConfigured }) {
  if (preferConfigured) {
    const configuredFrom = env("EMAIL_FROM");
    if (configuredFrom) return configuredFrom;

    const configuredEmail = env("EMAIL_FROM_EMAIL");
    const configuredName = env("EMAIL_FROM_NAME", "CamoSignal");
    if (configuredEmail) return `${configuredName} <${configuredEmail}>`;
  }

  return fromName ? `${fromName} <${fromEmail}>` : fromEmail;
}

function getConfiguredFromEmail() {
  const configuredFrom = env("EMAIL_FROM");
  if (configuredFrom) return parseAddressHeader(configuredFrom).email;
  return env("EMAIL_FROM_EMAIL");
}

function prepareHtmlForDirectSend(html, unsubscribeUrl) {
  const safeUnsubscribeUrl = unsubscribeUrl || "https://camosignal.com";
  return String(html || "")
    .replace(/\{\{\s*open_tracking_block\s*\}\}/g, "")
    .replace(
      /\{\{\s*unsubscribe_link\s*\}\}/g,
      `<a href="${safeUnsubscribeUrl}" style="color:#ffffff; text-decoration:underline;">Unsubscribe</a>`,
    );
}

function configuredProvider() {
  if (env("RESEND_API_KEY")) return "resend";
  if (env("SMTP_HOST") && env("SMTP_PORT") && env("SMTP_USER") && env("SMTP_PASS")) return "smtp";
  return "";
}

function configuredSmtp() {
  return {
    host: env("SMTP_HOST"),
    port: Number(env("SMTP_PORT")),
    secure: env("SMTP_SECURE", "true") !== "false",
    auth: {
      user: env("SMTP_USER"),
      pass: env("SMTP_PASS"),
    },
  };
}

async function sendWithResend({ apiKey, from, to, subject, html, replyTo, unsubscribeUrl }) {
  const ids = [];

  for (const recipient of to) {
    const body = {
      from,
      to: recipient,
      subject,
      html,
    };
    if (replyTo) body.reply_to = replyTo;
    if (unsubscribeUrl) {
      body.headers = {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `${recipient}: ${data.message || data.error || "Failed to send through Resend"}`,
      };
    }

    ids.push(data.id);
  }

  return {
    ok: true,
    id: ids.filter(Boolean).join(", "),
  };
}

async function sendWithSmtp({ smtp, from, to, subject, html, replyTo, unsubscribeUrl }) {
  const transporter = nodemailer.createTransport(smtp);
  const ids = [];

  for (const recipient of to) {
    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject,
      html,
      replyTo: replyTo || undefined,
      headers: unsubscribeUrl
        ? {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          }
        : undefined,
    });

    ids.push(info.messageId);
  }

  return {
    ok: true,
    id: ids.filter(Boolean).join(", "),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      recipients,
      subject,
      fromName,
      fromEmail,
      method = "server",
      html,
      resendApiKey,
      smtp,
      unsubscribeUrl,
      replyTo,
    } = req.body || {};

    const recipientList = parseRecipients(recipients);
    const invalidRecipient = recipientList.find((email) => !isEmail(email));

    if (!subject || !html) {
      return res.status(400).json({ error: "Missing required fields (subject, html)" });
    }

    if (!recipientList.length) {
      return res.status(400).json({ error: "No valid recipients found" });
    }

    if (invalidRecipient) {
      return res.status(400).json({ error: `Invalid recipient email: ${invalidRecipient}` });
    }

    if (recipientList.length > MAX_RECIPIENTS) {
      return res.status(400).json({ error: `Maximum ${MAX_RECIPIENTS} recipients per send` });
    }

    const provider = method === "server" ? configuredProvider() : method;
    if (!provider) {
      return res.status(400).json({
        error: "Email sender is not configured. Set RESEND_API_KEY and EMAIL_FROM in Vercel, or use a manual test method.",
      });
    }

    const finalUnsubscribeUrl = String(unsubscribeUrl || env("EMAIL_UNSUBSCRIBE_URL") || "").trim();
    const finalReplyTo = String(replyTo || env("EMAIL_REPLY_TO") || "").trim();
    const finalHtml = prepareHtmlForDirectSend(html, finalUnsubscribeUrl);

    let from = buildFrom({ fromName, fromEmail, preferConfigured: method === "server" });
    if (method !== "server" && !fromEmail) {
      return res.status(400).json({ error: "fromEmail is required for manual sender mode" });
    }

    if (method === "server" && !getConfiguredFromEmail()) {
      return res.status(400).json({ error: "Missing EMAIL_FROM or EMAIL_FROM_EMAIL environment variable" });
    }

    let result;
    if (provider === "resend") {
      const apiKey = method === "server" ? env("RESEND_API_KEY") : String(resendApiKey || "").trim();
      if (!apiKey) {
        return res.status(400).json({ error: "Missing Resend API key" });
      }
      result = await sendWithResend({
        apiKey,
        from,
        to: recipientList,
        subject,
        html: finalHtml,
        replyTo: finalReplyTo,
        unsubscribeUrl: finalUnsubscribeUrl,
      });
    } else if (provider === "smtp") {
      const smtpConfig = method === "server" ? configuredSmtp() : smtp;
      if (!smtpConfig || !smtpConfig.host || !smtpConfig.port || !smtpConfig.auth?.user || !smtpConfig.auth?.pass) {
        const manualSmtp = smtp && smtp.host && smtp.port && smtp.user && smtp.pass
          ? {
              host: smtp.host,
              port: Number(smtp.port),
              secure: Boolean(smtp.secure),
              auth: { user: smtp.user, pass: smtp.pass },
            }
          : null;
        if (!manualSmtp) {
          return res.status(400).json({ error: "Missing SMTP configuration" });
        }
        result = await sendWithSmtp({
          smtp: manualSmtp,
          from,
          to: recipientList,
          subject,
          html: finalHtml,
          replyTo: finalReplyTo,
          unsubscribeUrl: finalUnsubscribeUrl,
        });
      } else {
        result = await sendWithSmtp({
          smtp: smtpConfig,
          from,
          to: recipientList,
          subject,
          html: finalHtml,
          replyTo: finalReplyTo,
          unsubscribeUrl: finalUnsubscribeUrl,
        });
      }
    } else {
      return res.status(400).json({ error: "Invalid sending method" });
    }

    if (!result.ok) {
      return res.status(result.status || 400).json({ error: result.error || "Failed to send email" });
    }

    return res.status(200).json({
      id: result.id,
      provider,
      recipients: recipientList.length,
      from,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to send email",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
