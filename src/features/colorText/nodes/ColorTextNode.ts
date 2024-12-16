import type { BaseSelection, DOMConversionMap, EditorConfig, ElementNode as ElementNodeType, LexicalNode, NodeKey, RangeSelection, DOMConversionOutput, LexicalCommand } from "@payloadcms/richtext-lexical/lexical"
import { $createParagraphNode, $isRangeSelection, $applyNodeReplacement, ElementNode, $createTextNode, $getSelection, $isElementNode, createCommand } from '@payloadcms/richtext-lexical/lexical'
import { ColorTextFields, SerializedLinkNode } from "./types"
import { addClassNamesToElement } from "@payloadcms/richtext-lexical/lexical/utils"
import { isHTMLElement } from "@payloadcms/richtext-lexical/client"
import ObjectID from 'bson-objectid'
import { ColorTextPayload } from "../client/plugins/floatingColorEditor/types"

/** @noInheritDoc */
export class ColorTextNode extends ElementNode {
  __fields: ColorTextFields
  __id: string

  constructor({
    id,
    fields = {
      textColor: ''
    },
    key,
  }: {
    fields: ColorTextFields
    id: string
    key?: NodeKey
  }) {
    super(key)
    this.__fields = fields
    this.__id = id
  }

  static clone(node: ColorTextNode): ColorTextNode {
    return new ColorTextNode({
      id: node.__id,
      fields: node.__fields,
      key: node.__key,
    })
  }

  static getType(): string {
    return 'colorText'
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (node: Node) => ({
        conversion: $convertAnchorElement,
        priority: 1,
      }),
    }
  }

  static importJSON(serializedNode: SerializedLinkNode): ColorTextNode {

    serializedNode.id = new ObjectID().toHexString()
    serializedNode.version = 3

    const node = $createColorTextNode({
      id: serializedNode.id,
      fields: serializedNode.fields,
    })
    node.setFormat(serializedNode.format)
    node.setIndent(serializedNode.indent)
    node.setDirection(serializedNode.direction)
    return node
  }

  canBeEmpty(): false {
    return false
  }

  canInsertTextAfter(): false {
    return false
  }

  canInsertTextBefore(): false {
    return false
  }

  createDOM(_: EditorConfig): HTMLSpanElement {
    const element = document.createElement('span')
    addClassNamesToElement(element, this.__fields.textColor)
    return element
  }

  exportJSON(): SerializedLinkNode {
    const returnObject: SerializedLinkNode = {
      ...super.exportJSON(),
      type: 'colorText',
      fields: this.getFields(),
      version: 3,
    }
    const id = this.getID()
    if (id) {
      returnObject.id = id
    }
    return returnObject
  }

  extractWithChild(
    child: LexicalNode,
    selection: BaseSelection,
    destination: 'clone' | 'html',
  ): boolean {
    if (!$isRangeSelection(selection)) {
      return false
    }

    const anchorNode = selection.anchor.getNode()
    const focusNode = selection.focus.getNode()

    return (
      this.isParentOf(anchorNode) &&
      this.isParentOf(focusNode) &&
      selection.getTextContent().length > 0
    )
  }

  getFields(): ColorTextFields {
    return this.getLatest().__fields
  }

  getID(): string {
    return this.getLatest().__id
  }

  insertNewAfter(selection: RangeSelection, restoreSelection = true): ElementNodeType | null {
    const element = this.getParentOrThrow().insertNewAfter(selection, restoreSelection)
    if ($isElementNode(element)) {
      const linkNode = $createColorTextNode({ fields: this.__fields })
      element.append(linkNode)
      return linkNode
    }
    return null
  }

  isInline(): true {
    return true
  }

  setFields(fields: ColorTextFields): void {
    const writable = this.getWritable()
    writable.__fields = fields
  }

  updateDOM(prevNode: ColorTextNode, span: HTMLSpanElement, config: EditorConfig): boolean {
    const className = this.__fields?.textColor
    addClassNamesToElement(span, className)
    return false
  }
}

function $convertAnchorElement(domNode: Node): DOMConversionOutput {
  let node: ColorTextNode | null = null
  if (isHTMLElement(domNode)) {
    const content = domNode.textContent
    if (content !== null && content !== '') {
      node = $createColorTextNode({
        id: new ObjectID().toHexString(),
        fields: {
          textColor: domNode.className,
        },
      })
    }
  }
  return { node }
}

export function $createColorTextNode({ id, fields }: { fields: ColorTextFields; id?: string }): ColorTextNode {
  return $applyNodeReplacement(
    new ColorTextNode({
      id: id ?? new ObjectID().toHexString(),
      fields,
    }),
  )
}

export function $isColorTextNode(node: LexicalNode | null | undefined): node is ColorTextNode {
  return node instanceof ColorTextNode
}

export const TOGGLE_COLOR_COMMAND: LexicalCommand<ColorTextPayload | null> =
  createCommand('TOGGLE_COLOR_COMMAND')

export function $toggleLink(payload: ColorTextPayload): void {
  const selection = $getSelection()

  if (!$isRangeSelection(selection) && !payload.selectedNodes?.length) {
    return
  }
  const nodes = $isRangeSelection(selection) ? selection.extract() : payload.selectedNodes

  if (payload === null) {
    // Remove LinkNodes
    nodes?.forEach((node) => {
      const parent = node.getParent()

      if ($isColorTextNode(parent)) {
        const children = parent.getChildren()

        if (parent?.__parent === "root") {
          const paragraph = $createParagraphNode()
          children.forEach((child) => paragraph.append(child))
          parent.replace(paragraph)
        } else {
          // Normal case - move children to the same level as parent
          children.forEach((child) => {
            parent.insertBefore(child)
          })
          parent.remove()
        }
      }
    })
  } else {
    // Add or merge LinkNodes
    if (nodes?.length === 1) {
      const firstNode = nodes[0]
      // if the first node is a LinkNode or if its
      // parent is a LinkNode, we update the URL, target and rel.
      const linkNode: ColorTextNode | null = $isColorTextNode(firstNode)
        ? firstNode
        : $getLinkAncestor(firstNode)
      if (linkNode !== null) {
        linkNode.setFields(payload.fields)

        if (payload.text != null && payload.text !== linkNode.getTextContent()) {
          // remove all children and add child with new textcontent:
          linkNode.append($createTextNode(payload.text))
          linkNode.getChildren().forEach((child) => {
            if (child !== linkNode.getLastChild()) {
              child.remove()
            }
          })
        }
        return
      }
    }

    let prevParent: ElementNodeType | ColorTextNode | null = null
    let linkNode: ColorTextNode | null = null

    nodes?.forEach((node) => {
      const parent = node.getParent()

      if (parent === linkNode || parent === null || ($isElementNode(node) && !node.isInline())) {
        return
      }

      if ($isColorTextNode(parent)) {
        linkNode = parent
        parent.setFields(payload.fields)
        if (payload.text != null && payload.text !== parent.getTextContent()) {
          // remove all children and add child with new textcontent:
          parent.append($createTextNode(payload.text))
          parent.getChildren().forEach((child) => {
            if (child !== parent.getLastChild()) {
              child.remove()
            }
          })
        }
        return
      }

      if (!parent.is(prevParent)) {
        prevParent = parent
        linkNode = $createColorTextNode({ fields: payload.fields })

        if ($isColorTextNode(parent)) {
          if (node.getPreviousSibling() === null) {
            parent.insertBefore(linkNode)
          } else {
            parent.insertAfter(linkNode)
          }
        } else {
          node.insertBefore(linkNode)
        }
      }

      if ($isColorTextNode(node)) {
        if (node.is(linkNode)) {
          return
        }
        if (linkNode !== null) {
          const children = node.getChildren()

          for (let i = 0; i < children.length; i += 1) {
            linkNode.append(children[i])
          }
        }

        node.remove()
        return
      }

      if (linkNode !== null) {
        linkNode.append(node)
      }
    })
  }
}

function $getLinkAncestor(node: LexicalNode): ColorTextNode | null {
  return $getAncestor(node, (ancestor) => $isColorTextNode(ancestor)) as ColorTextNode
}

function $getAncestor(
  node: LexicalNode,
  predicate: (ancestor: LexicalNode) => boolean,
): LexicalNode | null {
  let parent: LexicalNode | null = node
  while (parent !== null) {
    parent = parent.getParent()
    if (parent === null || predicate(parent)) {
      break
    }
  }
  return parent
}
