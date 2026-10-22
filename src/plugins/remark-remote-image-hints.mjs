import { visit } from 'unist-util-visit'

// Keep the largest remote Markdown images close to their actual display size.
// Supplying both dimensions lets Astro skip a full remote-image probe during
// every page render while preserving the source aspect ratio.
const imageHints = [
  {
    test: /^https:\/\/music\.artist\.cc\.cd\/images\/8\.webp(?:[?#].*)?$/,
    width: 1200,
    height: 801,
  },
]

export function remarkRemoteImageHints() {
  return (tree) => {
    visit(tree, 'image', (node) => {
      const source = decodeURI(node.url)
      const hint = imageHints.find(({ test }) => test.test(source))
      if (!hint) {
        return
      }

      node.data ??= {}
      node.data.hProperties = {
        ...node.data.hProperties,
        width: hint.width,
        height: hint.height,
      }
    })
  }
}
