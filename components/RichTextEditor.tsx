"use client";

import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef } from "react";

type RichTextEditorProps = {
  initialHtml: string;
  editable: boolean;
  autofocus: boolean;
  onChange: (html: string) => void;
};

export default function RichTextEditor({ initialHtml, editable, autofocus, onChange }: RichTextEditorProps) {
  const readyAt = useRef(Date.now() + 200);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        horizontalRule: false,
      }),
      Underline,
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: initialHtml,
    editable,
    autofocus: autofocus ? "end" : false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "doc-body",
        "aria-label": "Document body",
      },
    },
    onUpdate: ({ editor: current }) => {
      if (Date.now() < readyAt.current) return;
      onChange(current.getHTML());
    },
  });

  if (!editor) return <div className="paper paper-loading">Opening the editor…</div>;

  return (
    <div className="editor-stack">
      {editable ? <Toolbar editor={editor} /> : null}
      <div className={`paper ${editable ? "" : "is-readonly"}`}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <ToolButton label="Text" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()} />
      <ToolButton label="H1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <ToolButton label="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolButton label="H3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <span className="tool-sep" aria-hidden="true" />
      <ToolButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <span className="tool-sep" aria-hidden="true" />
      <ToolButton label="Bullets" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolButton label="Numbers" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <span className="shortcut-hint">Ctrl+B, Ctrl+I, Ctrl+U</span>
    </div>
  );
}

function ToolButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`tool-button ${active ? "is-active" : ""}`}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
