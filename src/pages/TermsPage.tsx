import LegalLayout, { type LegalSection } from "../components/LegalLayout";

const EFFECTIVE_DATE = "June 17, 2026";
const LAST_UPDATED = "June 17, 2026";

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these Terms",
    body: (
      <>
        <p>
          These Terms of Service (the &ldquo;Terms&rdquo;) form a binding
          agreement between you (&ldquo;you&rdquo; or the &ldquo;Customer&rdquo;)
          and Quantiliom AI (&ldquo;Quantiliom&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;, or &ldquo;our&rdquo;) and govern your access to and
          use of the Quantiliom AI software-as-a-service platform, including the
          dashboard, public website, APIs, AI-generated outputs, documentation,
          and any related services we make available (collectively, the
          &ldquo;Service&rdquo;).
        </p>
        <p>
          By creating an account, clicking &ldquo;Sign up&rdquo;, signing in
          through a federated identity provider, accepting an invitation to a
          shared workspace, calling our API with a valid credential, or
          otherwise using any part of the Service, you confirm that you have
          read, understood, and agreed to be bound by these Terms and by our{" "}
          <a href="#privacy">Privacy Policy</a>. If you do not agree, do not
          create an account, do not click through any acceptance flow, and stop
          using the Service.
        </p>
        <p>
          If you are accepting these Terms on behalf of a company, organization,
          government body, or other legal entity, you represent and warrant that
          you have the authority to bind that entity, and the words
          &ldquo;you&rdquo;, &ldquo;your&rdquo;, and &ldquo;Customer&rdquo;
          refer to that entity. If you do not have that authority, you must not
          accept these Terms and must not use the Service on the entity&rsquo;s
          behalf.
        </p>
        <p>
          We may publish additional product-specific or plan-specific terms
          (collectively, &ldquo;Supplemental Terms&rdquo;) for individual
          features, integrations, beta programs, or higher-tier plans. Those
          Supplemental Terms are incorporated into these Terms by reference and,
          to the extent of any conflict, control with respect to that specific
          feature.
        </p>
      </>
    ),
  },
  {
    id: "definitions",
    title: "Definitions",
    body: (
      <>
        <p>
          Capitalised terms used in these Terms have the meanings set out below.
          Other terms defined inline have the meaning given to them where they
          first appear.
        </p>
        <ul>
          <li>
            <strong>&ldquo;Account&rdquo;</strong> means the credentialed
            user record we create when you sign up, including your profile,
            plan, subscription status, and onboarding answers.
          </li>
          <li>
            <strong>&ldquo;Affiliate&rdquo;</strong> means any entity that
            controls, is controlled by, or is under common control with a
            party, where &ldquo;control&rdquo; means ownership of more than
            fifty percent (50%) of the voting interests.
          </li>
          <li>
            <strong>&ldquo;Authorised User&rdquo;</strong> means an individual
            you (as a Customer on a Team plan) invite to your workspace and
            who accepts the invitation.
          </li>
          <li>
            <strong>&ldquo;Customer Content&rdquo;</strong> means all
            materials you (or any Authorised User) submit to the Service,
            including prompts, project briefs, configuration files,
            attachments, and metadata.
          </li>
          <li>
            <strong>&ldquo;Documentation&rdquo;</strong> means the help
            articles, API reference, and in-product guidance we publish for
            the Service from time to time.
          </li>
          <li>
            <strong>&ldquo;Model Providers&rdquo;</strong> means the
            third-party providers of large language models and related
            machine-learning services that we use to generate Outputs.
          </li>
          <li>
            <strong>&ldquo;Order&rdquo;</strong> means any plan selection,
            renewal, in-product checkout, or written order form between you
            and us that references these Terms.
          </li>
          <li>
            <strong>&ldquo;Outputs&rdquo;</strong> means the AI-generated
            artefacts the Service produces in response to Customer Content,
            including but not limited to architecture briefs, stack
            recommendations, system diagrams, README outlines, cost
            estimates, prose explanations, and code snippets.
          </li>
          <li>
            <strong>&ldquo;Subscription Term&rdquo;</strong> means the
            initial paid period and any renewal periods of your paid plan.
          </li>
          <li>
            <strong>&ldquo;Workspace&rdquo;</strong> means a logical
            container we create for a Team-plan Customer, into which
            Authorised Users may be invited.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility and accounts",
    body: (
      <>
        <p>
          You must be at least 16 years old (or the age of digital consent in
          your jurisdiction, whichever is higher) to create an Account. The
          Service is not directed to children under that age, and we do not
          knowingly collect personal data from them. If we learn that an
          Account belongs to someone below the eligible age, we will close it
          and delete the associated data, subject to our retention obligations.
        </p>
        <p>
          You must not use the Service if you are subject to economic sanctions
          or trade restrictions imposed by the United Nations, the European
          Union, the United Kingdom, the United States (including those
          maintained by the Office of Foreign Assets Control), or the Republic
          of Türkiye, or if you are located in, ordinarily resident in, or
          organised under the laws of a country or territory subject to
          comprehensive sanctions. See{" "}
          <a href="#sanctions">Sanctions and export control</a>.
        </p>
        <p>
          You are responsible for the credentials used to access your Account,
          including any password or third-party identity (Google, GitHub,
          Microsoft). You must use a strong password, enable two-factor
          authentication where available with your identity provider, keep
          your credentials confidential, and notify us promptly at{" "}
          <a href="mailto:security@quantiliom.ai">security@quantiliom.ai</a>{" "}
          if you suspect unauthorized use. You are responsible for all
          activity that occurs through your Account, except activity caused by
          our breach of these Terms.
        </p>
        <p>
          Account information you provide — including your name, email
          address, organisation, role, technical level, and project context —
          must be accurate, complete, and kept up to date. We may suspend or
          close Accounts that contain materially false information, that
          impersonate another person or entity, or that we reasonably believe
          to have been created to evade a prior termination.
        </p>
        <p>
          Each Account is for a single individual. You must not share login
          credentials. If your workspace needs multiple people, use the Team
          plan and invite each person as an Authorised User. See{" "}
          <a href="#team-accounts">Team accounts and Authorised Users</a>.
        </p>
      </>
    ),
  },
  {
    id: "team-accounts",
    title: "Team accounts and Authorised Users",
    body: (
      <>
        <p>
          On the Team plan, you may invite individuals as Authorised Users to
          collaborate in your Workspace. Each Authorised User must accept
          these Terms in their own capacity before using the Service. You
          remain responsible for the acts and omissions of every Authorised
          User in your Workspace and for ensuring they comply with these
          Terms.
        </p>
        <p>
          The Workspace administrator (the &ldquo;Admin&rdquo;) may add and
          remove Authorised Users, change billing details, view aggregate
          usage, manage Workspace-wide settings, and access content created
          inside the Workspace. By inviting someone to your Workspace, you
          confirm that you have the authority and legal basis to give them
          access to that content.
        </p>
        <p>
          You are responsible for paying for the number of seats reflected on
          your plan. If you exceed your seat count, we may either provision
          additional seats and invoice you on a prorated basis or restrict
          new invitations until you upgrade. You may downgrade seat count at
          renewal; mid-cycle downgrades do not generate refunds.
        </p>
      </>
    ),
  },
  {
    id: "license",
    title: "Licence to use the Service",
    body: (
      <>
        <p>
          Subject to your compliance with these Terms and payment of all
          applicable fees, Quantiliom grants you a limited, non-exclusive,
          non-transferable, non-sublicensable, revocable right during the
          Subscription Term to access and use the Service and the
          Documentation solely for your internal business or personal use.
        </p>
        <p>
          Except as expressly permitted, you must not, and must not permit
          any Authorised User or third party to:
        </p>
        <ul>
          <li>
            copy, modify, translate, or create derivative works of the
            Service or the Documentation;
          </li>
          <li>
            reverse-engineer, disassemble, decompile, or otherwise attempt to
            derive source code or underlying ideas from any non-open-source
            component of the Service, except to the limited extent the law
            permits;
          </li>
          <li>
            rent, lease, sell, resell, sublicense, or otherwise transfer
            access to the Service to any third party (including by means of a
            consumer-facing &ldquo;agent&rdquo; built on top of the Service)
            without our prior written consent;
          </li>
          <li>
            remove or obscure any copyright, trademark, or other proprietary
            notices appearing in the Service or the Outputs;
          </li>
          <li>
            use the Service to develop, train, fine-tune, evaluate, or
            benchmark a competing product or machine-learning model;
          </li>
          <li>
            use the Service in a way that exceeds reasonable volumetric
            limits, including by way of automated scripts, prompt-injection
            chains, or unattended bots designed to maximise consumption.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "plans-and-billing",
    title: "Plans, billing, and renewals",
    body: (
      <>
        <p>
          The Service is offered on a Free plan and on paid plans
          (&ldquo;Pro&rdquo; and &ldquo;Team&rdquo;). Plan inclusions, limits,
          and prices are described in the dashboard and in any applicable
          Order at the time of purchase and are incorporated into these Terms
          by reference. We may also offer custom or enterprise plans by
          separate written agreement.
        </p>
        <ul>
          <li>
            <strong>Free plan.</strong> Provided at no cost, subject to
            volumetric limits, feature gating, and the limitations described
            in <a href="#beta">Beta and preview features</a>. We may change
            Free-plan limits or sunset the Free plan entirely with reasonable
            advance notice.
          </li>
          <li>
            <strong>Paid plans.</strong> Billed monthly or annually in
            advance via our payment processor. Subscriptions renew
            automatically for successive periods of the same length unless
            cancelled before the renewal date. You authorize us, through our
            processor, to charge the payment method on file for each
            renewal, including any applicable taxes.
          </li>
          <li>
            <strong>Invoicing.</strong> Annual and enterprise customers may
            be invoiced. Invoices are due net thirty (30) days from issue
            unless your Order states otherwise. Overdue amounts accrue
            interest at the lesser of 1.5% per month or the maximum rate
            permitted by law.
          </li>
          <li>
            <strong>Taxes.</strong> Fees are exclusive of value-added tax,
            sales tax, withholding tax, and other applicable taxes or
            duties. Where we are required to collect them, they will be
            added to your invoice. You are responsible for any taxes
            attributable to your purchase, except for taxes on our net
            income.
          </li>
          <li>
            <strong>Refunds.</strong> Except where required by law, fees are
            non-refundable. We may, at our discretion, issue prorated
            refunds for verified service outages or duplicate charges. A
            cancellation does not generate a refund for unused time in the
            current billing period.
          </li>
          <li>
            <strong>Cancellation.</strong> You can cancel at any time from
            the Subscription page in the dashboard. Cancellation takes
            effect at the end of the current billing period; you retain
            access until then.
          </li>
          <li>
            <strong>Free trials.</strong> We may offer time-limited free
            trials of paid plans. Unless you cancel before the trial ends,
            the plan converts automatically to a paid subscription at the
            list price and is billed to your payment method on file.
          </li>
          <li>
            <strong>Promotional credits.</strong> Any credits or vouchers
            we issue are non-transferable, non-refundable, and expire as
            stated when issued. They cannot be redeemed for cash.
          </li>
        </ul>
        <p>
          If a charge fails, we may suspend paid features after a reasonable
          grace period and retry attempts. If we change pricing for an
          existing plan, we will give you at least thirty (30) days&rsquo;
          advance notice and the new price will apply from your next
          renewal. You may decline a price change by cancelling before the
          renewal effective date.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>
          You agree not to use the Service, and not to allow anyone using your
          Account to use the Service, to:
        </p>
        <ul>
          <li>
            violate any law, regulation, or third-party right (including
            intellectual-property, privacy, publicity, contract, and
            export-control rules);
          </li>
          <li>
            upload, generate, or distribute content that is unlawful,
            defamatory, harassing, hateful, threatening, infringing, or
            sexually explicit material involving minors;
          </li>
          <li>
            generate content intended to deceive others about its source,
            including non-consensual sexual imagery, non-consensual
            deepfakes, fabricated quotes attributed to real individuals, or
            disinformation designed to influence elections;
          </li>
          <li>
            attempt to probe, scan, reverse-engineer, decompile, or
            otherwise test the vulnerability of the Service, or bypass any
            security or access control;
          </li>
          <li>
            interact with the Service in a manner designed to extract the
            system prompts, fine-tuning data, weights, or other proprietary
            internals of the Service or its Model Providers;
          </li>
          <li>
            use the Service to build a competing product or to train,
            fine-tune, distil, or evaluate a competing machine-learning
            model;
          </li>
          <li>
            transmit malware, conduct denial-of-service attacks, or
            otherwise interfere with the integrity or performance of the
            Service;
          </li>
          <li>
            scrape, harvest, or systematically extract data from the
            Service beyond what our published APIs permit;
          </li>
          <li>
            submit content that includes payment-card numbers, government
            IDs, biometric identifiers, exact geolocation, or sensitive
            personal data described in Article&nbsp;9 GDPR unless
            explicitly enabled by a separate written agreement;
          </li>
          <li>
            generate or facilitate the creation of weapons (chemical,
            biological, radiological, nuclear, or cyber), instructions for
            attacks on critical infrastructure, or any other content whose
            primary purpose is to cause serious physical or systemic harm;
          </li>
          <li>
            use the Service to make consequential, automated decisions
            about people (such as employment, credit, housing, insurance,
            healthcare, or law enforcement decisions) without independent
            human review;
          </li>
          <li>
            represent that AI-generated content is solely human-authored
            where doing so would mislead or violate disclosure obligations.
          </li>
        </ul>
        <p>
          We may investigate suspected violations and may suspend or
          terminate Accounts that breach this section, with or without prior
          notice when required to protect the Service, other users, or
          third parties. Where we suspend an Account for suspected breach,
          we will, where it is lawful and operationally safe to do so, give
          you the opportunity to cure within a reasonable period.
        </p>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content and prompts",
    body: (
      <>
        <p>
          You retain all rights in the project briefs, prompts, configuration,
          attachments, and other materials you submit to the Service (your
          &ldquo;Customer Content&rdquo;). You grant Quantiliom a worldwide,
          non-exclusive, royalty-free licence to host, copy, transmit,
          process, display, and create derivative works from your Customer
          Content solely to operate, maintain, secure, support, troubleshoot,
          and improve the Service for you, and to perform our obligations
          under these Terms. This licence ends when you delete the relevant
          Customer Content, subject to a short technical wind-down for
          backups and operational logs as described in our{" "}
          <a href="#privacy">Privacy Policy</a>.
        </p>
        <p>
          We do not use Customer Content from paid plans (Pro, Team) to
          train Quantiliom or third-party foundation models. For Free-plan
          Accounts, we may use de-identified, aggregated telemetry derived
          from your prompts to improve heuristics, ranking, retrieval, and
          general product quality. You can opt out of telemetry-based
          product improvement at any time from Account &rarr; Privacy.
        </p>
        <p>
          You represent and warrant that you have all rights, licences, and
          consents necessary to submit your Customer Content to the Service,
          that doing so does not violate any law or any third party&rsquo;s
          rights (including privacy, publicity, and intellectual-property
          rights), and that your Customer Content does not contain content
          you have agreed to keep confidential to a third party unless that
          third party has approved its use here.
        </p>
        <p>
          You are responsible for maintaining your own backups of Customer
          Content. We are not obliged to provide restore services beyond
          what is described in <a href="#availability">Availability</a> and
          we may delete Customer Content as described in{" "}
          <a href="#term-and-termination">Suspension and termination</a>.
        </p>
      </>
    ),
  },
  {
    id: "ai-outputs",
    title: "AI-generated outputs",
    body: (
      <>
        <p>
          The Service produces software-architecture artefacts —
          including stack recommendations, system diagrams, project
          briefs, README outlines, cost estimates, prose explanations, and
          code snippets (collectively, &ldquo;Outputs&rdquo;) — using
          large language models and other machine-learning systems, some
          operated by third-party Model Providers.
        </p>
        <p>
          As between you and Quantiliom, and to the extent permitted by
          applicable law, you own the Outputs generated for your Account,
          subject to (a) the rights of the underlying Model Providers in
          their model weights and any safety/system prompts, (b) any
          open-source or third-party licences embedded in the Outputs, and
          (c) the limited licence-back to us described below for service
          operation.
        </p>
        <p>
          You acknowledge that:
        </p>
        <ul>
          <li>
            AI Outputs may be incomplete, outdated, or factually
            incorrect; may hallucinate APIs, libraries, or facts that do
            not exist; and may inadvertently echo open-source code,
            documentation, or text from public sources;
          </li>
          <li>
            similar prompts from different users may produce similar or
            identical Outputs, so Outputs are not necessarily unique to
            you and we cannot guarantee non-overlap with content
            generated for other Customers;
          </li>
          <li>
            Outputs do not constitute professional advice (legal,
            financial, medical, engineering safety-critical, accessibility
            compliance, or otherwise) and must be independently verified
            before deployment, publication, or use in a regulated context;
          </li>
          <li>
            you are responsible for ensuring Outputs comply with the
            licences, export controls, accessibility standards, and
            policies that apply to the technologies they reference;
          </li>
          <li>
            you must not represent Outputs as solely human-authored where
            doing so would mislead or violate disclosure obligations of
            your industry, your platform, or your jurisdiction;
          </li>
          <li>
            we and our Model Providers may run automated safety and
            policy filters on prompts and Outputs and may decline to
            generate content that triggers those filters.
          </li>
        </ul>
        <p>
          You grant us a worldwide, royalty-free licence to retain and use
          Outputs solely (i) to deliver them to you, (ii) to monitor for
          safety, abuse, and policy compliance, and (iii) where you have
          consented or are on the Free plan, in de-identified and
          aggregated form to improve the Service.
        </p>
      </>
    ),
  },
  {
    id: "our-ip",
    title: "Our intellectual property",
    body: (
      <>
        <p>
          The Service, including its software, the dashboard UI, the
          marketing website, the prompt-engineering pipelines, the retrieval
          and ranking systems, the Documentation, the
          &ldquo;Quantiliom&rdquo; and &ldquo;Quantiliom AI&rdquo; names
          and logos, and all related intellectual-property rights, are
          owned by Quantiliom or its licensors. Except for the limited
          rights expressly granted in these Terms, no rights are
          transferred to you.
        </p>
        <p>
          You may not (and may not permit anyone to) copy, modify,
          distribute, sell, sublicense, or create derivative works of the
          Service or its software, except as expressly permitted by these
          Terms or by an applicable open-source licence.
        </p>
        <p>
          The Service incorporates open-source components, each governed by
          its own licence. A current notice file is available on request
          from <a href="mailto:legal@quantiliom.ai">legal@quantiliom.ai</a>.
          Nothing in these Terms restricts your rights under any applicable
          open-source licence with respect to those components.
        </p>
      </>
    ),
  },
  {
    id: "feedback",
    title: "Feedback",
    body: (
      <p>
        If you send us suggestions, ideas, bug reports, prompt-improvement
        suggestions, or other feedback about the Service, you grant us a
        perpetual, irrevocable, worldwide, royalty-free, sublicensable
        licence to use that feedback for any purpose without compensation
        or attribution. You waive any moral rights in that feedback to the
        extent permitted by law. Nothing in this section obliges us to use
        any feedback you send.
      </p>
    ),
  },
  {
    id: "beta",
    title: "Beta and preview features",
    body: (
      <>
        <p>
          We may make pre-release, alpha, beta, preview, experimental, or
          &ldquo;labs&rdquo; features available to you from time to time
          (collectively, &ldquo;Beta Features&rdquo;). Beta Features are
          provided for evaluation, may be unstable, and may be modified,
          throttled, or discontinued at any time without notice.
        </p>
        <p>
          Beta Features are provided &ldquo;as is&rdquo; and without
          warranty of any kind. Service-level commitments do not apply to
          Beta Features. We may collect additional telemetry from your use
          of Beta Features (described where you opt in) to evaluate and
          improve them.
        </p>
        <p>
          You will treat any non-public information about Beta Features as
          confidential and will not disclose it to any third party without
          our written consent.
        </p>
      </>
    ),
  },
  {
    id: "api-and-rate-limits",
    title: "API access and rate limits",
    body: (
      <>
        <p>
          We may make API endpoints available to Pro and Team customers for
          programmatic access to the Service. Your use of the API is subject
          to these Terms and to any additional API documentation we publish.
        </p>
        <p>
          You must (a) keep your API keys secret and rotate them if you
          suspect compromise, (b) attribute the source when displaying or
          forwarding Outputs returned by the API, and (c) respect any rate
          limits, concurrency limits, payload-size limits, and feature flags
          published in the Documentation. We may apply additional limits to
          prevent abuse, protect Service stability, or comply with
          Model-Provider terms.
        </p>
        <p>
          We may throttle, suspend, or revoke API access if your usage
          materially degrades the Service for other Customers, if a
          Model-Provider revokes underlying capacity, if we detect signs of
          credential compromise, or if you breach these Terms. Where it is
          reasonable to do so, we will notify you before doing so.
        </p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Third-party services and integrations",
    body: (
      <>
        <p>
          The Service depends on third-party providers, including identity
          providers (Google, GitHub, Microsoft), our infrastructure host,
          our payment processor, our transactional-email provider, and the
          underlying Model Providers. Their availability, terms, and
          privacy practices are outside our control.
        </p>
        <p>
          When you sign in with a federated identity provider, connect a
          repository, link a calendar, or otherwise enable a third-party
          integration, you also agree to that provider&rsquo;s terms and
          authorise us to exchange data with them as needed to operate the
          integration. We are not responsible for the acts or omissions of
          any third-party provider, and outages, defects, or breaches on
          their side may temporarily affect or limit the Service.
        </p>
        <p>
          We may enable or remove third-party integrations at our
          discretion. If a third-party integration is discontinued because
          the underlying provider changes their terms or API, we will give
          you reasonable advance notice where possible.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and support",
    body: (
      <>
        <p>
          We aim to keep the Service available with high uptime, but we do
          not guarantee uninterrupted operation on the Free plan. Paid
          plans target a monthly Service availability of 99.5% (Pro) and
          99.9% (Team), excluding scheduled maintenance and circumstances
          described in <a href="#force-majeure">Force majeure</a>. Our
          measurement methodology and any remedy credits are described in
          the in-product Subscription page or in an applicable Order.
        </p>
        <p>
          We may perform scheduled maintenance from time to time, normally
          outside Central European business hours, and may perform
          emergency maintenance at any time. We will use reasonable
          efforts to give advance notice in the dashboard before scheduled
          maintenance.
        </p>
        <p>
          Support is provided by email and in-product chat. Response-time
          targets, support hours, and channels available to you depend on
          your plan and are described on the Subscription page.
        </p>
      </>
    ),
  },
  {
    id: "data-export",
    title: "Data export and portability",
    body: (
      <p>
        You may export your Customer Content and a copy of recently
        generated Outputs from the Account page at any time during your
        Subscription Term. After termination, you may request an export
        within thirty (30) days of the end of the Subscription Term; we
        will provide it in a structured, commonly used, machine-readable
        format. After that window, exports may no longer be available
        because the underlying data may have been deleted in accordance
        with our retention schedule.
      </p>
    ),
  },
  {
    id: "confidentiality",
    title: "Confidentiality",
    body: (
      <>
        <p>
          &ldquo;Confidential Information&rdquo; means non-public
          information disclosed by one party (the &ldquo;Discloser&rdquo;)
          to the other (the &ldquo;Recipient&rdquo;) that is identified as
          confidential or that, given its nature and the circumstances of
          disclosure, a reasonable person would understand to be
          confidential. Confidential Information includes Customer Content,
          Outputs, Beta Features information, security findings,
          non-public pricing, and product roadmap information.
        </p>
        <p>
          The Recipient will (a) use the Discloser&rsquo;s Confidential
          Information only to perform under these Terms, (b) protect it
          using at least the same degree of care it uses for its own
          comparable information, and never less than a reasonable degree
          of care, and (c) not disclose it to any third party except to
          Affiliates, employees, contractors, and advisers who have a need
          to know and are bound by confidentiality obligations at least as
          protective as those in this section.
        </p>
        <p>
          Confidentiality obligations do not apply to information that
          (i) is or becomes generally available to the public through no
          fault of the Recipient, (ii) was already in the Recipient&rsquo;s
          possession without confidentiality obligations, (iii) is
          rightfully obtained by the Recipient from a third party without
          confidentiality obligations, or (iv) is independently developed
          by the Recipient without use of the Discloser&rsquo;s
          Confidential Information. The Recipient may disclose Confidential
          Information if required by law or court order, provided it gives
          the Discloser prompt notice (where lawful) and reasonable
          assistance to seek protective treatment.
        </p>
      </>
    ),
  },
  {
    id: "dmca",
    title: "Copyright complaints (DMCA)",
    body: (
      <>
        <p>
          We respect intellectual-property rights and will respond to
          notices of alleged copyright infringement that comply with the
          U.S. Digital Millennium Copyright Act (DMCA) and equivalent
          legislation. If you believe your copyright has been infringed on
          the Service, send a written notice to{" "}
          <a href="mailto:copyright@quantiliom.ai">copyright@quantiliom.ai</a>{" "}
          containing:
        </p>
        <ul>
          <li>
            a physical or electronic signature of a person authorised to
            act on behalf of the copyright owner;
          </li>
          <li>
            identification of the copyrighted work claimed to have been
            infringed;
          </li>
          <li>
            identification of the allegedly infringing material and
            information sufficient to locate it within the Service;
          </li>
          <li>your contact information (address, telephone, email);</li>
          <li>
            a statement that you have a good-faith belief that the
            disputed use is not authorised by the copyright owner, its
            agent, or the law;
          </li>
          <li>
            a statement, under penalty of perjury, that the information
            is accurate and that you are authorised to act for the
            copyright owner.
          </li>
        </ul>
        <p>
          We may remove or disable access to material claimed to be
          infringing and may terminate the Accounts of repeat infringers.
        </p>
      </>
    ),
  },
  {
    id: "sanctions",
    title: "Sanctions and export control",
    body: (
      <p>
        You may not export, re-export, or transfer the Service, the
        Documentation, Customer Content, or Outputs (a) to any country,
        territory, person, or entity that is the target of comprehensive
        economic sanctions or export controls administered by the United
        Nations, the European Union, the United Kingdom, the United States
        (including by OFAC, the U.S. Department of Commerce, or the U.S.
        Department of State), or the Republic of Türkiye, or (b) for any
        end-use prohibited by applicable export-control laws (including
        any end-use related to weapons of mass destruction, missile
        systems, or military intelligence end uses in certain
        destinations). You represent that you are not on any restricted
        party list and that you will not use the Service in violation of
        these laws.
      </p>
    ),
  },
  {
    id: "anti-bribery",
    title: "Anti-bribery and anti-corruption",
    body: (
      <p>
        Each party will comply with all applicable anti-bribery and
        anti-corruption laws (including the U.S. Foreign Corrupt Practices
        Act, the U.K. Bribery Act 2010, and equivalent local laws) and
        will not, directly or indirectly, offer, give, or accept any
        bribe, kickback, or other improper payment in connection with the
        Service or these Terms.
      </p>
    ),
  },
  {
    id: "publicity",
    title: "Publicity and trademark use",
    body: (
      <p>
        Unless you opt out by emailing{" "}
        <a href="mailto:legal@quantiliom.ai">legal@quantiliom.ai</a>, we may
        list your name and logo as a Customer on our website and in
        general marketing materials, in a manner consistent with any
        brand guidelines you provide. Beyond that, neither party may use
        the other&rsquo;s trademarks, logos, or product names without
        prior written consent. Press releases referencing the other party
        require written consent.
      </p>
    ),
  },
  {
    id: "term-and-termination",
    title: "Suspension and termination",
    body: (
      <>
        <p>
          These Terms remain in effect for as long as you have an Account.
          You may close your Account at any time from Account &rarr; Delete
          account. We may suspend or terminate your Account if (a) you
          materially breach these Terms and do not cure that breach within
          fifteen (15) days of our written notice, (b) you present a
          security risk to the Service or to other users, (c) you fail to
          pay fees when due and do not cure within ten (10) days of our
          written notice, (d) any required licence or right we need to
          provide the Service is terminated, or (e) we are required to do
          so by law.
        </p>
        <p>
          We may also terminate or suspend access without prior notice in
          response to (i) ongoing security incidents, (ii) a credible
          threat of imminent harm to the Service or third parties, or
          (iii) a binding order from a competent authority.
        </p>
        <p>
          Upon termination, your right to access the Service ends, all
          outstanding fees become immediately payable, and we may delete
          your Customer Content after a reasonable wind-down period as
          described in our <a href="#privacy">Privacy Policy</a>. Sections
          that by their nature should survive termination (including
          definitions, intellectual property, confidentiality, disclaimers,
          limitation of liability, indemnity, governing law, and these
          survival clauses) will survive.
        </p>
      </>
    ),
  },
  {
    id: "warranties",
    title: "Disclaimer of warranties",
    body: (
      <>
        <p className="legal-allcaps">
          Except where prohibited by law, the Service, the Documentation,
          and the Outputs are provided on an &ldquo;as is&rdquo; and
          &ldquo;as available&rdquo; basis. Quantiliom and its licensors
          disclaim all warranties, whether express, implied, statutory, or
          otherwise, including any implied warranties of merchantability,
          fitness for a particular purpose, non-infringement, title,
          accuracy, quiet enjoyment, system integration, and freedom from
          interruption or defects. We do not warrant that the Service will
          be uninterrupted, error-free, or completely secure, or that
          Outputs will be accurate, complete, lawful, or suitable for any
          particular use.
        </p>
        <p>
          Some jurisdictions do not allow the exclusion of implied
          warranties, so some of the above exclusions may not apply to you.
          In those jurisdictions, the disclaimers apply to the maximum
          extent permitted by law.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <p className="legal-allcaps">
          To the maximum extent permitted by law, Quantiliom and its
          Affiliates, officers, employees, agents, and licensors will not
          be liable for any indirect, incidental, special, consequential,
          exemplary, or punitive damages, or for any loss of profits,
          revenue, goodwill, anticipated savings, data, business
          opportunity, reputational harm, or substitute-service costs,
          arising out of or relating to the Service, the Outputs, or these
          Terms, even if we have been advised of the possibility of such
          damages and even if a limited remedy fails of its essential
          purpose.
        </p>
        <p className="legal-allcaps">
          Our aggregate liability arising out of or relating to the
          Service, the Outputs, or these Terms is limited to the greater
          of (a) the fees you paid to us for the Service in the twelve (12)
          months preceding the event giving rise to the claim, or (b) one
          hundred U.S. dollars (USD&nbsp;100).
        </p>
        <p>
          Nothing in these Terms limits liability that cannot be limited
          under applicable law, including liability for fraud, willful
          misconduct, gross negligence (where such limitation is
          prohibited), or death or personal injury caused by negligence.
        </p>
        <p>
          The parties agree that the limitations in this section are an
          essential element of the bargain and reflect a reasonable
          allocation of risk between them, including in light of the
          probabilistic nature of AI-generated Outputs and the inability
          of either party to fully control the third-party Model
          Providers.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnification",
    body: (
      <>
        <p>
          You will indemnify, defend, and hold harmless Quantiliom and its
          Affiliates, officers, employees, and agents from and against any
          third-party claim, demand, loss, damage, cost, or expense
          (including reasonable legal fees) arising out of (a) your
          Customer Content, (b) your use of the Service in violation of
          these Terms or applicable law, (c) your distribution or
          deployment of Outputs without the verification described in{" "}
          <a href="#ai-outputs">AI-generated outputs</a>, or (d) your
          breach of any of your representations or warranties in these
          Terms.
        </p>
        <p>
          We will defend you against any third-party claim alleging that
          the Service, when used by you in accordance with these Terms,
          infringes that third party&rsquo;s intellectual-property rights,
          and we will pay any damages finally awarded against you (or any
          settlement we approve) for that claim, provided you (i) give us
          prompt written notice of the claim, (ii) give us sole control of
          the defence and settlement, and (iii) provide reasonable
          cooperation. This defence obligation does not apply to claims
          arising from (1) modifications to the Service we did not
          authorise, (2) combinations of the Service with materials not
          provided by us, or (3) your Customer Content. If a claim is made
          or appears likely, we may, at our option, (A) procure the right
          for you to continue using the Service, (B) modify the Service
          to be non-infringing without material loss of functionality, or
          (C) terminate the affected Subscription Term and refund any
          pre-paid, unused fees. This section sets out our entire liability
          and your sole remedy for third-party infringement claims.
        </p>
      </>
    ),
  },
  {
    id: "force-majeure",
    title: "Force majeure",
    body: (
      <p>
        Neither party will be liable for any delay or failure in
        performance (other than payment obligations) to the extent caused
        by events beyond its reasonable control, including acts of God,
        natural disasters, pandemics, wars, terrorism, civil unrest, labour
        disputes, government actions, network or power failures, denial-
        of-service attacks, or failures of upstream providers (including
        Model Providers and hosting providers). The affected party will
        give prompt notice and resume performance as soon as reasonably
        practicable.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to the Service or these Terms",
    body: (
      <p>
        We may modify the Service at any time — adding, removing, or
        changing features — and may update these Terms when our product,
        pricing, or legal environment changes. If a change is material, we
        will notify active users by email or in-product banner at least
        fourteen (14) days before it takes effect. Your continued use of
        the Service after the effective date constitutes acceptance of the
        updated Terms. If you do not agree, you may cancel your Account
        before the effective date and the prior version will continue to
        govern your use of the Service until termination. For non-material
        changes (typographical fixes, clarifications, broken-link
        corrections) we may update the Terms without advance notice and
        will reflect the change in the &ldquo;Last updated&rdquo; date.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law and disputes",
    body: (
      <>
        <p>
          These Terms are governed by the laws of the Republic of Türkiye,
          without regard to its conflict-of-law rules. The courts and
          enforcement offices of Istanbul (Çağlayan) have exclusive
          jurisdiction over any dispute arising out of or relating to
          these Terms or the Service, except that nothing prevents either
          party from seeking injunctive or other equitable relief in any
          competent court to protect its intellectual-property or
          confidential information rights.
        </p>
        <p>
          Before initiating formal proceedings, the parties will attempt
          to resolve the dispute in good faith through written notice and
          discussion between authorised representatives for at least
          thirty (30) days, unless the matter requires immediate injunctive
          relief. Neither party will participate in any class, collective,
          or representative action against the other to the extent
          permitted by law.
        </p>
      </>
    ),
  },
  {
    id: "notices",
    title: "Notices",
    body: (
      <p>
        Notices to you may be given by email to the address associated
        with your Account or by posting in the dashboard, and are deemed
        received when sent or posted. Notices to us must be sent by email
        to{" "}
        <a href="mailto:legal@quantiliom.ai">legal@quantiliom.ai</a>, with
        a courtesy copy by registered post to our registered office (we
        will provide the address on request), and are deemed received on
        the date of delivery confirmation. You are responsible for keeping
        your contact details accurate.
      </p>
    ),
  },
  {
    id: "miscellaneous",
    title: "Miscellaneous",
    body: (
      <>
        <p>
          These Terms, together with our Privacy Policy, any Supplemental
          Terms, and any plan-specific terms surfaced at purchase, are the
          entire agreement between you and Quantiliom regarding the
          Service and supersede any prior or contemporaneous understandings
          on that subject. No purchase-order terms, vendor onboarding
          terms, or click-wrap acceptances on third-party platforms will
          modify these Terms unless we expressly accept them in a signed
          writing.
        </p>
        <p>
          If any provision is held unenforceable, the remaining provisions
          remain in full force, and the unenforceable provision will be
          modified to the minimum extent necessary to make it enforceable.
          Our failure to enforce a right is not a waiver of that right.
          You may not assign these Terms without our written consent; we
          may assign them to an Affiliate or in connection with a merger,
          acquisition, financing, or sale of substantially all of the
          assets to which these Terms relate. The parties are independent
          contractors; nothing in these Terms creates an agency,
          partnership, joint venture, or employment relationship.
        </p>
        <p>
          Section headings are for convenience only and do not affect
          interpretation. The words &ldquo;including&rdquo; and
          &ldquo;such as&rdquo; are illustrative and not exhaustive. A
          reference to a statute includes any subordinate legislation made
          under it and any amendment or replacement of it.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about these Terms? Write to{" "}
        <a href="mailto:legal@quantiliom.ai">legal@quantiliom.ai</a>. For
        security disclosures use{" "}
        <a href="mailto:security@quantiliom.ai">security@quantiliom.ai</a>.
        For copyright complaints use{" "}
        <a href="mailto:copyright@quantiliom.ai">copyright@quantiliom.ai</a>.
        For privacy matters see the contact details in our{" "}
        <a href="#privacy">Privacy Policy</a>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of Service"
      effectiveDate={EFFECTIVE_DATE}
      lastUpdated={LAST_UPDATED}
      intro={
        <>
          <p>
            Welcome to Quantiliom AI. These Terms describe the rules that
            apply when you use our AI Software Architect platform — the
            dashboard at the address you are on now, the public website,
            the underlying APIs, and the AI-generated outputs they
            produce. They cover what you can expect from us, what we expect
            from you, how billing works, how we handle the AI-generated
            content, how the agreement can end, and how disputes are
            resolved.
          </p>
          <p>
            We have tried to keep the language plain. Where a section uses
            formal legal phrasing — defined terms, all-caps disclaimers,
            indemnity wording — it is because the wording carries specific
            meaning that protects both of us. The Table of Contents on the
            right lets you jump to a specific section; on smaller screens
            it sits above the article.
          </p>
          <p>
            If you have a separate written agreement with us (an enterprise
            agreement, a master services agreement, or an order form),
            those documents take precedence over these Terms where they
            conflict, but only for the subject they specifically address.
          </p>
        </>
      }
      sections={sections}
      siblingHref="#privacy"
      siblingLabel="Privacy Policy"
    />
  );
}
