/**
 * Minimal rehype plugin: convert mermaid code blocks to <pre class="mermaid"> elements.
 *
 * This replaces the rehype-mermaid package to avoid pulling the 583KB mermaid library
 * into the client bundle at build time. The actual mermaid rendering is done client-side
 * by MediaEmbed.astro via dynamic import().
 */

/** Extract raw text content from a HAST node tree */
function extractText(node) {
  if (node.type === 'text')
    return node.value
  if (node.children)
    return node.children.map(extractText).join('')
  return ''
}

export default function rehypeMermaidPre() {
  return (tree) => {
    // Use a recursive visitor manually to avoid external dependencies
    function visit(node) {
      if (!node || !node.children)
        return

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]
        if (!child || child.type !== 'element')
          continue

        // Look for <pre> containing <code class="language-mermaid">
        if (child.tagName === 'pre' && child.children) {
          for (const codeChild of child.children) {
            if (
              codeChild.type === 'element'
              && codeChild.tagName === 'code'
              && Array.isArray(codeChild.properties?.className)
              && codeChild.properties.className.includes('language-mermaid')
            ) {
              const diagram = extractText(codeChild)

              // Replace <pre> with <pre class="mermaid">
              node.children.splice(i, 1, {
                type: 'element',
                tagName: 'pre',
                properties: { className: ['mermaid'] },
                children: [{ type: 'text', value: diagram }],
              })
              break
            }
          }
        }

        // Recurse into children
        visit(child)
      }
    }

    visit(tree)
  }
}
