// "St. Petersburg" and "Saint Petersburg" should match
export const normalizePlace = (s) =>
  s.toLowerCase().replace(/\./g, '').replace(/\bsaint\b/g, 'st').replace(/\s+/g, ' ').trim()