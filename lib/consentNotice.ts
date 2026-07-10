/**
 * DPDP Act 2023 — Section 5 Notice & Consent
 * Standalone notice for Livo Assistant Pronunciation Test
 */

export const CONSENT_VERSION = '1.0'
export const CONSENT_EFFECTIVE_DATE = '10 July 2026'

export const DATA_FIDUCIARY = {
  name: 'Livo Assistant (Pronunciation Assessment Service)',
  contactEmail: 'privacy@livoassistant.com',
  grievanceEmail: 'grievance@livoassistant.com',
}

export const consentSections = [
  {
    title: '1. Introduction & Legal Basis',
    body: `This notice is provided to you ("Data Principal") under Section 5 of the Digital Personal Data Protection Act, 2023 ("DPDP Act") and Rule 3 of the Digital Personal Data Protection Rules, 2025, before we request your consent to process your personal data.

By using the Livo Assistant Pronunciation Test ("Service"), you are entering into a data processing relationship with ${DATA_FIDUCIARY.name} ("Data Fiduciary", "we", "us"). This notice is standalone, written in plain language, and is separate from any other terms. Please read it fully before giving consent.`,
  },
  {
    title: '2. Itemised Description of Personal Data Collected',
    body: `We collect only the personal data necessary for pronunciation assessment. The categories are:

• Voice / Audio Recordings — audio files or microphone recordings you upload or record during the test (typically 30–45 seconds per round).

• Derived Transcripts — text produced from your speech through automated speech-to-text processing.

• Pronunciation Analysis Data — scores, mispronounced words, phonetic comparisons, and AI-generated feedback linked to your recording.

• Session Identifiers — an anonymous session ID kept only in the page's memory (not saved to your browser storage) to track your progress through assessment rounds. It is discarded when you reload, restart, or close the tab (no account or login required).

• Technical Metadata — audio duration, file format, and timestamps of upload/analysis (not used to identify you beyond the session).

We do NOT require your name, email, phone number, Aadhaar, PAN, location, or payment information to use this Service.`,
  },
  {
    title: '3. Specific Purpose of Processing',
    body: `Your personal data will be processed ONLY for the following specified purposes:

• To transcribe your English speech and evaluate pronunciation accuracy.
• To generate a pronunciation score and highlight specific words or segments where pronunciation was unclear or incorrect.
• To provide personalised practice suggestions so you can improve your pronunciation.
• To manage your progress across assessment rounds within a single session.

Your data will NOT be used for: advertising, marketing, sale to third parties, credit scoring, employment decisions, behavioural profiling, or training AI models on your voice without your separate explicit consent.`,
  },
  {
    title: '4. Description of Service Enabled',
    body: `The processing described above enables the following service: an AI-powered English pronunciation assessment consisting of up to three rounds (read a passage, free-speech introduction, and Jam — Just a Minute on any topic). You receive scores, highlighted mistakes in your transcript, and targeted word-level practice before advancing to the next round.`,
  },
  {
    title: '5. Data Processors & Cross-Border Transfer',
    body: `We use trusted third-party processors to deliver the Service:

• Speech-to-Text Provider (e.g., Groq / Whisper API) — processes audio to produce transcripts. Servers may be located outside India, including the United States.

• AI Language Model Provider — generates human-readable feedback from analysis results. Servers may be located outside India.

• Cloud Hosting Provider (e.g., Railway) — hosts the application infrastructure.

Where personal data is transferred outside India, we ensure appropriate safeguards as required under the DPDP Act and applicable rules. By consenting, you acknowledge that your audio and derived data may be processed on servers located outside India for the sole purpose described in this notice.`,
  },
  {
    title: '6. Data Retention & Deletion',
    body: `We follow the principle of data minimisation and limited retention:

• Raw Audio — deleted immediately after analysis is complete. We do not store your audio recordings on a permanent basis.

• Session Data (scores, mistake lists, session ID) — retained for a maximum of 24 hours from your last activity, then automatically deleted.

• You may delete your session data at any time using the "Delete My Data" option within the Service, which triggers immediate erasure of all session-related data we hold.

We do not retain your personal data longer than necessary for the purposes stated in this notice.`,
  },
  {
    title: '7. Security Measures',
    body: `We implement reasonable technical and organisational measures to protect your personal data, including:

• Encryption in transit (HTTPS/TLS) for all data transmitted between your browser and our servers.
• Processing audio in ephemeral memory where possible, without writing to permanent storage.
• Access controls limiting who can access processing systems.
• No logging of raw audio content in application logs.

While we take security seriously, no method of electronic transmission or storage is 100% secure. We encourage you to use the Service in a private environment.`,
  },
  {
    title: '8. Your Rights as a Data Principal',
    body: `Under the DPDP Act, you have the following rights in relation to your personal data:

• Right to Access Information (Section 11) — request a summary of personal data being processed and the processing activities undertaken.

• Right to Correction (Section 12) — request correction of inaccurate or misleading personal data.

• Right to Erasure (Section 12) — request deletion of your personal data when it is no longer necessary for the stated purpose or upon withdrawal of consent.

• Right to Withdraw Consent (Section 6) — withdraw your consent at any time. Withdrawal is as easy as giving consent. Upon withdrawal, we will cease processing and delete your data unless retention is required by law.

• Right to Grievance Redressal (Section 13) — lodge a grievance with us regarding our processing of your personal data.

• Right to Nominate (Section 14) — nominate another individual to exercise your rights in the event of your death or incapacity.

To exercise any of these rights, contact us at ${DATA_FIDUCIARY.contactEmail}. We will respond within the timelines prescribed under the DPDP Act.`,
  },
  {
    title: '9. Grievance & Complaint to the Board',
    body: `If you are not satisfied with our response to your grievance, you have the right to file a complaint with the Data Protection Board of India in the manner prescribed under the DPDP Act.

Grievance Officer Contact:
Email: ${DATA_FIDUCIARY.grievanceEmail}
We aim to acknowledge grievances within 48 hours and resolve them within 30 days.`,
  },
  {
    title: '10. Children\'s Data',
    body: `This Service is not directed at children under 18 years of age. We do not knowingly collect personal data from children without verifiable parental consent as required under Section 9 of the DPDP Act. If you are under 18, please do not use this Service without parental or lawful guardian consent.`,
  },
  {
    title: '11. Voluntary Consent & Conditions of Use',
    body: `Your consent is entirely voluntary. If you do not agree to this notice, please do not use the Service.

Additional conditions for using the Service:
• Recordings must be in English only.
• Each recording must be between 30 and 45 seconds in duration.
• You must speak your own voice; do not upload another person's recording without their consent.
• Consent is specific to pronunciation assessment and is not bundled with any unrelated terms.

Consent version: ${CONSENT_VERSION} | Effective date: ${CONSENT_EFFECTIVE_DATE}`,
  },
  {
    title: '12. Consent Statement',
    body: `By checking the box below and clicking "Continue", you confirm that:

• You have read and understood this entire notice.
• You freely, specifically, and unambiguously consent to the collection and processing of your personal data as described above, limited to what is necessary for the pronunciation assessment service.
• You understand you may withdraw consent at any time with comparable ease.
• You understand your data may be processed outside India as described in Section 5 of this notice.

If you do not agree, click "Back" to exit without processing any personal data.`,
  },
]
