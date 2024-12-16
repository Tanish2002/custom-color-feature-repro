'use client'
import { useEffect } from 'react'
import type { PluginComponent } from '@payloadcms/richtext-lexical'
import { ColorTextFields } from '../../../nodes/types'
import { colorMap } from '../../../server'
import { $createAutoColorTextNode, $isAutoColorTextNode, AutoColorTextNode } from '../../../nodes/AutoColorTextNode'
import { $isColorTextNode } from '../../../nodes/ColorTextNode'
import { ClientProps } from '../..'
import type { ElementNode, LexicalEditor, LexicalNode, TextNode } from '@payloadcms/richtext-lexical/lexical'
import { $createTextNode, TextNode as TextNodeValue } from '@payloadcms/richtext-lexical/lexical'
import { mergeRegister } from '@payloadcms/richtext-lexical/lexical/utils'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'

type ChangeHandler = (textColor: null | string, prevTextColor: null | string) => void

interface ColorMatcherResult {
  fields: ColorTextFields
  index: number
  length: number
  text: string
  className: string
}

type ColorMatcher = (text: string, enabledColors: colorMap[]) => ColorMatcherResult | null

// Create regex patterns for both class and className attributes
const SPAN_CLASS_REGEX = /<span\s+class=["']([^"']+)["']\s*>([^<]+)<\/span>/
const SPAN_CLASSNAME_REGEX = /<span\s+className=["']([^"']+)["']\s*>([^<]+)<\/span>/

const createColorMatcher = (enabledColors: colorMap[]): ColorMatcher => {
  return (text: string) => {
    // Try matching both patterns
    const classMatch = SPAN_CLASS_REGEX.exec(text)
    const classNameMatch = SPAN_CLASSNAME_REGEX.exec(text)

    const match = classMatch || classNameMatch
    if (!match) return null

    const [fullMatch, className, content] = match

    // Verify the className is in enabledColors
    const matchedColor = enabledColors.find(color => className === color.className)
    if (!matchedColor) return null

    return {
      index: match.index,
      length: fullMatch.length,
      text: content, // The text inside the span
      className: className,
      fields: {
        textColor: className
      }
    }
  }
}

function $createColorTextNode_(
  nodes: TextNode[],
  match: ColorMatcherResult,
): void {
  const linkNode = $createAutoColorTextNode({ fields: match.fields })

  if (nodes.length === 1) {
    const textNode = $createTextNode(match.text)
    textNode.setFormat(nodes[0].getFormat())
    textNode.setDetail(nodes[0].getDetail())
    textNode.setStyle(nodes[0].getStyle())
    linkNode.append(textNode)
    nodes[0].replace(linkNode)
  }
}

function $handleColorCreation(
  nodes: TextNode[],
  matcher: ColorMatcher,
  enabledColors: colorMap[],
  onChange: ChangeHandler,
): void {
  const text = nodes.map((node) => node.getTextContent()).join('')
  const match = matcher(text, enabledColors)

  if (match) {
    $createColorTextNode_(nodes, match)
    onChange(match.fields.textColor, null)
  }
}

function handleColorEdit(
  autoColorTextNode: AutoColorTextNode,
  matcher: ColorMatcher,
  enabledColors: colorMap[],
  onChange: ChangeHandler,
): void {
  const text = autoColorTextNode.getTextContent()
  const match = matcher(text, enabledColors)

  if (!match) {
    replaceWithChildren(autoColorTextNode)
    onChange(null, autoColorTextNode.getFields()?.textColor ?? null)
    return
  }

  const textColor = autoColorTextNode.getFields()?.textColor
  if (textColor !== match?.fields.textColor) {
    autoColorTextNode.setFields(match.fields)
    onChange(match.fields.textColor, textColor ?? null)
  }
}

function replaceWithChildren(node: ElementNode): LexicalNode[] {
  const children = node.getChildren()
  node.getChildren().forEach(child => {
    node.insertAfter(child)
  })
  node.remove()
  return children.map((child) => child.getLatest())
}

function useAutoColorText(
  editor: LexicalEditor,
  matcher: ColorMatcher,
  enabledColors: colorMap[],
  onChange?: ChangeHandler,
): void {
  useEffect(() => {
    if (!editor.hasNodes([AutoColorTextNode])) {
      throw new Error('AutoColorTextNode not registered on editor')
    }

    const onChangeWrapped = (textColor: null | string, prevTextColor: null | string): void => {
      if (onChange != null) {
        onChange(textColor, prevTextColor)
      }
    }

    return mergeRegister(
      editor.registerNodeTransform(TextNodeValue, (textNode: TextNode) => {
        const parent = textNode.getParentOrThrow()

        if ($isAutoColorTextNode(parent)) {
          handleColorEdit(parent, matcher, enabledColors, onChangeWrapped)
        } else if (!$isColorTextNode(parent)) {
          if (textNode.isSimpleText()) {
            $handleColorCreation([textNode], matcher, enabledColors, onChangeWrapped)
          }
        }
      }),
    )
  }, [editor, matcher, enabledColors, onChange])
}

// very much not working now, TODO: fix this
export const AutoColorTextPlugin: PluginComponent<ClientProps> = ({ clientProps }) => {
  const [editor] = useLexicalComposerContext()
  const matcher = createColorMatcher(clientProps.enabledColors)

  useAutoColorText(editor, matcher, clientProps.enabledColors)

  return null
}
