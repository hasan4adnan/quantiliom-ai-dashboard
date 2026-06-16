import LegalLayout, { type LegalSection } from "../components/LegalLayout";

const EFFECTIVE_DATE = "June 17, 2026";
const LAST_UPDATED = "June 17, 2026";

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          Quantiliom AI (&ldquo;Quantiliom&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;) operates the Quantiliom AI Software Architect
          platform, including this dashboard, the marketing website, the
          REST APIs that power them, the email pipeline that handles
          verification, billing, and security messages, and the AI
          services that generate architecture briefs, stack
          recommendations, and supporting documentation.
        </p>
        <p>
          For the purposes of the EU and UK General Data Protection
          Regulation (&ldquo;GDPR&rdquo;), Quantiliom is the data{" "}
          <em>controller</em> for the personal data you submit to your
          Account and for analytics, security, and billing data we
          collect about your use of the Service. For Customer Content that
          you enter into the Service in order to generate Outputs, we act
          as a data <em>processor</em> on your behalf and on the behalf of
          the Workspace administrator who manages your seat.
        </p>
        <p>
          Quantiliom is established in the Republic of Türkiye. Where the
          GDPR or the UK GDPR applies to processing carried out by us
          without an EU/UK establishment, you may contact our designated
          representative through the addresses below. Our Data Protection
          Officer can be reached at{" "}
          <a href="mailto:dpo@quantiliom.ai">dpo@quantiliom.ai</a>; the
          privacy team can be reached at{" "}
          <a href="mailto:privacy@quantiliom.ai">privacy@quantiliom.ai</a>.
        </p>
      </>
    ),
  },
  {
    id: "scope",
    title: "What this policy covers",
    body: (
      <>
        <p>
          This Privacy Policy explains what personal data we collect when
          you visit the website, create an Account, sign in, complete
          onboarding, use the dashboard, call our APIs, contact support,
          subscribe to a paid plan, or interact with our marketing
          channels; how we use that data; the legal bases we rely on; who
          we share it with; how long we keep it; where it is processed;
          and the rights you have over it.
        </p>
        <p>
          This Policy does <strong>not</strong> apply to:
        </p>
        <ul>
          <li>
            personal data we process as a processor on a Customer&rsquo;s
            behalf where a separate data processing addendum (DPA) governs
            (in case of conflict, the DPA controls);
          </li>
          <li>
            third-party sites you reach through links in the Service —
            those have their own privacy policies;
          </li>
          <li>
            information about Quantiliom employees and applicants, which
            is handled under separate internal notices.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "definitions",
    title: "Key terms",
    body: (
      <>
        <p>
          We use the following terms in this Policy. Terms defined in the
          Terms of Service have the same meaning here.
        </p>
        <ul>
          <li>
            <strong>&ldquo;Personal data&rdquo;</strong> means any
            information relating to an identified or identifiable natural
            person.
          </li>
          <li>
            <strong>&ldquo;Processing&rdquo;</strong> means any operation
            performed on personal data, including collection, storage,
            transmission, transformation, disclosure, and deletion.
          </li>
          <li>
            <strong>&ldquo;Controller&rdquo;</strong> means the party that
            determines the purposes and means of processing.
          </li>
          <li>
            <strong>&ldquo;Processor&rdquo;</strong> means the party that
            processes personal data on behalf of a controller.
          </li>
          <li>
            <strong>&ldquo;Sub-processor&rdquo;</strong> means a third
            party engaged by a processor to assist in processing.
          </li>
          <li>
            <strong>&ldquo;Special categories&rdquo;</strong> refers to
            the data described in Article&nbsp;9 GDPR (health data,
            biometric data, data revealing racial or ethnic origin,
            religious or philosophical beliefs, sexual orientation, etc.).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "data-we-collect",
    title: "Personal data we collect",
    body: (
      <>
        <p>We collect personal data in three ways.</p>

        <h3 className="legal-h3">Data you provide directly</h3>
        <ul>
          <li>
            <strong>Account data:</strong> email address, password (stored
            as a cryptographic hash by Firebase Authentication — we never
            see your plaintext password), display name, profile photo URL
            (if your federated provider supplies one), and the provider
            you used to sign in (email/password, Google, GitHub, or
            Microsoft).
          </li>
          <li>
            <strong>Profile and onboarding answers:</strong> the role,
            technical level, primary use case, project stage, team size,
            preferred level of detail, and other answers you give in the
            registration wizard. These shape the Outputs we generate for
            you.
          </li>
          <li>
            <strong>Email verification:</strong> the 6-digit code we email
            during sign-up is stored only as a SHA-256 hash with a
            10-minute expiry; we record verification timestamps, the
            timestamp of the most recent code, and the count of failed
            attempts to enforce rate limits and lock-outs.
          </li>
          <li>
            <strong>Billing data:</strong> plan selection, subscription
            status, renewal date, billing address, VAT/tax ID, currency,
            and transaction metadata (invoice number, amount, last four
            digits of the card and card brand for receipts). Full card
            details are processed by our payment processor; we do not
            store them on our servers.
          </li>
          <li>
            <strong>Support and sales correspondence:</strong> messages,
            attachments, screen recordings you share, and any context you
            provide when you contact support, sales, or legal.
          </li>
          <li>
            <strong>Survey and research data:</strong> responses you
            voluntarily provide to product surveys, user-research
            interviews, or beta-feature questionnaires.
          </li>
        </ul>

        <h3 className="legal-h3">Customer Content you submit</h3>
        <p>
          When you use the Service, you submit project briefs, prompts,
          configuration files, attachments, and other materials so we can
          generate Outputs. We process this content on your behalf as a
          processor, treat it confidentially, and do not access it for
          purposes other than operating the Service unless you instruct us
          to or unless we are required to in connection with a legal
          obligation, security investigation, or platform-policy review.
        </p>
        <p>
          Where the Workspace administrator on a Team plan has access to
          content you submit, you should treat that content as visible to
          them. Workspace administrators can also see usage metadata
          about your activity in the Workspace (such as last-active
          timestamps).
        </p>

        <h3 className="legal-h3">Data we collect automatically</h3>
        <ul>
          <li>
            <strong>Authentication state:</strong> Firebase ID tokens,
            custom tokens minted by our backend for the cross-origin
            handoff between the marketing site and the dashboard, session
            timestamps, refresh-token rotation events, and provider IDs.
          </li>
          <li>
            <strong>Device and connection metadata:</strong> IP address,
            user-agent string, language, time zone, screen size,
            operating-system family, and approximate region inferred from
            your IP. We use this for security, abuse prevention,
            geo-redirection, and to localize the experience.
          </li>
          <li>
            <strong>Product telemetry:</strong> pages visited, features
            used, click-paths, navigation events, performance traces,
            error reports, and aggregate latency measurements for the
            dashboard and APIs. We try to keep events minimal and to
            scrub free-form text out of event payloads.
          </li>
          <li>
            <strong>Communication interactions:</strong> open and
            click-through events on transactional emails (e.g., did the
            verification email get opened) so we can troubleshoot
            deliverability.
          </li>
          <li>
            <strong>Storage hints:</strong> we set a small number of
            cookies and use browser <code>localStorage</code> and{" "}
            <code>sessionStorage</code> for session persistence, theme,
            dashboard UI state, and CSRF protection. See{" "}
            <a href="#cookies">Cookies and similar technologies</a>.
          </li>
        </ul>

        <p>
          We do not knowingly collect special categories of personal data
          (Article&nbsp;9 GDPR). Do not submit such data through the
          Service unless you have a separate written agreement that
          authorises it. If you submit special-category data to the
          Service without our written authorisation, we may delete it.
        </p>
      </>
    ),
  },
  {
    id: "sources",
    title: "Sources we collect from",
    body: (
      <>
        <p>We obtain personal data from the following sources:</p>
        <ul>
          <li>
            <strong>You:</strong> directly, when you fill in forms, sign
            up, type prompts, contact us, or otherwise interact with the
            Service.
          </li>
          <li>
            <strong>Your device and browser:</strong> automatically, when
            you navigate the website or dashboard, as described above.
          </li>
          <li>
            <strong>Your federated identity provider:</strong> Google,
            GitHub, or Microsoft, when you choose social sign-in. They
            return the minimum profile we request (email, display name,
            and provider user ID); we do not request access to your
            inbox, repositories, calendars, or any other resource unless
            you connect a specific integration.
          </li>
          <li>
            <strong>Your Workspace administrator:</strong> if you join a
            Team-plan Workspace, the administrator may pre-create your
            seat and provide your work email and display name.
          </li>
          <li>
            <strong>Service providers and partners:</strong> our payment
            processor (subscription status, charge metadata), our
            transactional-email provider (delivery, bounce, complaint
            events), and our anti-fraud and abuse-prevention services.
          </li>
          <li>
            <strong>Publicly available sources:</strong> rarely, and only
            for prospect research or to corroborate enterprise customer
            details on a sales call. We do not enrich Account profiles
            from third-party data brokers.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use personal data",
    body: (
      <>
        <p>We use personal data to:</p>
        <ul>
          <li>create and authenticate your Account and keep you signed in;</li>
          <li>
            verify ownership of your email address using a one-time
            numeric code with rate-limiting and lock-out controls;
          </li>
          <li>
            operate the Service — receive your prompts, route them to the
            underlying Model Providers, and deliver Outputs back to your
            browser;
          </li>
          <li>
            personalise the experience based on your onboarding answers
            (for example, adjusting the level of technical detail in
            Outputs, or surfacing the right templates for your project
            stage);
          </li>
          <li>process payments, manage subscriptions, and issue invoices;</li>
          <li>
            send transactional messages — welcome email, verification
            code, billing receipts, security alerts, breach
            notifications, and material product changes;
          </li>
          <li>
            secure the Service: detect, investigate, and prevent fraud,
            abuse, automated scraping, prompt-injection attacks, and
            security incidents;
          </li>
          <li>
            measure and improve the product, including using aggregated
            and de-identified telemetry to find friction points, bugs,
            and feature gaps;
          </li>
          <li>
            run user research, surveys, and beta programs with your
            consent;
          </li>
          <li>
            provide customer support and respond to your requests;
          </li>
          <li>
            (with your consent) send product news, tips, and marketing
            communications you can opt out of at any time;
          </li>
          <li>
            comply with our legal, accounting, and regulatory
            obligations, including responding to lawful requests from
            authorities;
          </li>
          <li>
            establish, exercise, or defend legal claims.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "legal-bases",
    title: "Legal bases (GDPR)",
    body: (
      <>
        <p>
          Where the GDPR or UK GDPR applies, we rely on the following
          lawful bases:
        </p>
        <ul>
          <li>
            <strong>Performance of a contract</strong> (Art.&nbsp;6(1)(b))
            — to provide the Service to you under our Terms of Service,
            including Account creation, sign-in, generating Outputs, and
            processing payments.
          </li>
          <li>
            <strong>Legitimate interests</strong> (Art.&nbsp;6(1)(f)) — to
            keep the Service secure, prevent fraud and abuse, communicate
            operationally with you, run aggregate analytics on usage, and
            improve the product. We balance these interests against your
            rights and freedoms; you can object at any time.
          </li>
          <li>
            <strong>Consent</strong> (Art.&nbsp;6(1)(a)) — for optional
            product-improvement telemetry on the Free plan, optional
            marketing communications, non-essential cookies, and
            participation in user research. You can withdraw consent at
            any time without affecting earlier processing.
          </li>
          <li>
            <strong>Legal obligation</strong> (Art.&nbsp;6(1)(c)) — to
            keep tax and accounting records, respond to lawful requests
            from authorities, meet anti-money-laundering and
            sanctions-screening obligations, and notify supervisory
            authorities of qualifying data breaches.
          </li>
          <li>
            <strong>Vital interests / public interest</strong>
            (Art.&nbsp;6(1)(d) or (e)) — only in narrow circumstances,
            for example to address an imminent security threat to a
            user or third party.
          </li>
        </ul>
        <p>
          We do not rely on special-category processing grounds
          (Art.&nbsp;9) because we do not knowingly process special-
          category data.
        </p>
      </>
    ),
  },
  {
    id: "ai-processing",
    title: "How we process your data for AI features",
    body: (
      <>
        <p>
          When you submit a prompt or project brief, the content is sent
          to one or more Model Providers acting as our sub-processors.
          They generate the Output that is returned to your browser
          through our backend. We use Model Providers under
          data-processing agreements that include the protections
          required by the GDPR and equivalent regimes, including the
          European Commission&rsquo;s Standard Contractual Clauses where
          relevant and supplementary technical and organisational
          measures.
        </p>
        <p>
          We do <strong>not</strong> use Customer Content from paid plans
          (Pro, Team) to train any Quantiliom or third-party model. For
          Free accounts we may use de-identified, aggregated telemetry
          derived from prompts for product improvement; you can opt out
          at any time from Account &rarr; Privacy.
        </p>
        <p>
          The Model Providers we currently rely on, the categories of
          data sent to each, and the regions in which they process are
          summarised in our sub-processor register at{" "}
          <a href="#sub-processors">Sub-processors</a> and updated as
          changes occur. We notify Customers in writing if we add or
          replace a Model Provider in a material way.
        </p>
        <p>
          We and our Model Providers may operate automated safety,
          policy, and abuse filters on prompts and Outputs. Where a
          prompt triggers a filter, we may store the filter event
          (including a hash of the prompt) for a limited period for
          policy review.
        </p>
      </>
    ),
  },
  {
    id: "sub-processors",
    title: "Sub-processors",
    body: (
      <>
        <p>
          We rely on the following categories of sub-processors to deliver
          the Service. A current named list is maintained at{" "}
          <a href="mailto:privacy@quantiliom.ai">privacy@quantiliom.ai</a>{" "}
          and is updated whenever we add, remove, or replace a
          sub-processor in a material way.
        </p>
        <ul>
          <li>
            <strong>Identity provider:</strong> Google Identity (Firebase
            Authentication) — authentication of email/password and
            federated logins; stores hashed credentials, sign-in events,
            and provider IDs.
          </li>
          <li>
            <strong>Application hosting and database:</strong> a managed
            PostgreSQL host and our application hosting provider —
            storage of Account, profile, billing, and Workspace metadata
            and operational logs.
          </li>
          <li>
            <strong>Model Providers:</strong> the underlying AI-model
            providers that generate Outputs from prompts.
          </li>
          <li>
            <strong>Transactional email:</strong> Resend — delivery of
            verification codes, welcome emails, billing receipts, and
            security notices.
          </li>
          <li>
            <strong>Payment processor:</strong> our chosen card processor
            — subscription billing, tax calculation, chargeback handling.
            The processor is itself the controller for payment data.
          </li>
          <li>
            <strong>Analytics and error monitoring:</strong> product
            analytics and error-reporting providers configured to
            collect the minimum data needed and to scrub obvious
            identifiers.
          </li>
          <li>
            <strong>Customer-support tooling:</strong> the help-desk and
            in-product chat tools we use to receive and triage your
            support requests.
          </li>
          <li>
            <strong>Anti-abuse and fraud prevention:</strong> tools that
            help us detect bot traffic, brute-force attacks, and
            credential stuffing.
          </li>
        </ul>
        <p>
          Each sub-processor is bound by a written agreement with terms
          at least as protective of personal data as those we offer to
          Customers, and is subject to risk assessments before we engage
          them.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share data with",
    body: (
      <>
        <p>
          We do not sell personal data and we do not &ldquo;share&rdquo;
          personal data for cross-context behavioural advertising as
          defined by the California Consumer Privacy Act. We share
          personal data only with the following categories of recipients,
          and only as needed:
        </p>
        <ul>
          <li>
            <strong>Authentication and infrastructure providers</strong>{" "}
            (Firebase Authentication, our managed PostgreSQL host, and
            our application hosting provider): they store Account
            credentials, user records, and operational logs on our
            behalf.
          </li>
          <li>
            <strong>Model Providers</strong> who run the underlying AI
            models, as described in{" "}
            <a href="#ai-processing">How we process your data for AI features</a>.
          </li>
          <li>
            <strong>Transactional email provider</strong> for the
            verification code, welcome email, billing receipts, and
            security notices.
          </li>
          <li>
            <strong>Payment processor</strong> for subscription billing,
            taxes, and chargeback handling.
          </li>
          <li>
            <strong>Analytics and error-monitoring tools</strong>,
            configured to collect the minimum data needed and to scrub
            obvious identifiers where possible.
          </li>
          <li>
            <strong>Professional advisers</strong> (lawyers, accountants,
            auditors) bound by confidentiality.
          </li>
          <li>
            <strong>Authorities and courts</strong>, where required by
            applicable law, valid legal process, or to protect the
            rights, property, or safety of Quantiliom, our users, or
            others.
          </li>
          <li>
            <strong>Workspace administrators</strong>, for Authorised
            Users on Team plans, as described in{" "}
            <a href="#data-we-collect">Customer Content you submit</a>.
          </li>
          <li>
            <strong>Successors</strong> in connection with a merger,
            acquisition, financing, or sale of assets; the new entity
            will be bound by this Policy or a substantially similar one.
            We will notify affected users before such a transfer takes
            effect.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "international-transfers",
    title: "International data transfers",
    body: (
      <>
        <p>
          Our infrastructure providers and Model Providers may process
          your personal data in the United States, the European Union,
          the United Kingdom, the Republic of Türkiye, and other
          countries outside your country of residence. Where required, we
          rely on the European Commission&rsquo;s Standard Contractual
          Clauses (SCCs) — including Module&nbsp;Two (controller to
          processor) and Module&nbsp;Three (processor to processor) as
          appropriate — and the UK International Data Transfer Addendum
          to the EU SCCs, together with supplementary technical and
          organisational measures.
        </p>
        <p>
          For transfers subject to Turkish KVKK rules, we rely on
          explicit consent, the safeguards permitted under
          Article&nbsp;9, or such other mechanism as the Personal Data
          Protection Authority publishes from time to time.
        </p>
        <p>
          You can obtain a copy of the safeguards we have put in place by
          emailing{" "}
          <a href="mailto:privacy@quantiliom.ai">privacy@quantiliom.ai</a>.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    body: (
      <>
        <ul>
          <li>
            <strong>Account data</strong> is kept for as long as your
            Account is active and for up to 90 days after deletion to
            recover the Account, resolve disputes, and meet regulatory
            requests. After that, it is deleted or de-identified.
          </li>
          <li>
            <strong>Email-verification codes</strong> expire after 10
            minutes and are deleted automatically. Hashed copies of
            expired codes are purged on the next housekeeping run.
          </li>
          <li>
            <strong>Customer Content and Outputs</strong> are retained
            while you have an Account and for up to 30 days after
            deletion, after which they are removed from primary storage.
            Backups containing the same data are overwritten within 35
            days.
          </li>
          <li>
            <strong>Billing records and invoices</strong> are retained
            for the period required by tax law (typically 10 years for
            the Republic of Türkiye, and equivalent periods in other
            jurisdictions).
          </li>
          <li>
            <strong>Security and audit logs</strong> are retained for up
            to 13 months for incident investigation, then deleted or
            de-identified.
          </li>
          <li>
            <strong>Support tickets</strong> are retained for 24 months
            after closure to provide context for follow-up requests and
            to track recurring issues.
          </li>
          <li>
            <strong>Marketing-related data</strong> (consent records,
            preference centre settings) is retained for as long as you
            are subscribed and for 24 months after unsubscribe to honour
            your suppression preferences.
          </li>
        </ul>
        <p>
          Where law requires us to retain personal data longer (for
          example, to meet litigation-hold obligations), we will keep it
          for the required period and then delete it.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <>
        <p>
          We use commercially reasonable technical and organisational
          measures to protect personal data, designed to provide a level
          of security appropriate to the risk. Measures include:
        </p>
        <ul>
          <li>
            TLS 1.2+ in transit and AES-256 encryption at rest on managed
            database and storage services;
          </li>
          <li>
            password hashing handled by Firebase Authentication;
            verification codes stored only as SHA-256 hashes; passwords
            never logged, never stored in plaintext anywhere on our
            systems, and never sent to Model Providers;
          </li>
          <li>
            least-privilege access for engineers, with role-based access
            control, single sign-on with two-factor authentication for
            internal systems, audit logging on production systems, and
            periodic access reviews;
          </li>
          <li>
            rate limiting, lock-outs, and timing-safe comparisons on
            authentication-related endpoints; CAPTCHA challenges for
            risky sign-in events;
          </li>
          <li>
            cross-origin protections, strict CORS allowlists, content
            security policies, and security headers on the dashboard and
            backend;
          </li>
          <li>
            pseudonymisation of telemetry where it does not impair
            analytical value, and aggressive scrubbing of obvious
            identifiers from error reports;
          </li>
          <li>
            secure software-development lifecycle practices including
            code review, dependency scanning, static analysis, and
            scheduled third-party penetration testing;
          </li>
          <li>
            documented incident-response and breach-notification
            procedures, with regular tabletop exercises;
          </li>
          <li>
            vendor risk assessments before we engage new sub-processors,
            and contractually required security commitments thereafter.
          </li>
        </ul>
        <p>
          No system is perfectly secure. If you believe you have found a
          vulnerability, please report it responsibly to{" "}
          <a href="mailto:security@quantiliom.ai">security@quantiliom.ai</a>{" "}
          before disclosing publicly. We will acknowledge receipt within
          three business days.
        </p>
      </>
    ),
  },
  {
    id: "breach-notification",
    title: "Breach notification",
    body: (
      <p>
        If we become aware of a personal data breach that is likely to
        result in a risk to your rights and freedoms, we will notify the
        relevant supervisory authority within 72 hours where required by
        law, and will notify affected users without undue delay where the
        breach is likely to result in a high risk. We will provide
        information about the nature of the breach, the categories and
        approximate number of individuals affected, the likely
        consequences, and the measures taken or proposed to address it.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>Subject to applicable law, you have the right to:</p>
        <ul>
          <li>
            <strong>Access</strong> the personal data we hold about you
            and receive a copy in a structured, commonly used,
            machine-readable format;
          </li>
          <li>
            <strong>Rectify</strong> inaccurate or incomplete data —
            most Account data is editable from Account in the dashboard;
          </li>
          <li>
            <strong>Erase</strong> your data (the &ldquo;right to be
            forgotten&rdquo;), subject to our retention obligations;
          </li>
          <li>
            <strong>Restrict</strong> or <strong>object</strong> to
            processing, including processing based on our legitimate
            interests and direct-marketing processing (where you have an
            absolute right to object);
          </li>
          <li>
            <strong>Port</strong> your data to another controller where
            technically feasible;
          </li>
          <li>
            <strong>Withdraw consent</strong> at any time, without
            affecting the lawfulness of processing carried out before the
            withdrawal;
          </li>
          <li>
            <strong>Complain</strong> to a supervisory authority — in
            Türkiye, the Kişisel Verileri Koruma Kurumu (KVKK); in the
            EU, your local data-protection authority; in the UK, the
            Information Commissioner&rsquo;s Office (ICO).
          </li>
        </ul>
        <p>
          To exercise any of these rights, email{" "}
          <a href="mailto:privacy@quantiliom.ai">privacy@quantiliom.ai</a>{" "}
          from the address associated with your Account, or use the
          self-service tools in Account in the dashboard. We respond
          within 30 days of a verifiable request. Where we need to verify
          your identity we may ask for additional information; we will
          not use that information for any other purpose.
        </p>
      </>
    ),
  },
  {
    id: "regional",
    title: "Regional rights (US, UK, Brazil, others)",
    body: (
      <>
        <h3 className="legal-h3">California (CCPA / CPRA)</h3>
        <p>
          California residents have the right to know the categories and
          specific pieces of personal information collected about them in
          the past twelve months, the categories of sources, the
          categories of recipients with whom the information has been
          shared, and the business or commercial purposes for collecting
          or sharing it; the right to delete; the right to correct; the
          right to limit the use of sensitive personal information; and
          the right to opt out of any &ldquo;sale&rdquo; or
          &ldquo;sharing&rdquo; of personal information. We do not sell
          or share personal information as those terms are defined under
          California law. To exercise these rights, contact{" "}
          <a href="mailto:privacy@quantiliom.ai">privacy@quantiliom.ai</a>.
          You may also designate an authorised agent in accordance with
          California law.
        </p>

        <h3 className="legal-h3">United Kingdom</h3>
        <p>
          For data subjects in the United Kingdom, references to the
          GDPR in this Policy include the UK GDPR and the Data
          Protection Act 2018. The Information Commissioner&rsquo;s
          Office is the relevant supervisory authority.
        </p>

        <h3 className="legal-h3">Brazil (LGPD)</h3>
        <p>
          Brazilian data subjects have rights under the Lei Geral de
          Proteção de Dados Pessoais (LGPD), including the rights of
          confirmation, access, correction, anonymisation, portability,
          deletion, and information about the public and private entities
          with which we have shared their data. Our legal bases under
          the LGPD mirror those described in{" "}
          <a href="#legal-bases">Legal bases (GDPR)</a>. To exercise
          these rights, contact{" "}
          <a href="mailto:privacy@quantiliom.ai">privacy@quantiliom.ai</a>.
        </p>

        <h3 className="legal-h3">Türkiye (KVKK)</h3>
        <p>
          Under Kişisel Verileri Koruma Kanunu No.&nbsp;6698, you have
          rights of access, rectification, erasure, and objection, and
          may complain to the Kişisel Verileri Koruma Kurumu. Requests
          may be submitted in Turkish or English to{" "}
          <a href="mailto:kvkk@quantiliom.ai">kvkk@quantiliom.ai</a>.
        </p>

        <h3 className="legal-h3">Other jurisdictions</h3>
        <p>
          If you reside in a jurisdiction with comprehensive data
          protection laws not specifically called out above (such as
          Canada&rsquo;s PIPEDA, Australia&rsquo;s Privacy Act, or the
          Swiss FADP), the rights granted under those laws apply to you
          and may be exercised through the same contact channels.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    body: (
      <>
        <p>
          We use a small number of strictly necessary cookies and browser
          storage entries to keep you signed in, persist UI preferences,
          and remember dashboard state across navigations. We also use a
          session cookie set by Firebase Authentication for the
          cross-origin auth handoff between the marketing site and the
          dashboard.
        </p>
        <p>
          Categories we use:
        </p>
        <ul>
          <li>
            <strong>Strictly necessary</strong> — required to deliver
            the Service (authentication, security, load balancing).
            These cannot be disabled without breaking sign-in.
          </li>
          <li>
            <strong>Functional</strong> — remember UI preferences (theme,
            sidebar state, last route).
          </li>
          <li>
            <strong>Analytics and performance</strong> — measure
            aggregate usage, performance, and error rates. Set only on
            the public website and only with consent where required by
            law.
          </li>
          <li>
            <strong>Marketing</strong> — we currently do not set any
            third-party marketing cookies. If that changes we will
            update this Policy and request consent before setting them.
          </li>
        </ul>
        <p>
          Where required by law, we ask for your consent before setting
          non-essential cookies through a cookie banner on first visit,
          and we respect the <code>Sec-GPC</code> Global Privacy Control
          signal and any browser Do-Not-Track signal you send.
        </p>
        <p>
          You can clear cookies and local storage from your browser at
          any time; doing so will sign you out and reset UI preferences.
          Most browsers also let you block cookies entirely; some
          functionality of the Service will not work in that case.
        </p>
      </>
    ),
  },
  {
    id: "marketing",
    title: "Marketing communications",
    body: (
      <p>
        With your consent (or under the &ldquo;soft opt-in&rdquo;
        permitted by law for existing Customers in some jurisdictions),
        we may send you product news, tips, and offers. Every marketing
        email contains an unsubscribe link, and you can manage
        preferences at any time from Account &rarr; Notifications. We
        keep a suppression list of email addresses that have opted out
        and will not contact you for marketing purposes after you opt
        out, even if we lose the underlying Account record.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        The Service is not directed to children under 16, and we do not
        knowingly collect personal data from them. We comply with the
        U.S. Children&rsquo;s Online Privacy Protection Act (COPPA) by
        not knowingly collecting personal data from children under 13. If
        you believe a child has submitted personal data to us, please
        email{" "}
        <a href="mailto:privacy@quantiliom.ai">privacy@quantiliom.ai</a>{" "}
        and we will delete it promptly.
      </p>
    ),
  },
  {
    id: "automated-decisions",
    title: "Automated decisions and profiling",
    body: (
      <>
        <p>
          We do not use your personal data for solely automated decisions
          that produce legal or similarly significant effects on you
          within the meaning of Article&nbsp;22 GDPR. The AI Outputs we
          generate are suggestions to support your work, not automated
          decisions about you.
        </p>
        <p>
          We perform limited automated processing for the purposes of
          security (e.g., detecting credential-stuffing attempts), abuse
          prevention, and personalising the experience based on your
          onboarding answers. None of these has a legal or similarly
          significant effect on you. If we change that in the future, we
          will update this section and provide the safeguards required by
          law.
        </p>
      </>
    ),
  },
  {
    id: "dpia",
    title: "Privacy by design and DPIAs",
    body: (
      <p>
        We apply privacy-by-design and privacy-by-default principles to
        the Service. We carry out Data Protection Impact Assessments
        (DPIAs) for new features that involve high-risk processing — for
        example, integrating a new Model Provider that processes Customer
        Content in a new region, or introducing features that profile
        users in any non-trivial way. Where a DPIA identifies residual
        high risk that cannot be mitigated, we consult the relevant
        supervisory authority before proceeding.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this Policy",
    body: (
      <p>
        We may update this Privacy Policy from time to time. The
        &ldquo;Last updated&rdquo; date at the top of the page reflects
        the most recent revision. If a change is material, we will
        notify active users by email or in-product banner at least 14
        days before it takes effect. For non-material clarifications, we
        may update the Policy without prior notice and will reflect the
        change in the &ldquo;Last updated&rdquo; date. Prior versions
        are available on request from{" "}
        <a href="mailto:privacy@quantiliom.ai">privacy@quantiliom.ai</a>.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <>
        <p>
          For any privacy-related question or to exercise your rights,
          write to{" "}
          <a href="mailto:privacy@quantiliom.ai">privacy@quantiliom.ai</a>.
          For Türkiye-specific KVKK requests, use{" "}
          <a href="mailto:kvkk@quantiliom.ai">kvkk@quantiliom.ai</a>.
          Our Data Protection Officer can be reached directly at{" "}
          <a href="mailto:dpo@quantiliom.ai">dpo@quantiliom.ai</a>.
        </p>
        <p>
          For general legal questions see our{" "}
          <a href="#terms">Terms of Service</a> or contact{" "}
          <a href="mailto:legal@quantiliom.ai">legal@quantiliom.ai</a>.
          For security disclosures use{" "}
          <a href="mailto:security@quantiliom.ai">security@quantiliom.ai</a>.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      effectiveDate={EFFECTIVE_DATE}
      lastUpdated={LAST_UPDATED}
      intro={
        <>
          <p>
            This Privacy Policy explains how Quantiliom AI handles
            personal data when you visit our website, sign up for an
            Account, complete onboarding, use the AI Software Architect
            platform, contact our support team, or interact with our
            marketing channels. We try to keep it short without dropping
            anything load-bearing.
          </p>
          <p>
            <strong>The short version.</strong> We collect the minimum
            personal data needed to run the Service. We use trusted
            sub-processors under formal data-processing agreements. We
            never sell your data and we do not &ldquo;share&rdquo; it for
            cross-context advertising. We do not train AI models on the
            Customer Content of paid plans. We encrypt data in transit
            and at rest, apply least-privilege access, and notify you and
            the supervisory authorities of qualifying breaches within the
            statutory windows.
          </p>
          <p>
            The long version follows, organised by topic. Use the Table
            of Contents on the right to jump to a section, or read it
            top to bottom — we have tried to order the sections by what
            most people want to know first.
          </p>
        </>
      }
      sections={sections}
      siblingHref="#terms"
      siblingLabel="Terms of Service"
    />
  );
}
