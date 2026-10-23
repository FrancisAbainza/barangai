// A reference number is a record's id behind its type's prefix (e.g. document request 123 → "DR-123"),
// so it isn't stored. Each domain's lib exports these for its own prefix.
export function createReferenceNumbers(prefix: string) {
  return {
    formatReferenceNumber(id: number) {
      return `${prefix}-${id}`;
    },

    // Matches a search term against reference numbers as text: "DR-12" finds the ones starting with
    // it, and bare digits ("12") the ones containing them. Returns a LIKE pattern for the id's digits,
    // or null if the term isn't part of a reference number.
    referenceNumberSearchPattern(search: string) {
      const match = search.trim().match(new RegExp(`^(${prefix}-?)?(\\d+)$`, "i"));
      if (!match) return null;
      const [, typedPrefix, digits] = match;
      return typedPrefix ? `${digits}%` : `%${digits}%`;
    },
  };
}
