function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
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

function fromDefaults() {
  const configuredFrom = env("EMAIL_FROM");
  if (configuredFrom) return parseAddressHeader(configuredFrom);

  return {
    name: env("EMAIL_FROM_NAME", "CamoSignal Campaign"),
    email: env("EMAIL_FROM_EMAIL"),
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const resendConfigured = Boolean(env("RESEND_API_KEY"));
  const smtpConfigured = Boolean(env("SMTP_HOST") && env("SMTP_PORT") && env("SMTP_USER") && env("SMTP_PASS"));
  const sender = fromDefaults();

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    serverConfigured: (resendConfigured || smtpConfigured) && Boolean(sender.email),
    resendConfigured,
    smtpConfigured,
    provider: resendConfigured ? "resend" : smtpConfigured ? "smtp" : "",
    fromName: sender.name,
    fromEmail: sender.email,
    replyTo: env("EMAIL_REPLY_TO"),
    unsubscribeUrl: env("EMAIL_UNSUBSCRIBE_URL"),
    manualCredentialsAllowed: env("ALLOW_CLIENT_EMAIL_CREDENTIALS", "false") === "true",
  });
}
