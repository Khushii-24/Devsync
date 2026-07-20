// frontend/src/lib/docToText.js

// Walks the TipTap JSON tree and extracts visible text, with paragraph/
// heading/list-item boundaries as newlines so the diff reads naturally
// instead of one giant run-on line. Mentions render as "@Name" so they
// show up meaningfully in the diff rather than vanishing.
export function docToText(node) {
  if (!node) return '';

  if (node.type === 'text') return node.text || '';
  if (node.type === 'mention') return `@${node.attrs?.label || ''}`;

  const childText = (node.content || []).map(docToText).join('');

  const blockTypes = ['paragraph', 'heading', 'listItem', 'codeBlock'];
  return blockTypes.includes(node.type) ? childText + '\n' : childText;
}