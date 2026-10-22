import { visit } from 'unist-util-visit'

// Remote markdown images bypass Astro's asset pipeline, so they keep the
// browser defaults (eager) and would otherwise sit in the critical request
// path of articles embedding R2 originals. Give them the same lazy, async
// treatment Astro applies to locally processed images. Local images already
// carry these attributes from the image service.
export function rehypeRemoteLazyImages() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') {
        return
      }

      const src = String(node.properties?.src ?? '')
      if (!/^https?:\/\//i.test(src)) {
        return
      }

      if (!node.properties.loading) {
        node.properties.loading = 'lazy'
      }
      if (!node.properties.decoding) {
        node.properties.decoding = 'async'
      }
    })
  }
}
