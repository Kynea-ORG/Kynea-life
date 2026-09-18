// tiptap-markdown no aumenta el tipo Storage de @tiptap/core por su cuenta
// — sin esto, `editor.storage.markdown` no tipa (Storage es un diccionario
// abierto). Augmentation mínima, solo para el campo que usamos.
import type { MarkdownStorage } from 'tiptap-markdown';

declare module '@tiptap/core' {
  interface Storage {
    markdown: MarkdownStorage;
  }
}
