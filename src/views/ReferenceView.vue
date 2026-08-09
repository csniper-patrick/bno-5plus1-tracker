<script>
/**
 * ReferenceView Component
 *
 * Reference & Official Guidance page presenting curated official UK Government guidance,
 * policy statements, settlement requirements, and qualification portals
 * for Hong Kong British National (Overseas) (BNO) visa holders.
 */
export default {
  name: 'ReferenceView',

  data() {
    return {
      searchQuery: '',
      selectedCategory: 'All',
      selectedSourceType: 'All',
      categories: [
        'All',
        'Visa Extension',
        'BNO Settlement',
        'Policy & Guidance',
        'Tax & Residence',
        'Living & Rights',
        'Qualifications & Tests',
        'Citizenship',
        'Tools & Source',
      ],
      sourceTypes: ['All', 'Official', '3rd Party'],

      /** Global snackbar notification state */
      snackbar: {
        show: false,
        text: '',
        color: 'success',
      },

      /** Curated list of useful official and 3rd-party reference links */
      links: [
        {
          id: 'gitlab-repository',
          title: 'BNO 5+1 Tracker GitLab Repository',
          category: 'Tools & Source',
          url:
            import.meta.env.VITE_CI_PROJECT_URL || 'https://gitlab.com/CSniper/bno-5plus1-tracker',
          icon: 'mdi-gitlab',
          color: 'orange-darken-3',
          badge: 'Open Source',
          isOfficial: false,
          description:
            'Open-source repository for this BNO 5+1 Tracker web application. Access source code, project issues, and contribution guidelines.',
          highlights: [
            'Open-source web application for BNO visa holders tracking ILR continuous residence',
            'Client-side offline processing with IndexedDB data persistence',
            'Features 180-day rolling absence calculator and document expiry management',
            'Community-supported open source project hosted on GitLab',
          ],
        },
        {
          id: 'bno-visa-extend',
          title: 'BNO Visa: Extend Your Visa (30 Months or 5 Years)',
          category: 'Visa Extension',
          url: 'https://www.gov.uk/british-national-overseas-bno-visa/extend-your-visa',
          icon: 'mdi-clock-fast',
          color: 'blue-darken-2',
          badge: 'Official Application',
          isOfficial: true,
          description:
            'Official UK Government guide and application portal for extending your BNO visa from within the UK before your current permission expires.',
          highlights: [
            'Apply online before current visa expires (protected under Section 3C leave while decision is pending)',
            'Choose between a 30-month (2.5-year) extension or a full 5-year extension',
            'Identity verification via "UK Immigration: ID Check" smartphone app or biometric appointment',
            'Apply up to 28 days before current visa expiry date to ensure continuous lawful residence',
          ],
        },
        {
          id: 'bno-extension-fees',
          title: 'BNO Visa Extension Fees & IHS Cost Breakdown',
          category: 'Visa Extension',
          url: 'https://www.gov.uk/british-national-overseas-bno-visa/how-much-it-costs',
          icon: 'mdi-currency-gbp',
          color: 'green-darken-2',
          badge: 'Fees & Costs',
          isOfficial: true,
          description:
            'Official Home Office fee table and Immigration Health Surcharge (IHS) mandatory calculations for renewing a BNO visa.',
          highlights: [
            'Visa Application Fee: £206 for 30-month extension, £285 for 5-year extension per applicant',
            'Immigration Health Surcharge (IHS): £1,035/year for adults, £776/year for children under 18',
            'Financial proof: Must show adequate maintenance funds for 6 months if in the UK under 12 months',
            'No IHS required when applying for ILR / Settlement stage after 5 years',
          ],
        },
        {
          id: 'bno-dependants-extension',
          title: 'BNO Visa Dependant & Family Member Extension',
          category: 'Visa Extension',
          url: 'https://www.gov.uk/british-national-overseas-bno-visa/your-family-members',
          icon: 'mdi-account-group-outline',
          color: 'purple-darken-1',
          badge: 'Family Rules',
          isOfficial: true,
          description:
            'Official Home Office rules and instructions for extending BNO visas for partners, dependent children, and adult dependent relatives.',
          highlights: [
            "Family members submit separate online applications linked via main applicant's UAN / GWF reference",
            'Dependants can apply to extend at any time before their current individual visa expires',
            'Children turning 18 during current visa retain dependant extension eligibility',
            'Provides options to align visa expiration dates across family household members',
          ],
        },
        {
          id: 'uk-immigration-id-app',
          title: 'UK Immigration: ID Check App Guidance',
          category: 'Visa Extension',
          url: 'https://www.gov.uk/guidance/using-the-uk-immigration-id-check-app',
          icon: 'mdi-cellphone-check',
          color: 'deep-orange-darken-1',
          badge: 'Digital Identity',
          isOfficial: true,
          description:
            'Official step-by-step guidance on using the UKVI identity check app on iOS/Android to verify identity for visa extension without in-person appointments.',
          highlights: [
            'Scan biometric chip on BNO, HKSAR, or international passport using smartphone NFC',
            'Eliminates requirement to attend in-person UKVCAS service center appointment for eligible holders',
            'Generates digital eVisa profile directly linked to your UKVI account',
          ],
        },
        {
          id: 'bno-switch-visa',
          title: 'Switch to BNO Visa from Inside the UK',
          category: 'Visa Extension',
          url: 'https://www.gov.uk/british-national-overseas-bno-visa/switch-to-this-visa',
          icon: 'mdi-swap-horizontal-bold',
          color: 'teal-darken-2',
          badge: 'In-UK Switch',
          isOfficial: true,
          description:
            'Official Home Office guidance for switching onto the BNO visa route from other valid UK visa categories without leaving the UK.',
          highlights: [
            'Switch from Student, Skilled Worker, Graduate, or LOTR visa statuses',
            'Must apply before your current valid leave to remain expires',
            'Previous lawful residence on eligible work/study visas may count towards 5-year continuous residence',
          ],
        },
        {
          id: 'bno-settle',
          title: 'BNO Visa: Settle in the UK (ILR Guidance)',
          category: 'BNO Settlement',
          url: 'https://www.gov.uk/british-national-overseas-bno-visa/settle-in-the-uk',
          icon: 'mdi-passport',
          color: 'primary',
          badge: 'Essential Guidance',
          isOfficial: true,
          description:
            'Official UK Government guide on how to apply for Indefinite Leave to Remain (ILR) / UK Settlement under the BNO visa route after 5 years of continuous residence.',
          highlights: [
            'Qualifying period: 5 years continuous residence in the UK',
            'Absence limit: Maximum 180 days absent in any continuous 12-month period',
            'Requirements: Life in the UK test & B1 English qualification',
            'Submitting application: Can apply up to 28 days before completing 5 years',
          ],
        },
        {
          id: 'bno-policy-statement',
          title: 'Hong Kong BNO Visa Policy Statement',
          category: 'Policy & Guidance',
          url: 'https://www.gov.uk/government/publications/hong-kong-bno-visa-policy-statement/hong-kong-british-national-overseas-visa-policy-statement-plain-text-version',
          icon: 'mdi-file-document-outline',
          color: 'indigo-darken-1',
          badge: 'Policy Statement',
          isOfficial: true,
          description:
            'Comprehensive UK Home Office policy statement outlining background, rights, work/study permissions, public fund restrictions, and settlement pathways for BNO holders.',
          highlights: [
            'Details original policy design for the Hong Kong BNO visa route',
            'Outlines rights to work, study, and use NHS healthcare in the UK',
            'Explains conditions for No Recourse to Public Funds (NRPF)',
            'Covers eligibility for BNO status holders and immediate family members',
          ],
        },
        {
          id: 'continuous-residence-guidance',
          title: 'UKVI Continuous Residence Caseworker Guidance',
          category: 'Policy & Guidance',
          url: 'https://www.gov.uk/government/publications/continuous-residence',
          icon: 'mdi-book-open-outline',
          color: 'teal-darken-1',
          badge: 'Caseworker Rules',
          isOfficial: true,
          description:
            'Official Home Office caseworker guidance explaining how continuous residence is calculated, departure/arrival day exclusion rules, and valid absence exceptions.',
          highlights: [
            'Full-day rule: Days of departure & arrival are excluded from absence counts',
            'Rolling 12-month calculation rules across 5-year qualifying period',
            'Permitted absence exceptions (serious illness, travel disruptions, etc.)',
            'Supporting evidence requirements for ILR applications',
          ],
        },
        {
          id: 'bno-caseworker-guidance',
          title: 'Hong Kong BN(O) Route Caseworker Guidance',
          category: 'Policy & Guidance',
          url: 'https://www.gov.uk/government/publications/hong-kong-british-national-overseas-route',
          icon: 'mdi-file-account-outline',
          color: 'indigo-darken-2',
          badge: 'Caseworker Rules',
          isOfficial: true,
          description:
            'Official Home Office caseworker guidance specifying decision-making criteria for entry clearance, extension, adult child eligibility, and settlement under the BNO route.',
          highlights: [
            'Internal assessment rules used by Home Office caseworkers to process BNO applications',
            'Detailed evidence criteria for maintenance funds, continuous residence, and family dependencies',
            'Includes rules for adult children (born on or after 1 July 1979) and household relatives',
          ],
        },
        {
          id: 'bno-immigration-rules-appendix-hk',
          title: 'Immigration Rules Appendix Hong Kong British National (Overseas)',
          category: 'Policy & Guidance',
          url: 'https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-hong-kong-british-national-overseas',
          icon: 'mdi-gavel',
          color: 'blue-grey-darken-2',
          badge: 'Statutory Rules',
          isOfficial: true,
          description:
            'Legally binding UK Parliament statutory immigration code establishing the BNO visa route, validity, suitability, and settlement criteria.',
          highlights: [
            'Statutory rules governing BNO status holders and dependent family members',
            'Exact legal definitions of validity, suitability, continuous residence, and settlement eligibility (HK 51.1–HK 64.1)',
            'Authoritative reference for legal requirements without relying on commercial legal advice',
          ],
        },
        {
          id: 'parliament-bno-briefing',
          title: 'UK Parliament Research Briefing: BNO Visa Route',
          category: 'Policy & Guidance',
          url: 'https://commonslibrary.parliament.uk/research-briefings/cbp-8939/',
          icon: 'mdi-library-shelves',
          color: 'deep-purple-darken-2',
          badge: 'Parliament Research',
          isOfficial: true,
          description:
            'Independent, non-partisan UK House of Commons Library briefing on BNO visa statistics, legal background, rights access, and policy developments.',
          highlights: [
            'Official UK Parliament research report summarizing policy decisions, statistics, and rights',
            'Comprehensive analysis of access to healthcare, education, social security, and citizenship pathways',
            'Impartial public interest reference free from commercial or political bias',
          ],
        },
        {
          id: 'bno-change-of-conditions-nrpf',
          title: 'Application for Change of Conditions (NRPF Waiver)',
          category: 'Policy & Guidance',
          url: 'https://www.gov.uk/government/publications/application-for-change-of-conditions-of-leave-to-allow-access-to-public-funds-if-your-circumstances-change',
          icon: 'mdi-hand-heart-outline',
          color: 'pink-darken-2',
          badge: 'NRPF Waiver',
          isOfficial: true,
          description:
            'Official Home Office guidance and application for BNO visa holders experiencing sudden financial hardship or destitution to request lifting of No Recourse to Public Funds (NRPF).',
          highlights: [
            'Allows BNO holders facing extreme financial distress or destitution to apply to lift NRPF',
            'Detailed guidance on required income, housing, and financial evidence',
            'Protects lawful residence status while accessing the UK social safety net',
          ],
        },
        {
          id: 'hmrc-statutory-residence-test',
          title: 'HMRC Statutory Residence Test (SRT) Guidance (RDR3)',
          category: 'Tax & Residence',
          url: 'https://www.gov.uk/government/publications/rdr3-statutory-residence-test-srt',
          icon: 'mdi-calculator-variant-outline',
          color: 'teal-darken-3',
          badge: 'Tax Residence',
          isOfficial: true,
          description:
            'Official HM Revenue & Customs (HMRC) guide on determining UK tax residence status, day-counting rules, automatic overseas/UK tests, and split-year tax treatment.',
          highlights: [
            'Essential for BNO holders determining whether global income/capital gains are subject to UK tax',
            'Details Automatic Overseas Tests, Automatic UK Tests (183-day rule), and Sufficient Ties Tests',
            'Clarifies midnight day-counting rules and split-year tax treatment upon relocating to the UK',
          ],
        },
        {
          id: 'prove-right-to-work',
          title: 'Prove Your Right to Work in the UK (Employer Share Code)',
          category: 'Living & Rights',
          url: 'https://www.gov.uk/prove-right-to-work',
          icon: 'mdi-briefcase-check-outline',
          color: 'blue-darken-3',
          badge: 'Work Permission',
          isOfficial: true,
          description:
            "Official GOV.UK portal for generating secure digital share codes for UK employers to verify BNO visa holders' unrestricted right to work.",
          highlights: [
            'Instantly generate a 9-character share code for UK employers to check work permissions',
            'Explains BNO visa work permissions (employed, self-employed, setting up a business)',
            'Replaces physical document checks with instant digital eVisa verification',
          ],
        },
        {
          id: 'prove-right-to-rent',
          title: 'Prove Your Right to Rent in the UK (Landlord Share Code)',
          category: 'Living & Rights',
          url: 'https://www.gov.uk/prove-right-to-rent',
          icon: 'mdi-home-city-outline',
          color: 'brown-darken-1',
          badge: 'Housing Permission',
          isOfficial: true,
          description:
            'Official GOV.UK digital service allowing BNO holders to prove their legal right to rent residential property in England to landlords and estate agents.',
          highlights: [
            'Generate digital share code for landlords and letting agencies to verify tenancy eligibility',
            'Protects tenants by providing official digital proof of legal UK residence',
            'Integrates directly with your digital UKVI eVisa account',
          ],
        },
        {
          id: 'view-prove-immigration-status',
          title: 'View & Prove Your Immigration Status (eVisa UKVI Account)',
          category: 'Living & Rights',
          url: 'https://www.gov.uk/view-prove-immigration-status',
          icon: 'mdi-account-badge-outline',
          color: 'cyan-darken-3',
          badge: 'eVisa Account',
          isOfficial: true,
          description:
            'Official UKVI online service to access digital visa records, generate status share codes, and update linked passport and travel document details.',
          highlights: [
            'Central online hub for accessing and managing your digital UKVI eVisa status',
            'Critical for updating new passport numbers to avoid delays at UK border control',
            'Generate digital share codes for official proof of UK status',
          ],
        },
        {
          id: 'register-to-vote-uk',
          title: 'Register to Vote in the UK (Electoral Roll)',
          category: 'Living & Rights',
          url: 'https://www.gov.uk/register-to-vote',
          icon: 'mdi-vote-outline',
          color: 'deep-orange-darken-2',
          badge: 'Voting Rights',
          isOfficial: true,
          description:
            'Official UK Government voter registration service. As BN(O) status holders are Commonwealth citizens, BNO visa holders residing in the UK are eligible to vote.',
          highlights: [
            'BNO status holders in the UK have full voting rights in local and general elections as Commonwealth citizens',
            'Registering on the Electoral Roll serves as key proof of address for UK credit scores, banking, and mortgages',
            'Direct online registration linked to your local council',
          ],
        },
        {
          id: 'home-fee-status-guidance',
          title: 'Higher Education Home Fee Status & Student Support Guidance',
          category: 'Living & Rights',
          url: 'https://www.ukcisa.org.uk/',
          icon: 'mdi-school',
          color: 'light-blue-darken-3',
          badge: 'Education Rights',
          isOfficial: true,
          description:
            'Official advisory rules from UKCISA & GOV.UK regarding 3-year ordinary residence rules for qualifying for Home Fee status and university student loans.',
          highlights: [
            'Explains the 3-year ordinary residence rule for BNO holders qualifying for Home Fee status in UK universities',
            'Maintained by the UK Council for International Student Affairs (UKCISA), an official UK educational advisory body',
            'Provides clear guidance on tuition fee status in England, Scotland, Wales, and Northern Ireland',
          ],
        },
        {
          id: 'life-in-uk-test',
          title: 'Life in the UK Test Official Portal',
          category: 'Qualifications & Tests',
          url: 'https://www.gov.uk/life-in-the-uk-test',
          icon: 'mdi-school-outline',
          color: 'amber-darken-3',
          badge: 'Mandatory Test',
          isOfficial: true,
          description:
            'Official UK Government booking portal for the Life in the UK Test. Required for all applicants aged 18–64 applying for ILR or British Citizenship.',
          highlights: [
            'Booking cost: £50 per test attempt',
            'Must book at least 3 days in advance at one of 30+ official test centers',
            'Requires valid accepted photo ID & proof of address for registration',
            'Generates Unique Reference Number (URN) upon passing',
          ],
        },
        {
          id: 'english-language-requirement',
          title: 'Prove Your Knowledge of English (B1 Level)',
          category: 'Qualifications & Tests',
          url: 'https://www.gov.uk/english-language',
          icon: 'mdi-translate',
          color: 'deep-purple-darken-1',
          badge: 'Language Requirement',
          isOfficial: true,
          description:
            'Official guidelines on proving English language capability at B1 CEFR level or higher for ILR settlement and citizenship applications.',
          highlights: [
            'Accepted pathways: B1 SELT Test (Trinity/PSI/IELTS SELT), UK Degree, or Ecctis statement',
            'Exemptions apply for applicants over 65 or with specific medical conditions',
            'SELT pass certificates do not expire for ILR if used in a previous successful application',
          ],
        },
        {
          id: 'ecctis-qualification-recognition',
          title: 'Ecctis Qualification Recognition & English Verification',
          category: 'Qualifications & Tests',
          url: 'https://www.ecctis.com/',
          icon: 'mdi-certificate-outline',
          color: 'purple-darken-2',
          badge: 'Official Recognition',
          isOfficial: true,
          description:
            'Official UK national agency designated by the UK Government for recognizing foreign qualifications and verifying English language proficiency for visa & ILR applications.',
          highlights: [
            'Provides official Statements of Comparability for non-UK university degrees',
            'Alternative official pathway to satisfy the B1 English language requirement for ILR settlement without SELT exams',
            'Recognized across Home Office caseworkers, UK employers, and professional registration bodies',
          ],
        },
        {
          id: 'apply-citizenship-naturalisation',
          title: 'Apply for British Citizenship (Form AN)',
          category: 'Citizenship',
          url: 'https://www.gov.uk/apply-citizenship-indefinite-leave-to-remain',
          icon: 'mdi-crown-outline',
          color: 'red-darken-2',
          badge: 'Naturalisation',
          isOfficial: true,
          description:
            'Official guidance on applying for British Citizenship by Naturalisation after holding ILR for at least 12 months (or immediately if married to a UK citizen).',
          highlights: [
            'Absence limit 1: Max 450 days total absent in the 5 years before applying',
            'Absence limit 2: Max 90 days absent in the 12 months immediately preceding application',
            'Physical presence requirement: Must have been in the UK exactly 5 years prior to application date',
            'Requires 2 referees, good character assessment, & citizenship ceremony',
          ],
        },
        {
          id: 'good-character-guidance',
          title: 'Good Character Requirement Caseworker Guidance',
          category: 'Citizenship',
          url: 'https://www.gov.uk/government/publications/good-character-guidance',
          icon: 'mdi-shield-check-outline',
          color: 'red-darken-3',
          badge: 'Citizenship Rules',
          isOfficial: true,
          description:
            'Official Home Office caseworker guidance defining the Good Character requirement for British Citizenship naturalisation, covering tax compliance and legal conduct.',
          highlights: [
            'Mandatory assessment criteria for all adult applicants applying for British Citizenship (Form AN)',
            'Details how HMRC tax compliance, driving offences, fixed penalty notices, and financial conduct affect applications',
            'Provides clear guidelines to prevent citizenship application refusals',
          ],
        },
        {
          id: 'hkb-hongkongers-in-britain',
          title: 'Hongkongers in Britain (HKB) Resettlement Hub',
          category: 'Living & Rights',
          url: 'https://www.hongkongers.org.uk/',
          icon: 'mdi-account-group',
          color: 'deep-orange-darken-3',
          badge: 'Registered Charity',
          isOfficial: false,
          description:
            'Leading non-profit charity established by Hongkongers in the UK providing resettlement guides, employment workshops, CV clinics, and mental health support.',
          highlights: [
            'Provides free bilingual resettlement guides, CV clinics, and employment mentorship for BNO holders',
            'Offers Cantonese-speaking mental health and community integration support across major UK regions',
            'Publishes policy research and settlement surveys on Hong Kongers living in Britain',
          ],
        },
        {
          id: 'hong-kong-watch',
          title: 'Hong Kong Watch Policy & Rights Briefings',
          category: 'Policy & Guidance',
          url: 'https://www.hongkongwatch.org/',
          icon: 'mdi-eye-outline',
          color: 'indigo-darken-3',
          badge: 'Registered NGO',
          isOfficial: false,
          description:
            'UK-based non-governmental organization (NGO) advocating for the rights of Hongkongers, pension MPF withdrawal, and university home fee status.',
          highlights: [
            "Independent advocacy NGO protecting BNO status holders' rights and MPF pension withdrawal advocacy",
            'Publishes policy briefings on BNO visa pathways, settlement extensions, and student fee status',
            'Works directly with UK Parliamentarians and civil society to support Hong Kong community integration',
          ],
        },
        {
          id: 'citizens-advice-uk',
          title: 'Citizens Advice UK Independent Guidance',
          category: 'Living & Rights',
          url: 'https://www.citizensadvice.org.uk/',
          icon: 'mdi-human-handsup',
          color: 'blue-darken-4',
          badge: 'Advice Charity',
          isOfficial: false,
          description:
            "UK's largest independent advice charity offering free, impartial guidance on tenancy rights, employment contracts, debt advice, and public funds access (NRPF).",
          highlights: [
            'Free, confidential, and independent legal/rights advisory service across England, Scotland & Wales',
            'Provides impartial guidance on tenant rights, employment contracts, council tax, and benefits',
            'Assists migrants in distress navigating NRPF conditions and local social support',
          ],
        },
        {
          id: 'hong-kong-well-uk',
          title: 'Hong Kong Well UK Children & Family Support',
          category: 'Living & Rights',
          url: 'https://www.hongkongwell.uk/',
          icon: 'mdi-heart-pulse',
          color: 'teal-darken-2',
          badge: 'Community Service',
          isOfficial: false,
          description:
            'Registered UK non-profit Community Interest Company (CIC) providing subsidized Cantonese mental health counseling and SEN educational advice for BNO families.',
          highlights: [
            'Non-profit community service supporting mental well-being of BNO families in the UK',
            'Offers Cantonese-speaking psychological support and SEN (Special Educational Needs) family advisory',
            'Conducts community workshops for parents and children adapting to the UK school system',
          ],
        },
        {
          id: 'migration-observatory-oxford',
          title: 'The Migration Observatory (University of Oxford)',
          category: 'Policy & Guidance',
          url: 'https://migrationobservatory.ox.ac.uk/',
          icon: 'mdi-school-outline',
          color: 'blue-grey-darken-3',
          badge: 'Academic Research',
          isOfficial: false,
          description:
            'Independent, non-profit academic research unit based at the University of Oxford providing data-driven analysis of UK immigration policy and BNO population data.',
          highlights: [
            'Impartial, data-backed immigration analysis and research from the University of Oxford',
            'Publishes objective reports on BNO visa migration trends, employment rates, and housing data',
            '100% free of political, commercial, or immigration agent bias',
          ],
        },
        {
          id: 'bno-visa-overview',
          title: 'Hong Kong BNO Visa General Overview & Extensions',
          category: 'Visa Extension',
          url: 'https://www.gov.uk/british-national-overseas-bno-visa',
          icon: 'mdi-earth',
          color: 'cyan-darken-2',
          badge: 'Visa Overview',
          isOfficial: true,
          description:
            'Official overview page for the British National (Overseas) visa, detailing application fees, Immigration Health Surcharge (IHS), 2.5-year vs 5-year visa options, and visa extension processes.',
          highlights: [
            'Compare 2.5-year extension vs 5-year initial visa paths',
            'Immigration Health Surcharge (IHS) payment details',
            'Switching visa categories and adding dependent family members',
          ],
        },
      ],
    }
  },

  computed: {
    categoriesMap() {
      return [
        { key: 'All', label: this.$t('reference.all') },
        { key: 'Visa Extension', label: this.$t('reference.cat_visa_extension') },
        { key: 'BNO Settlement', label: this.$t('reference.cat_bno_settlement') },
        { key: 'Policy & Guidance', label: this.$t('reference.cat_policy_guidance') },
        { key: 'Tax & Residence', label: this.$t('reference.cat_tax_residence') },
        { key: 'Living & Rights', label: this.$t('reference.cat_living_rights') },
        { key: 'Qualifications & Tests', label: this.$t('reference.cat_qualifications') },
        { key: 'Citizenship', label: this.$t('reference.cat_citizenship') },
        { key: 'Tools & Source', label: this.$t('reference.cat_tools') },
      ]
    },

    sourceTypesMap() {
      return [
        { key: 'All', label: this.$t('reference.all') },
        { key: 'Official', label: this.$t('reference.official_source') },
        { key: '3rd Party', label: this.$t('reference.third_party_source') },
      ]
    },

    translatedLinks() {
      return this.links.map((link) => {
        const key = link.id.replace(/-/g, '_')
        const i18nPath = `reference.links.${key}`
        const hasI18n = this.$te(`${i18nPath}.title`)
        const catMap = this.categoriesMap.find((c) => c.key === link.category)

        return {
          ...link,
          title: hasI18n ? this.$t(`${i18nPath}.title`) : link.title,
          categoryLabel: catMap ? catMap.label : link.category,
          badge:
            hasI18n && this.$te(`${i18nPath}.badge`) ? this.$t(`${i18nPath}.badge`) : link.badge,
          description:
            hasI18n && this.$te(`${i18nPath}.description`)
              ? this.$t(`${i18nPath}.description`)
              : link.description,
          highlights:
            hasI18n &&
            Array.isArray(this.$tm(`${i18nPath}.highlights`)) &&
            this.$tm(`${i18nPath}.highlights`).length > 0
              ? this.$tm(`${i18nPath}.highlights`)
              : link.highlights,
        }
      })
    },

    /**
     * Filtered list of links based on selected category, source type, and text query.
     * @returns {Array}
     */
    filteredLinks() {
      return this.translatedLinks.filter((link) => {
        const matchesCategory =
          this.selectedCategory === 'All' || link.category === this.selectedCategory
        const matchesSourceType =
          this.selectedSourceType === 'All' ||
          (this.selectedSourceType === 'Official' && link.isOfficial) ||
          (this.selectedSourceType === '3rd Party' && !link.isOfficial)
        const query = this.searchQuery.trim().toLowerCase()
        if (!query) return matchesCategory && matchesSourceType

        const matchesTitle = link.title.toLowerCase().includes(query)
        const matchesDesc = link.description.toLowerCase().includes(query)
        const matchesHighlights = link.highlights.some((h) =>
          String(h).toLowerCase().includes(query),
        )

        return (
          matchesCategory && matchesSourceType && (matchesTitle || matchesDesc || matchesHighlights)
        )
      })
    },
  },

  methods: {
    /**
     * Resets search query, selected category, and source type filters.
     */
    resetFilters() {
      this.searchQuery = ''
      this.selectedCategory = 'All'
      this.selectedSourceType = 'All'
    },

    /**
     * Copies link URL to clipboard and triggers feedback snackbar.
     * @param {string} url - Link URL to copy.
     */
    async copyLinkUrl(url) {
      try {
        await navigator.clipboard.writeText(url)
        this.showSnackbar(this.$t('reference.link_copied'), 'success')
      } catch (err) {
        const textArea = document.createElement('textarea')
        textArea.value = url
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        this.showSnackbar(this.$t('reference.link_copied'), 'success')
      }
    },

    /**
     * Displays a snackbar notification.
     * @param {string} text - Message text.
     * @param {string} [color='success'] - Color theme.
     */
    showSnackbar(text, color = 'success') {
      this.snackbar = {
        show: true,
        text,
        color,
      }
    },
  },
}
</script>

<template>
  <div>
    <!-- Page Header & Overview Card -->
    <v-card elevation="2" class="pa-3 pa-sm-4 rounded-lg bg-surface mb-6">
      <v-card-title class="px-0 pt-0 d-flex align-center flex-wrap ga-2">
        <div class="d-flex align-center">
          <v-icon icon="mdi-bookshelf" color="primary" class="mr-2" size="large"></v-icon>
          <span class="text-h5 font-weight-bold">{{ $t('reference.title') }}</span>
        </div>
        <v-chip
          size="small"
          color="info"
          variant="flat"
          class="font-weight-bold ml-sm-auto"
          prepend-icon="mdi-format-list-checks"
        >
          {{ $t('reference.curated_badge') }}
        </v-chip>
      </v-card-title>

      <p class="text-body-2 text-medium-emphasis ma-0">
        {{ $t('reference.subtitle') }}
      </p>

      <v-alert
        type="info"
        variant="tonal"
        icon="mdi-information-outline"
        class="mt-3 text-caption"
        density="compact"
      >
        <i18n-t keypath="reference.sources_notice_body" scope="global">
          <template #code>
            <code>gov.uk</code>
          </template>
          <template #officialTag>
            <v-chip
              size="x-small"
              color="success"
              variant="flat"
              density="compact"
              class="mx-1 font-weight-bold"
            >
              {{ $t('reference.official_source') }}
            </v-chip>
          </template>
          <template #thirdPartyTag>
            <v-chip
              size="x-small"
              color="warning"
              variant="flat"
              density="compact"
              class="mx-1 font-weight-bold"
            >
              {{ $t('reference.third_party_source') }}
            </v-chip>
          </template>
        </i18n-t>
      </v-alert>
    </v-card>

    <!-- Search & Category / Source Type Filters -->
    <v-card elevation="1" class="pa-4 rounded-lg bg-surface mb-6">
      <v-row align="center">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            :label="$t('reference.search_placeholder')"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          ></v-text-field>
        </v-col>

        <v-col cols="12" md="8" class="d-flex align-center flex-wrap ga-2 justify-md-end">
          <div class="d-flex align-center ga-1 mr-sm-2">
            <span class="text-caption text-medium-emphasis font-weight-bold">{{
              $t('reference.source_filter')
            }}</span>
            <v-chip-group
              v-model="selectedSourceType"
              selected-class="v-chip--selected"
              mandatory
              filter
            >
              <v-chip
                v-for="st in sourceTypesMap"
                :key="st.key"
                :value="st.key"
                size="small"
                variant="outlined"
                color="primary"
                class="font-weight-medium"
              >
                {{ st.label }}
              </v-chip>
            </v-chip-group>
          </div>

          <div class="d-flex align-center ga-1">
            <span class="text-caption text-medium-emphasis font-weight-bold">{{
              $t('reference.category_filter')
            }}</span>
            <v-chip-group
              v-model="selectedCategory"
              selected-class="v-chip--selected"
              mandatory
              filter
            >
              <v-chip
                v-for="cat in categoriesMap"
                :key="cat.key"
                :value="cat.key"
                size="small"
                variant="outlined"
                color="primary"
                class="font-weight-medium"
              >
                {{ cat.label }}
              </v-chip>
            </v-chip-group>
          </div>
        </v-col>
      </v-row>
    </v-card>

    <!-- Cards Grid -->
    <v-row v-if="filteredLinks.length > 0">
      <v-col v-for="item in filteredLinks" :key="item.id" cols="12" md="6" lg="6">
        <v-card
          elevation="2"
          class="h-100 d-flex flex-column rounded-lg bg-surface border-opacity-25"
          hover
        >
          <!-- Card Header -->
          <div class="pa-4 pb-2">
            <div class="d-flex align-start ga-3">
              <v-avatar
                :color="item.color"
                size="40"
                rounded="lg"
                class="elevation-1 flex-shrink-0"
              >
                <v-icon :icon="item.icon" color="white" size="22"></v-icon>
              </v-avatar>
              <div class="flex-grow-1">
                <div
                  class="text-subtitle-1 font-weight-bold text-wrap leading-tight text-high-emphasis"
                >
                  {{ item.title }}
                </div>
                <div class="mt-1 d-flex align-center ga-2 flex-wrap">
                  <v-chip
                    size="x-small"
                    :color="item.isOfficial ? 'success' : 'warning'"
                    variant="tonal"
                    class="font-weight-bold"
                    :prepend-icon="
                      item.isOfficial ? 'mdi-shield-check-outline' : 'mdi-account-group-outline'
                    "
                  >
                    {{
                      item.isOfficial
                        ? $t('reference.official_source')
                        : $t('reference.third_party_source')
                    }}
                  </v-chip>
                  <v-chip
                    size="x-small"
                    :color="item.color"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    {{ item.categoryLabel || item.category }}
                  </v-chip>
                  <v-chip
                    size="x-small"
                    color="secondary"
                    variant="tonal"
                    class="font-weight-medium"
                  >
                    {{ item.badge }}
                  </v-chip>
                </div>
              </div>
            </div>
          </div>

          <v-divider></v-divider>

          <!-- Card Content -->
          <v-card-text class="flex-grow-1 px-4 py-3">
            <p class="text-body-2 mb-3 text-high-emphasis">
              {{ item.description }}
            </p>

            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
              {{ $t('reference.key_takeaways') }}
            </div>

            <v-list density="compact" class="pa-0 bg-transparent">
              <v-list-item
                v-for="(highlight, idx) in item.highlights"
                :key="idx"
                density="compact"
                class="px-0 min-height-0 py-1"
              >
                <template v-slot:prepend>
                  <v-icon
                    icon="mdi-check-circle-outline"
                    color="success"
                    size="small"
                    class="mr-2"
                  ></v-icon>
                </template>
                <v-list-item-title
                  class="text-caption text-wrap leading-normal"
                  style="white-space: normal"
                >
                  {{ highlight }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>

          <v-divider></v-divider>

          <!-- Card Actions -->
          <v-card-actions class="px-4 py-3 bg-surface justify-space-between align-center">
            <v-btn
              size="small"
              variant="text"
              color="medium-emphasis"
              prepend-icon="mdi-content-copy"
              @click="copyLinkUrl(item.url)"
            >
              {{ $t('reference.copy_link') }}
            </v-btn>

            <v-btn
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
              variant="flat"
              size="small"
              append-icon="mdi-open-in-new"
              class="font-weight-bold"
            >
              {{ item.isOfficial ? $t('reference.visit_official') : $t('reference.visit_repo') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty Search Results State -->
    <v-card v-else elevation="1" class="pa-8 text-center rounded-lg bg-surface">
      <v-icon icon="mdi-link-off" size="64" color="medium-emphasis" class="mb-3"></v-icon>
      <div class="text-h6 font-weight-bold mb-1">{{ $t('reference.no_results_title') }}</div>
      <div class="text-body-2 text-medium-emphasis mb-4">
        {{ $t('reference.no_results_desc') }}
      </div>
      <v-btn
        color="primary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-refresh"
        @click="resetFilters"
      >
        {{ $t('reference.reset_filters') }}
      </v-btn>
    </v-card>

    <!-- Global Snackbar Notification -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
      location="bottom end"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" size="small" @click="snackbar.show = false">{{
          $t('app.close')
        }}</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.leading-tight {
  line-height: 1.35 !important;
}
.leading-normal {
  line-height: 1.4 !important;
}
.min-height-0 {
  min-height: 0 !important;
}
</style>
