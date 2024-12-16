import { LexicalNode } from '@payloadcms/richtext-lexical/lexical'
import { ColorTextFields } from '../../../nodes/types'


/**
 * The payload of a colorText node
 * This can be delivered from the colorText node to the drawer, or from the drawer/anything to the TOGGLE_COLOR_COMMAND
 */
export type ColorTextPayload = {
  fields: ColorTextFields
  selectedNodes?: LexicalNode[]
  /**
   * The text content of the colorText node - will be displayed in the drawer
   */
  text: null | string
}
