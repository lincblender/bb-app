/**
 * Predefined suggestion lists for organisation profile fields.
 * Users can select from these or enter free text. Steering toward common values
 * helps track commonalities and trends across organisations.
 */

/** Common capability names (procurement-relevant) */
export const CAPABILITY_NAMES = [
  "Cloud Migration",
  "Cybersecurity",
  "Digital Transformation",
  "Data Analytics",
  "Managed Services",
  "Software Development",
  "System Integration",
  "Project Delivery",
  "Change Management",
  "Business Analysis",
] as const;

/** Capability categories (procurement-relevant groupings) */
export const CAPABILITY_CATEGORIES = [
  "Cloud & Infrastructure",
  "Cybersecurity",
  "Data & Analytics",
  "Digital Transformation",
  "Consulting",
  "Managed Services",
  "Software Development",
  "Integration",
  "Project Delivery",
  "General",
] as const;

/** Organisation-level certifications (ISO, IRAP, FedRAMP, etc.) */
export const ORG_CERTIFICATIONS = [
  "ISO 27001",
  "ISO 9001",
  "ISO 14001",
  "ISO 45001",
  "SOC 2 Type II",
  "SOC 2 Type I",
  "FedRAMP",
  "IRAP assessed",
  "IRAP certified",
  "PCI DSS",
  "HIPAA",
  "GDPR compliant",
  "CIS Controls",
  "NIST CSF",
  "Essential Eight",
] as const;

/** Common issuers for organisation certifications */
export const ORG_CERT_ISSUERS = [
  "ISO",
  "ACSC",
  "IRAP",
  "FedRAMP",
  "AICPA",
  "PCI SSC",
  "ANSI",
  "IEC",
] as const;

/** Individual qualifications (AWS, degrees, vendor certs) */
export const INDIVIDUAL_QUALIFICATIONS = [
  "AWS Solutions Architect Professional",
  "AWS Solutions Architect Associate",
  "AWS Developer Associate",
  "AWS SysOps Administrator",
  "AWS DevOps Professional",
  "Microsoft Azure Administrator",
  "Microsoft Azure Solutions Architect",
  "Google Cloud Professional",
  "CISSP",
  "CISM",
  "CEH",
  "CompTIA Security+",
  "PMP",
  "PRINCE2",
  "Bachelor of Computer Science",
  "Bachelor of Engineering",
  "Master of Business Administration",
  "PhD",
] as const;

/** Common issuers for individual qualifications */
export const INDIVIDUAL_QUAL_ISSUERS = [
  "AWS",
  "Microsoft",
  "Google",
  "CompTIA",
  "ISC2",
  "PMI",
  "AXELOS",
  "University",
] as const;

/** Sectors (ANZSIC-inspired, procurement-relevant) */
export const SECTORS = [
  "Government",
  "Defence",
  "Health",
  "Education",
  "Finance",
  "Utilities",
  "Transport",
  "Digital transformation",
  "Construction",
  "Manufacturing",
  "Agriculture",
] as const;

/** Target markets */
export const TARGET_MARKETS = [
  "Federal government",
  "State government",
  "Local government",
  "Defence",
  "Health",
  "Education",
  "Utilities",
  "Private sector",
] as const;
