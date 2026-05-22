export interface LegalSection {
  id: string;
  title: string;
  body: string[];
  bullets?: string[];
}

export interface LegalPolicy {
  slug: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
}

const sharedPlaceholders = {
  effectiveDate: '[Insert date]',
  company: '[Vibly Legal Entity]',
  contact: '[legal@vibly.app]',
  governingLaw: '[Insert jurisdiction]',
};

export const termsOfService: LegalPolicy = {
  slug: '/terms-of-service',
  title: 'Terms of Service',
  summary: 'The rules for accessing and using Vibly.',
  effectiveDate: sharedPlaceholders.effectiveDate,
  sections: [
    {
      id: 'overview',
      title: '1. Overview',
      body: [
        `These Terms of Service govern your access to and use of Vibly, a memory-only chat app provided by ${sharedPlaceholders.company}. By using Vibly, you agree to these Terms and to our Privacy Policy and Acceptable Use Policy.`,
        'Vibly is designed for real-time conversations that exist while a chat window or active session is open. Vibly is not intended to provide permanent message storage, chat history, archives, or recovery.',
      ],
    },
    {
      id: 'eligibility',
      title: '2. Age and Eligibility',
      body: [
        'You must be at least 18 years old, or the minimum age required in your country if higher, to use Vibly. You may not use Vibly if you are prohibited from using the service under applicable law.',
        'You are responsible for ensuring that your use of Vibly is lawful where you live and where you access the service.',
      ],
    },
    {
      id: 'responsibility',
      title: '3. User Responsibility',
      body: [
        'You are solely responsible for what you send, say, share, request, upload, coordinate, or otherwise do through Vibly. You are also responsible for any consequences arising from your conversations and conduct.',
        'Ephemeral or memory-only messaging is not a guarantee that recipients cannot copy, screenshot, record, photograph, preserve, or share content outside Vibly.',
      ],
    },
    {
      id: 'content-rights',
      title: '4. Your Content and Limited License',
      body: [
        'You retain ownership of content you create and send through Vibly. Vibly does not claim ownership of your conversations.',
        'You grant Vibly a limited, non-exclusive, worldwide license to transmit, display, process, moderate, secure, troubleshoot, and operate the service. This license exists only as needed to provide and protect Vibly.',
      ],
    },
    {
      id: 'prohibited',
      title: '5. Prohibited Conduct',
      body: ['You may not use Vibly to create, request, promote, coordinate, facilitate, or distribute prohibited content or activity, including:'],
      bullets: [
        'Illegal activity, trafficking, fraud, scams, extortion, blackmail, or coordination of crime.',
        'Child sexual abuse material, sexual exploitation, grooming, or any sexual content involving minors.',
        'Sale, purchase, or facilitation of drugs, weapons, controlled substances, or regulated goods.',
        'Threats, harassment, hate, violence, terrorism, doxxing, impersonation, or non-consensual intimate content.',
        'Self-harm encouragement, copyright infringement, spam, malware, or attempts to disrupt Vibly.',
      ],
    },
    {
      id: 'termination',
      title: '6. Enforcement and Termination',
      body: [
        'Vibly may suspend, restrict, terminate, remove access, block networks, or take other action if we believe these Terms or applicable law have been violated.',
        'Vibly may report conduct or cooperate with law enforcement, regulators, safety organizations, or other authorities where required by law or where we believe action is necessary to protect users, the public, or the service.',
      ],
    },
    {
      id: 'third-party',
      title: '7. Third-Party Services',
      body: [
        'Vibly may rely on third-party services such as authentication providers, hosting services, APIs, payment providers, analytics tools, or links shared by users. Vibly is not responsible for third-party websites, services, content, policies, or actions.',
      ],
    },
    {
      id: 'ip',
      title: '8. Vibly Intellectual Property',
      body: [
        'Vibly owns the app, brand, logo, UI, design, code, trademarks, product materials, and platform elements. You may not copy, reverse engineer, misuse, or misrepresent Vibly materials except as allowed by law.',
      ],
    },
    {
      id: 'disclaimers',
      title: '9. Disclaimers and Limitation of Liability',
      body: [
        'Vibly is provided “as is” and “as available.” We do not promise uninterrupted, error-free, secure, or permanent availability.',
        'To the maximum extent permitted by law, Vibly will not be liable for indirect, incidental, consequential, special, exemplary, punitive, or lost-profit damages, or for user conduct, third-party actions, or preserved copies made outside Vibly.',
      ],
    },
    {
      id: 'indemnity',
      title: '10. Indemnification',
      body: [
        'You agree to defend, indemnify, and hold harmless Vibly from claims, losses, liabilities, damages, costs, and expenses arising from your content, conduct, violation of these Terms, or violation of law.',
      ],
    },
    {
      id: 'law-contact',
      title: '11. Governing Law and Contact',
      body: [
        `These Terms are governed by ${sharedPlaceholders.governingLaw}.`,
        `Questions may be sent to ${sharedPlaceholders.contact}.`,
      ],
    },
  ],
};

export const privacyPolicy: LegalPolicy = {
  slug: '/privacy-policy',
  title: 'Privacy Policy',
  summary: 'How Vibly handles identity, session data, message delivery, safety, and third-party services.',
  effectiveDate: sharedPlaceholders.effectiveDate,
  sections: [
    {
      id: 'overview',
      title: '1. Privacy Overview',
      body: [
        `This Privacy Policy explains how ${sharedPlaceholders.company} handles information when you use Vibly. Vibly is designed as a memory-only chat app: messages are not intended to be permanently stored by Vibly.`,
        'We use careful language because no online service can guarantee that recipients will not copy, screenshot, record, photograph, or otherwise preserve content outside the app.',
      ],
    },
    {
      id: 'information',
      title: '2. Information We Process',
      body: ['Depending on how you use Vibly, we may process:'],
      bullets: [
        'Account/session identity from Google sign-in, such as an identifier needed to verify your active session.',
        'Public profile details you choose for Vibly, such as username and age eligibility inputs.',
        'Socket connection metadata needed to show online users, route messages, prevent duplicate sessions, and operate safety controls.',
        'Temporary moderation metadata, such as warning counts, report categories, and scores. Full message text is not intended to be stored for moderation.',
      ],
    },
    {
      id: 'messages',
      title: '3. Messages and Memory-Only Design',
      body: [
        'Messages are designed to exist only while the relevant chat window/session is active. Vibly does not intend to provide chat history, archive, backup, or recovery features.',
        'Messages may still pass through active device memory, network connections, and runtime systems needed to deliver them in real time.',
      ],
    },
    {
      id: 'use',
      title: '4. How We Use Information',
      body: ['We use information to:'],
      bullets: [
        'Authenticate active sessions and help prevent duplicate or abusive access.',
        'Show online users and relay messages in real time.',
        'Operate safety reminders, report flows, IP/network restrictions, and moderation protections.',
        'Debug, secure, maintain, and improve the service without building message history.',
      ],
    },
    {
      id: 'sharing',
      title: '5. Sharing and Legal Requests',
      body: [
        'We may share limited information with service providers who help operate Vibly, such as authentication, hosting, infrastructure, or security providers.',
        'We may preserve, disclose, report, or cooperate with law enforcement or other authorities where required by law or where necessary to address illegal, exploitative, harmful, or abusive activity.',
      ],
    },
    {
      id: 'third-party',
      title: '6. Third-Party Services and Links',
      body: [
        'Vibly is not responsible for third-party links, websites, services, APIs, authentication providers, payment providers, analytics tools, or user-shared external content. Their terms and privacy practices apply separately.',
      ],
    },
    {
      id: 'retention',
      title: '7. Retention',
      body: [
        'Vibly is designed not to permanently retain message content. Temporary runtime data may exist while sessions, moderation, security, or delivery processes are active.',
        'Browser reload support may use a limited session snapshot for login continuity, but it is not intended to store messages or conversations.',
      ],
    },
    {
      id: 'choices',
      title: '8. Your Choices',
      body: [
        'You can close chats, log out, stop using Vibly, or contact us about privacy questions. Closing a chat is designed to remove that conversation from the active app session.',
      ],
    },
    {
      id: 'security',
      title: '9. Security',
      body: [
        'We use reasonable technical and organizational measures to protect Vibly, but no service can be guaranteed perfectly secure or immune from misuse by users or third parties.',
      ],
    },
    {
      id: 'contact',
      title: '10. Contact',
      body: [`Privacy questions may be sent to ${sharedPlaceholders.contact}.`],
    },
  ],
};

export const acceptableUsePolicy: LegalPolicy = {
  slug: '/acceptable-use-policy',
  title: 'Acceptable Use Policy',
  summary: 'What is and is not allowed on Vibly.',
  effectiveDate: sharedPlaceholders.effectiveDate,
  sections: [
    {
      id: 'principle',
      title: '1. Core Principle',
      body: [
        'Vibly is for lawful, respectful, present-tense conversations. Users are solely responsible for their messages, requests, conduct, and consequences.',
        'Private-by-design and memory-only features do not make harmful or illegal behavior acceptable.',
      ],
    },
    {
      id: 'illegal',
      title: '2. Illegal and Regulated Activity',
      body: ['You may not use Vibly to request, offer, coordinate, promote, or facilitate:'],
      bullets: [
        'Crime, trafficking, fraud, scams, money laundering, extortion, blackmail, or evasion of law.',
        'Sale, purchase, exchange, or distribution of drugs, weapons, controlled substances, counterfeit goods, or regulated items.',
        'Terrorism, violent extremism, organized violence, or instructions to harm people or property.',
      ],
    },
    {
      id: 'sexual-exploitation',
      title: '3. Sexual Exploitation and Minors',
      body: ['Vibly strictly prohibits:'],
      bullets: [
        'Child sexual abuse material or any sexual content involving minors.',
        'Grooming, sexual exploitation, coercive sexual behavior, trafficking, or requests for intimate content from minors.',
        'Non-consensual intimate content, sexual blackmail, or threats to expose private material.',
      ],
    },
    {
      id: 'harm',
      title: '4. Abuse, Hate, and Harm',
      body: ['You may not use Vibly for:'],
      bullets: [
        'Harassment, bullying, threats, hate, dehumanizing conduct, or targeted abuse.',
        'Doxxing, impersonation, stalking, intimidation, or encouraging self-harm.',
        'Coercion, manipulation, threats, or pressure to make someone act against their will.',
      ],
    },
    {
      id: 'integrity',
      title: '5. Platform Integrity',
      body: ['You may not:'],
      bullets: [
        'Attempt to break, scrape, reverse engineer, overload, or bypass Vibly safety systems.',
        'Send spam, malware, phishing attempts, scams, deceptive links, or unauthorized promotions.',
        'Infringe copyright, trademarks, privacy rights, publicity rights, or other rights of others.',
      ],
    },
    {
      id: 'reporting',
      title: '6. Reporting and Removal',
      body: [
        'Users may report abusive or illegal behavior from within a chat. Vibly may restrict access, disconnect users, block networks, remove access, or take other action based on reports, safety signals, or legal requirements.',
        'Vibly may cooperate with law enforcement or safety authorities where required by law or where needed to protect users and the public.',
      ],
    },
    {
      id: 'consequences',
      title: '7. Consequences',
      body: [
        'Violating this policy may result in warnings, blocked messages, account restriction, termination, IP/network blocking, reporting, or legal cooperation.',
      ],
    },
    {
      id: 'contact',
      title: '8. Contact',
      body: [`Questions or reports may be sent to ${sharedPlaceholders.contact}.`],
    },
  ],
};

export const legalPolicies = [termsOfService, privacyPolicy, acceptableUsePolicy];
