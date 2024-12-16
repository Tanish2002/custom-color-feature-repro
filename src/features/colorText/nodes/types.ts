import type { JsonValue } from 'payload'
import { colorMap } from '../server'
import { SerializedElementNode, SerializedLexicalNode, Spread } from '@payloadcms/richtext-lexical/lexical'

export type ColorTextFields = {
  [key: string]: JsonValue
  textColor: colorMap['className'],
}

export type SerializedLinkNode<T extends SerializedLexicalNode = SerializedLexicalNode> = Spread<
  {
    fields: ColorTextFields
    id?: string // optional if AutoLinkNode
    type: 'colorText'
  },
  SerializedElementNode<T>
>

export type SerializedAutoLinkNode<T extends SerializedLexicalNode = SerializedLexicalNode> = {
  type: 'autoColorText'
} & Omit<SerializedLinkNode<T>, 'id' | 'type'>
