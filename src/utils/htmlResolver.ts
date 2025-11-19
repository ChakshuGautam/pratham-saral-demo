/**
 * Resolves <content-ref> tags in Structura HTML output
 * by replacing them with the actual HTML content from referenced blocks
 */

export function buildBlockMap(node: any, map: Record<string, any> = {}): Record<string, any> {
  if (node.id) {
    map[node.id] = node;
  }
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => buildBlockMap(child, map));
  }
  return map;
}

export function resolveContentRefs(html: string, blockMap: Record<string, any>): string {
  if (!html) return '';

  // Replace each <content-ref src='...'></content-ref> with the actual HTML
  return html.replace(/<content-ref src='([^']+)'><\/content-ref>/g, (_match, refId) => {
    const block = blockMap[refId];
    if (!block || !block.html) {
      console.warn('Missing block or HTML for reference:', refId);
      return '';
    }
    // Recursively resolve refs in the child block
    return resolveContentRefs(block.html, blockMap);
  });
}
