import Image from "next/image";
import plumbingPhoto from "../../public/plumbing-tools-stock.jpg";
import { Brand } from "@/components/brand";
import { WaterHeadline } from "@/components/water-headline";
import { DomCharacter } from "@/components/dom-character";
import { Header } from "@/components/header";
import { Icon } from "@/components/icon";
import { QuoteForm } from "@/components/quote-form";
import { SiteExperience } from "@/components/site-experience";
import { business } from "@/lib/business";

const services = [
  {
    icon: "droplet" as const,
    title: "Leaks & repairs",
    summary: "For the drip that just won’t quit.",
    description:
      "Leaking taps, running toilets and damaged pipes. Tell us what’s happening and we’ll help work out the next step.",
    examples: "Taps · Toilets · Pipe repairs",
  },
  {
    icon: "pipe" as const,
    title: "Blocked drains",
    summary: "Get things moving again.",
    description:
      "A slow sink or a backed-up drain needs attention. We can investigate the blockage and talk you through the options for clearing it.",
    examples: "Sinks · Showers · Drain blockages",
  },
  {
    icon: "wrench" as const,
    title: "Hot water & installations",
    summary: "The everyday essentials, taken care of.",
    description:
      "From a replacement tap to a hot water problem, we can help with repairs and new fittings in your kitchen, bathroom and laundry.",
    examples: "Hot water · Tapware · Fixture installations",
  },
];

export default function Home() {
  return (
    <SiteExperience>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <section
          className="hero-shell"
          id="home"
          aria-labelledby="hero-heading"
        >
          <div className="hero-layout container">
            <div className="hero-left">
              <WaterHeadline />
              <div className="hero-quote-card">
                <p>
                  <Icon name="pin" />
                  <span>
                    The Hills District
                    <br />& surrounding areas
                  </span>
                </p>
                <a className="button" href="#quote">
                  <Icon name="mail" />
                  Request a quote
                </a>
              </div>
            </div>
            <div className="hero-stage" data-hero-stage="3d">
              <DomCharacter />
            </div>
            <div className="hero-support">
              <div className="hero-pipe-space" aria-hidden="true" />
              <div className="hero-support-copy">
                <p>
                  A leaking tap. A blocked drain. A fresh set of fittings. Get
                  it sorted with Dom’s Plumbing Services.
                </p>
                <a className="hero-services-link" href="#services">
                  Explore our services
                  <Icon name="chevron-down" />
                </a>
              </div>
              <figure className="hero-detail-photo">
                <Image
                  id="hero-image"
                  src={plumbingPhoto}
                  alt="Chrome tap, braided water hoses and a wrench laid out on plumbing plans"
                  fill
                  priority
                  sizes="(max-width: 640px) 100vw, (max-width: 900px) 40vw, 25vw"
                />
              </figure>
            </div>
          </div>
        </section>
        <div className="emergency-wrap">
          <div className="emergency-strip container">
            <div className="emergency-heading">
              <Icon name="phone" />
              <strong>Can’t wait? Give Dom a call.</strong>
            </div>
            <span className="emergency-description">
              Emergency plumbing callouts
            </span>
            <a href={business.phoneHref}>
              {business.phoneDisplay}
              <Icon name="phone" />
            </a>
          </div>
        </div>
        <section
          className="services-section container section-space"
          id="services"
          aria-labelledby="services-heading"
        >
          <div className="section-heading">
            <div>
              <h2 id="services-heading">
                Small leaks.
                <br />
                Bigger plans.
              </h2>
              <p>
                Plumbing help for the things that need fixing
                <br className="desktop-break" /> and the things you’re ready to
                change.
              </p>
            </div>
          </div>
          <div className="service-list">
            {services.map((service) => (
              <details className="service" key={service.title}>
                <summary>
                  <span className="service-icon">
                    <Icon name={service.icon} />
                  </span>
                  <h3>{service.title}</h3>
                  <span className="service-summary">{service.summary}</span>
                  <span className="service-expand">
                    <Icon name="plus" />
                  </span>
                </summary>
                <div className="service-body">
                  <p>{service.description}</p>
                  <span>{service.examples}</span>
                  <a className="text-link" href="#quote">
                    Talk to Dom
                    <Icon name="mail" />
                  </a>
                </div>
              </details>
            ))}
          </div>
        </section>
        <section
          className="process-section"
          id="how-it-works"
          aria-labelledby="process-heading"
        >
          <div className="container process-inner">
            <div className="process-intro">
              <h2 id="process-heading">
                Let’s take it
                <br />
                from here.
              </h2>
              <p>
                Getting your plumbing sorted
                <br />
                starts with a conversation.
              </p>
            </div>
            <div className="process-steps">
              <div className="process-step">
                <Icon name="chat" />
                <div>
                  <h3>Tell us what’s happening.</h3>
                  <p>
                    A quick description and a few details about the job are a
                    good place to start.
                  </p>
                </div>
              </div>
              <div className="process-step">
                <Icon name="clipboard" />
                <div>
                  <h3>Talk through the options.</h3>
                  <p>
                    We’ll discuss the work, the cost and a time that suits
                    before getting started.
                  </p>
                </div>
              </div>
              <div className="process-step">
                <Icon name="wrench" />
                <div>
                  <h3>Get back to your day.</h3>
                  <p>
                    We’ll take care of the plumbing and leave the work area
                    tidy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section
          className="quote-section container section-space"
          id="quote"
          aria-labelledby="quote-heading"
        >
          <div className="quote-copy">
            <h2 id="quote-heading">
              What needs
              <br />
              <span>sorting?</span>
            </h2>
            <p>
              Tell Dom a little about your job.
              <br />
              We’ll take it from there.
            </p>
            <div className="contact-links">
              <a href={business.phoneHref}>
                <Icon name="phone" />
                {business.phoneDisplay}
              </a>
              <a href={`mailto:${business.email}`}>
                <Icon name="mail" />
                {business.email}
              </a>
              <p>
                <Icon name="pin" />
                {business.area}
              </p>
            </div>
            <p className="urgent-note">
              For an urgent job, please call rather than email.
            </p>
          </div>
          <QuoteForm />
        </section>
      </main>
      <footer className="site-footer">
        <div className="container footer-main">
          <Brand className="footer-brand" />
          <a className="back-top text-link" href="#main">
            Back to top
            <Icon name="chevron-up" />
          </a>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 Dom’s Plumbing Services.</span>
          <span>Draft preview · Sample contact details and services</span>
        </div>
      </footer>
    </SiteExperience>
  );
}
