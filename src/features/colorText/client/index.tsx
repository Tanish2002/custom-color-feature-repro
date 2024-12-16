'use client'


import { ToolbarGroup } from '@payloadcms/richtext-lexical'
import { createClientFeature, getSelectedNode, toolbarFeatureButtonsGroupWithItems } from '@payloadcms/richtext-lexical/client'
import { IoColorPalette } from 'react-icons/io5'
import { TOGGLE_COLOR_WITH_MODAL_COMMAND } from './plugins/floatingColorEditor/ColorEditor/commands'
import { AutoColorTextPlugin } from './plugins/autoColor'
import { FloatingColorTextEditorPlugin } from './plugins/floatingColorEditor'
import { ColorTextPlugin } from './plugins/colorText'
import { ColorTextFields } from '../nodes/types'
import { ColorTextNode, $isColorTextNode, TOGGLE_COLOR_COMMAND } from '../nodes/ColorTextNode'
import { AutoColorTextNode } from '../nodes/AutoColorTextNode'
import { ExclusiveTextColorCollectionProps } from '../server'
import { $getSelection, $isRangeSelection, LexicalNode } from '@payloadcms/richtext-lexical/lexical'
import { $findMatchingParent } from '@payloadcms/richtext-lexical/lexical/utils'

export type ClientProps = ExclusiveTextColorCollectionProps

const toolbarGroups: ToolbarGroup[] = [
  toolbarFeatureButtonsGroupWithItems([
    {
      ChildComponent: () => <IoColorPalette size={20} />,
      isActive: ({ selection }) => {
        if ($isRangeSelection(selection)) {
          const selectedNode = getSelectedNode(selection)
          const colorTextParent = $findMatchingParent(selectedNode, $isColorTextNode)
          return colorTextParent != null
        }
        return false
      },
      isEnabled: ({ selection }) => {
        return !!($isRangeSelection(selection) && $getSelection()?.getTextContent()?.length)
      },
      key: 'colorText',
      label: 'Text Color',
      onSelect: ({ editor, isActive }) => {
        if (!isActive) {
          let selectedText: string | undefined
          let selectedNodes: LexicalNode[] = []
          editor.getEditorState().read(() => {
            const selection = $getSelection()
            selectedText = selection?.getTextContent()
            selectedNodes = selection?.getNodes() ?? []
          })

          if (!selectedText?.length) {
            return
          }

          const colorTextFields: ColorTextFields = {
            textColor: '',
          }

          // Pass the initial state correctly
          editor.dispatchCommand(TOGGLE_COLOR_WITH_MODAL_COMMAND, {
            fields: colorTextFields,
            selectedNodes,
            text: selectedText,
          })
        } else {
          editor.dispatchCommand(TOGGLE_COLOR_COMMAND, null)
        }
      },
      order: 1,
    },
  ]),
]

export const ColorTextFeatureClient = createClientFeature({
  nodes: [ColorTextNode, AutoColorTextNode],
  plugins: [
    {
      Component: ColorTextPlugin,
      position: 'normal',
    },
    {
      Component: AutoColorTextPlugin,
      position: 'normal',
    },
    {
      Component: FloatingColorTextEditorPlugin,
      position: 'floatingAnchorElem',
    },
  ],
  toolbarFixed: {
    groups: toolbarGroups,
  },
  toolbarInline: {
    groups: toolbarGroups,
  },
})
