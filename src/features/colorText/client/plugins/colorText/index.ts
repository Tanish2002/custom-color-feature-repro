'use client'
import { PluginComponent } from '@payloadcms/richtext-lexical'
import {
  COMMAND_PRIORITY_LOW,
} from 'lexical'
import { useEffect } from 'react'
import { ColorTextPayload } from '../floatingColorEditor/types'
import { ClientProps } from '../..'
import { AutoColorTextNode } from '../../../nodes/AutoColorTextNode'
import { $toggleLink, TOGGLE_COLOR_COMMAND } from '../../../nodes/ColorTextNode'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import { mergeRegister } from '@payloadcms/richtext-lexical/lexical/utils'



export const ColorTextPlugin: PluginComponent<ClientProps> = () => {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!editor.hasNodes([AutoColorTextNode])) {
      throw new Error('ColorTextPlugin: ColorTextNode not registered on editor')
    }
    return mergeRegister(
      editor.registerCommand(
        TOGGLE_COLOR_COMMAND,
        (payload: ColorTextPayload) => {
          $toggleLink(payload)
          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])

  return null
}
