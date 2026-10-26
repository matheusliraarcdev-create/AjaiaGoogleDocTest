import fs from "node:fs";
import path from "node:path";
import { crc32 } from "node:zlib";

const files = {
  "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Imported from Word</w:t></w:r></w:p>
    <w:p><w:r><w:t>This paragraph should become an editable Folio document.</w:t></w:r></w:p>
  </w:body>
</w:document>`,
};

const locals = [];
const central = [];
let offset = 0;

for (const [name, text] of Object.entries(files)) {
  const data = Buffer.from(text);
  const nameBytes = Buffer.from(name);
  const checksum = crc32(data);
  const local = Buffer.alloc(30 + nameBytes.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8);
  local.writeUInt16LE(0, 10);
  local.writeUInt16LE(0, 12);
  local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  local.writeUInt16LE(0, 28);
  nameBytes.copy(local, 30);
  locals.push(local, data);

  const entry = Buffer.alloc(46 + nameBytes.length);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4);
  entry.writeUInt16LE(20, 6);
  entry.writeUInt16LE(0, 8);
  entry.writeUInt16LE(0, 10);
  entry.writeUInt16LE(0, 12);
  entry.writeUInt16LE(0, 14);
  entry.writeUInt32LE(checksum, 16);
  entry.writeUInt32LE(data.length, 20);
  entry.writeUInt32LE(data.length, 24);
  entry.writeUInt16LE(nameBytes.length, 28);
  entry.writeUInt16LE(0, 30);
  entry.writeUInt16LE(0, 32);
  entry.writeUInt16LE(0, 34);
  entry.writeUInt16LE(0, 36);
  entry.writeUInt32LE(0, 38);
  entry.writeUInt32LE(offset, 42);
  nameBytes.copy(entry, 46);
  central.push(entry);
  offset += local.length + data.length;
}

const centralDir = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(central.length, 8);
end.writeUInt16LE(central.length, 10);
end.writeUInt32LE(centralDir.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

const dest = path.join(process.cwd(), "samples", "word-notes.docx");
fs.writeFileSync(dest, Buffer.concat([...locals, centralDir, end]));
console.log(fs.statSync(dest).size);
