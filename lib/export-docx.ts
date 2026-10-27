import { Document, HeadingLevel, LevelFormat, Packer, Paragraph, TextRun, type INumberingOptions, type IRunOptions } from "docx";

export async function exportDocx(title: string, html: string): Promise<Blob> {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  const paragraphs: Paragraph[] = [new Paragraph({ text: title, heading: HeadingLevel.TITLE })];
  const numbering: INumberingOptions["config"][number][] = [];

  function runs(node: Node, style: IRunOptions = {}): TextRun[] {
    if (node.nodeType === 3) return [new TextRun({ ...style, text: node.textContent ?? "" })];
    if (node.nodeType !== 1) return [];
    const tag = (node as Element).tagName.toLowerCase();
    if (["script", "style", "ul", "ol"].includes(tag)) return [];
    if (tag === "br") return [new TextRun({ ...style, break: 1 })];
    const next = {
      ...style,
      ...(["strong", "b"].includes(tag) ? { bold: true } : {}),
      ...(["em", "i"].includes(tag) ? { italics: true } : {}),
      ...(tag === "u" ? { underline: {} } : {}),
    };
    return Array.from(node.childNodes).flatMap((child) => runs(child, next));
  }

  function blocks(parent: Element, level = 0, quoted = false) {
    for (const node of Array.from(parent.children)) {
      const tag = node.tagName.toLowerCase();
      if (tag === "ul" || tag === "ol") {
        const reference = `list-${numbering.length}`;
        numbering.push({
          reference,
          levels: Array.from({ length: 9 }, (_, index) => ({
            level: index,
            format: tag === "ol" ? LevelFormat.DECIMAL : LevelFormat.BULLET,
            text: tag === "ol" ? `%${index + 1}.` : "•",
            start: 1,
            style: { paragraph: { indent: { left: 720 * (index + 1), hanging: 360 } } },
          })),
        });
        for (const item of Array.from(node.children)) {
          if (item.tagName.toLowerCase() !== "li") continue;
          paragraphs.push(new Paragraph({ children: runs(item), numbering: { reference, level: Math.min(level, 8) } }));
          blocks(item, level + 1, quoted);
        }
      } else if (tag === "blockquote") {
        blocks(node, level, true);
      } else if (["p", "h1", "h2", "h3"].includes(tag)) {
        // List item paragraphs are already included by runs(item).
        if (parent.tagName.toLowerCase() === "li") continue;
        const heading = tag === "h1" ? HeadingLevel.HEADING_1 : tag === "h2" ? HeadingLevel.HEADING_2 : tag === "h3" ? HeadingLevel.HEADING_3 : undefined;
        paragraphs.push(new Paragraph({ children: runs(node), heading, ...(quoted ? { indent: { left: 720 } } : {}) }));
      } else if (!["script", "style"].includes(tag)) {
        blocks(node, level, quoted);
      }
    }
  }

  blocks(body);
  return Packer.toBlob(new Document({ title, numbering: { config: numbering }, sections: [{ children: paragraphs }] }));
}
