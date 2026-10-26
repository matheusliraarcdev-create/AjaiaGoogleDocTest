import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "h1", "h2", "h3", "ul", "ol", "li", "blockquote"],
  allowedAttributes: {},
  allowedSchemes: [],
  disallowedTagsMode: "discard",
};

export function sanitizeDocumentHtml(input: string): string {
  const clean = sanitizeHtml(input, OPTIONS).trim();
  return clean.length > 0 ? clean : "<p></p>";
}
