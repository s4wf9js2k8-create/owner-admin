export function createSearchIndex(records) {
  const documents = new Map(),
    terms = new Map();
  for (const r of records) {
    const text = [
      r.title,
      r.detail,
      r.reference,
      r.asset,
      r.company,
      r.contact,
      r.location,
      r.owner,
    ]
      .join(" ")
      .toLowerCase();
    documents.set(r.id, { record: r, text });
    for (const token of new Set(text.match(/[\p{L}\p{N}]+/gu) || [])) {
      if (!terms.has(token)) terms.set(token, new Set());
      terms.get(token).add(r.id);
    }
  }
  return { documents, terms };
}
export function searchIndex(index, query) {
  const words = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  if (!words.length) return [...index.documents.values()].map((d) => d.record);
  let ids = null;
  for (const word of words) {
    const found = new Set();
    for (const [term, rows] of index.terms)
      if (term.includes(word)) for (const id of rows) found.add(id);
    ids =
      ids === null ? found : new Set([...ids].filter((id) => found.has(id)));
  }
  return [...ids].map((id) => index.documents.get(id).record);
}
