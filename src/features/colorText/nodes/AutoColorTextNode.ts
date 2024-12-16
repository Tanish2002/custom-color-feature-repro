import { LexicalNode, ElementNode, RangeSelection, $applyNodeReplacement, $isElementNode } from '@payloadcms/richtext-lexical/lexical'

import { ColorTextNode } from './ColorTextNode'
import { ColorTextFields, SerializedAutoLinkNode } from './types'

export class AutoColorTextNode extends ColorTextNode {
  static clone(node: AutoColorTextNode): AutoColorTextNode {
    return new AutoColorTextNode({ id: '', fields: node.__fields, key: node.__key })
  }

  static getType(): string {
    return 'autoColorText'
  }

  static importDOM(): null {
    // TODO: Should link node should handle the import over autolink?
    return null
  }

  static importJSON(serializedNode: SerializedAutoLinkNode): AutoColorTextNode {
    const node = $createAutoColorTextNode({ fields: serializedNode.fields })

    node.setFormat(serializedNode.format)
    node.setIndent(serializedNode.indent)
    node.setDirection(serializedNode.direction)
    return node
  }

  // @ts-expect-error
  exportJSON(): SerializedAutoLinkNode {
    const serialized = super.exportJSON()
    return {
      type: 'autoColorText',
      children: serialized.children,
      direction: serialized.direction,
      fields: serialized.fields,
      format: serialized.format,
      indent: serialized.indent,
      version: 2,
    }
  }

  insertNewAfter(selection: RangeSelection, restoreSelection = true): ElementNode | null {
    const element = this.getParentOrThrow().insertNewAfter(selection, restoreSelection)
    if ($isElementNode(element)) {
      const linkNode = $createAutoColorTextNode({ fields: this.__fields })
      element.append(linkNode)
      return linkNode
    }
    return null
  }
}

export function $createAutoColorTextNode({ fields }: { fields: ColorTextFields }): AutoColorTextNode {
  return $applyNodeReplacement(new AutoColorTextNode({ id: '', fields }))
}
export function $isAutoColorTextNode(node: LexicalNode | null | undefined): node is AutoColorTextNode {
  return node instanceof AutoColorTextNode
}
