"use client";
import { useState } from "react";
import { business } from "@/lib/business";
import { Icon } from "./icon";

export function QuoteForm() {
  const [status, setStatus] = useState("");
  const [prepared, setPrepared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  function prepareEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = `Hi Dom,\n\nI'd like a quote for ${data.get("service")}.\n\n${String(data.get("details")).trim()}\n\nName: ${String(data.get("name")).trim()}\nEmail: ${String(data.get("email")).trim()}\nPhone: ${String(data.get("phone")).trim() || "Not provided"}\nSuburb: ${String(data.get("suburb")).trim()}\n`;
    const subject = `Plumbing quote — ${String(data.get("service"))} in ${String(data.get("suburb")).trim()}`;
    setEmailDraft(body);
    setPrepared(true);
    setCopied(false);
    setStatus(
      "Your email draft is ready. Review and send it in your email app. If it doesn’t open, you can copy your enquiry below.",
    );
    window.location.href = `mailto:${business.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  async function copyEnquiry() {
    try {
      await navigator.clipboard.writeText(emailDraft);
      setCopied(true);
      setStatus("Enquiry copied. You can paste it into your email app.");
    } catch {
      setStatus(
        "Copy wasn’t available. Select and copy your enquiry from the text below.",
      );
    }
  }
  return (
    <form
      className="quote-form"
      action={`mailto:${business.email}`}
      method="post"
      encType="text/plain"
      onSubmit={prepareEmail}
      onChange={() => {
        if (prepared) {
          setPrepared(false);
          setCopied(false);
          setStatus("");
        }
      }}
    >
      <div className="form-heading">
        <h3>Request a quote</h3>
        <Icon name="mail" />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Full name"
            required
            maxLength={100}
          />
        </div>
        <div className="field">
          <label htmlFor="suburb">Suburb</label>
          <input
            id="suburb"
            name="suburb"
            autoComplete="address-level2"
            placeholder="Where’s the job?"
            required
            maxLength={100}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            maxLength={254}
          />
        </div>
        <div className="field">
          <label htmlFor="phone">
            Phone <span>(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Your phone number"
            maxLength={30}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="service">What can we help with?</label>
        <div className="select-wrap">
          <select id="service" name="service" defaultValue="" required>
            <option value="" disabled>
              Select a service
            </option>
            <option>Leaks & repairs</option>
            <option>Blocked drains</option>
            <option>Hot water & installations</option>
            <option>Something else</option>
          </select>
          <Icon name="chevron-down" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="details">A little about the job</label>
        <textarea
          id="details"
          name="details"
          rows={3}
          placeholder="What’s happening, and when do you need a hand?"
          required
          maxLength={2000}
        />
      </div>
      <button className="button button-primary form-submit" type="submit">
        <Icon name={prepared ? "check" : "mail"} />
        {prepared ? "Create email again" : "Create quote email"}
      </button>
      <p className="form-note">
        Opens your email app. Nothing is sent automatically.
      </p>
      {business.isDraft && (
        <p className="draft-note">
          Draft preview: the email address and phone number are samples.
        </p>
      )}
      <div className="form-feedback" aria-live="polite" aria-atomic="true">
        {status && <p>{status}</p>}
      </div>
      {prepared && (
        <div className="enquiry-preview">
          <label htmlFor="enquiry-preview">Your enquiry</label>
          <textarea id="enquiry-preview" value={emailDraft} readOnly rows={7} />
          <button className="text-link" type="button" onClick={copyEnquiry}>
            <Icon name={copied ? "check" : "copy"} />
            {copied ? "Copied" : "Copy enquiry"}
          </button>
        </div>
      )}
    </form>
  );
}
