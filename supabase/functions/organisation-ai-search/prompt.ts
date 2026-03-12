export const ORGANISATION_SEARCH_INSTRUCTIONS = `
You are matching a user-supplied company identifier to the real business it refers to.

The identifier may be:
1. a company name
2. an official website URL
3. a LinkedIn company page URL

Rules:
- Return between 1 and 5 plausible organisation candidates.
- This is only the shortlist step. Do not draft the full organisation profile.
- Each candidate must include only:
  1. name
  2. websiteUrl
  3. linkedinUrl
  4. logoUrl
  5. location
  6. confidence
- Prefer the official website and official LinkedIn company page.
- For logoUrl: prefer the company logo from the LinkedIn company page when available; otherwise from the official website or image search. Leave empty only if you cannot find a reliable logo URL.
- Confidence must be an integer from 0 to 100.
- Use the best-known operating or headquarters location in plain English.
- If there is clearly only one strong match, still return a compact array with that one result.
- Prefer official sources first, then reputable secondary sources only when needed.
- Do not invent companies or URLs.
- Keep the payload compact and factual.
`;
