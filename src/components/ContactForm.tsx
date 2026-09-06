import { useId, useState, type FormEvent } from "react";
import { useLang } from "../i18n/LangProvider";
import Blueprint from "./Blueprint";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const { t } = useLang();
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (company) return; // honeypot: a bot filled a field humans never see

    const endpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT;
    if (!endpoint) {
      setStatus("error");
      setError("The contact form is not configured yet. Email me directly instead.");
      return;
    }

    setStatus("sending");
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
    >
      <div className="field">
        <label htmlFor={nameId}>{t("contact.name")}</label>
        <input
          id={nameId}
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={emailId}>{t("contact.email")}</label>
        <input
          id={emailId}
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={messageId}>{t("contact.message")}</label>
        <textarea
          id={messageId}
          className="input"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>

      <input
        type="text"
        name="company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
      />

      <Blueprint as="div" style={{ alignSelf: "flex-start" }}>
        <button className="btn btn-primary" type="submit" disabled={status === "sending"}>
          {t("contact.send")}
        </button>
      </Blueprint>

      {status === "sent" && <p role="status">Thanks — your message is on its way.</p>}
      {status === "error" && (
        <p role="alert" style={{ color: "var(--color-accent-700)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
