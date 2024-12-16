'use client'
import type { Data, FormState } from 'payload'

import {
  CloseMenuIcon,
  EditIcon,
  formatDrawerSlug,
  useEditDepth,
} from '@payloadcms/ui'

import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { ColorTextPayload } from '../types'
import { FieldsDrawer, getSelectedNode, setFloatingElemPositionForLinkEditor, useEditorConfigContext, useLexicalDrawer } from '@payloadcms/richtext-lexical/client'
import { TOGGLE_COLOR_WITH_MODAL_COMMAND } from './commands'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import { ColorTextFields } from '@/features/colorText/nodes/types'
import { $getSelection, $isLineBreakNode, $isRangeSelection, COMMAND_PRIORITY_HIGH, COMMAND_PRIORITY_LOW, ElementNode, KEY_ESCAPE_COMMAND, LexicalNode, SELECTION_CHANGE_COMMAND } from '@payloadcms/richtext-lexical/lexical'
import { $findMatchingParent, mergeRegister } from '@payloadcms/richtext-lexical/lexical/utils'
import { $createColorTextNode, $isColorTextNode, TOGGLE_COLOR_COMMAND } from '@/features/colorText/nodes/ColorTextNode'
import { $isAutoColorTextNode } from '@/features/colorText/nodes/AutoColorTextNode'


export function ColorEditor({ anchorElem }: { anchorElem: HTMLElement }): React.ReactNode {
  const [editor] = useLexicalComposerContext()
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [textColor, setTextColor] = useState<null | string>(null)

  const {
    fieldProps: { schemaPath },
    uuid,
  } = useEditorConfigContext()

  const [stateData, setStateData] = useState<
    ({ id?: string; text: string } & ColorTextFields) | undefined
  >()

  const editDepth = useEditDepth()
  const [isTextColor, setIsTextColor] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<LexicalNode[]>([])

  const [isAutoColorText, setIsAutoColorText] = useState(false)

  const drawerSlug = formatDrawerSlug({
    slug: `lexical-rich-text-colorText-` + uuid,
    depth: editDepth,
  })

  const { toggleDrawer } = useLexicalDrawer(drawerSlug)

  const setNotColorText = useCallback(() => {
    setIsTextColor(false)
    if (editorRef && editorRef.current) {
      editorRef.current.style.opacity = '0'
      editorRef.current.style.transform = 'translate(-10000px, -10000px)'
    }
    setIsAutoColorText(false)
    setTextColor(null)
    setSelectedNodes([])
    setStateData(undefined)
  }, [setIsTextColor, setTextColor, setSelectedNodes])

  const $updateTextColorEditor = useCallback(() => {
    const selection = $getSelection()
    let selectedNodeDomRect: DOMRect | undefined

    if (!$isRangeSelection(selection) || !selection) {
      setNotColorText()
      return
    }

    // Handle the data displayed in the floating textColor editor & drawer when you click on a textColor node

    const focusNode = getSelectedNode(selection)
    selectedNodeDomRect = editor.getElementByKey(focusNode.getKey())?.getBoundingClientRect()
    const focusColorTextParent = $findMatchingParent(focusNode, $isColorTextNode)

    // Prevent colorText modal from showing if selection spans further than the colorText: https://github.com/facebook/lexical/issues/4064
    const badNode = selection
      .getNodes()
      .filter((node) => !$isLineBreakNode(node))
      .find((node) => {
        const colorTextNode = $findMatchingParent(node, $isColorTextNode)
        return (
          (focusColorTextParent && !focusColorTextParent.is(colorTextNode)) ||
          (colorTextNode && !colorTextNode.is(focusColorTextParent))
        )
      })

    if (focusColorTextParent == null || badNode) {
      setNotColorText()
      return
    }

    // Initial state:
    const data: { text: string } & ColorTextFields = {
      ...focusColorTextParent.getFields(),
      id: focusColorTextParent.getID(),
      text: focusColorTextParent.getTextContent(),
    }

    setTextColor(focusColorTextParent.getFields()?.textColor ?? null)
    setStateData(data)
    setIsTextColor(true)
    setSelectedNodes(selection ? selection?.getNodes() : [])

    if ($isAutoColorTextNode(focusColorTextParent)) {
      setIsAutoColorText(true)
    } else {
      setIsAutoColorText(false)
    }

    const editorElem = editorRef.current
    const nativeSelection = window.getSelection()
    const { activeElement } = document

    if (editorElem === null) {
      return
    }

    const rootElement = editor.getRootElement()

    if (
      nativeSelection !== null &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      if (!selectedNodeDomRect) {
        // Get the DOM rect of the selected node using the native selection. This sometimes produces the wrong
        // result, which is why we use lexical's selection preferably.
        selectedNodeDomRect = nativeSelection.getRangeAt(0).getBoundingClientRect()
      }

      if (selectedNodeDomRect != null) {
        selectedNodeDomRect.y += 40
        setFloatingElemPositionForLinkEditor(selectedNodeDomRect, editorElem, anchorElem)
      }
    } else if (activeElement == null || activeElement.className !== 'link-input') {
      if (rootElement !== null) {
        setFloatingElemPositionForLinkEditor(null, editorElem, anchorElem)
      }
      setTextColor(null)
    }

    return true
  }, [editor, setNotColorText, anchorElem])

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        TOGGLE_COLOR_WITH_MODAL_COMMAND,
        (payload: ColorTextPayload) => {
          editor.dispatchCommand(TOGGLE_COLOR_COMMAND, payload)

          // Now, open the modal
          $updateTextColorEditor()
          toggleDrawer()

          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor, $updateTextColorEditor, toggleDrawer, drawerSlug])

  useEffect(() => {
    const scrollerElem = anchorElem.parentElement

    const update = (): void => {
      editor.getEditorState().read(() => {
        void $updateTextColorEditor()
      })
    }

    window.addEventListener('resize', update)

    if (scrollerElem != null) {
      scrollerElem.addEventListener('scroll', update)
    }

    return () => {
      window.removeEventListener('resize', update)

      if (scrollerElem != null) {
        scrollerElem.removeEventListener('scroll', update)
      }
    }
  }, [anchorElem.parentElement, editor, $updateTextColorEditor])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          void $updateTextColorEditor()
        })
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          void $updateTextColorEditor()
          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (isTextColor) {
            setNotColorText()

            return true
          }
          return false
        },
        COMMAND_PRIORITY_HIGH,
      ),
    )
  }, [editor, $updateTextColorEditor, isTextColor, setNotColorText])

  useEffect(() => {
    editor.getEditorState().read(() => {
      void $updateTextColorEditor()
    })
  }, [editor, $updateTextColorEditor])

  return (
    <React.Fragment>
      <div className="link-editor" ref={editorRef}>
        <div className="link-input">
          {textColor && textColor.length > 0 ? (
            <span className={textColor}>
              {textColor}
            </span>
          ) : null}

          {editor.isEditable() && (
            <React.Fragment>
              <button
                aria-label="Edit color"
                className="link-edit"
                onClick={() => {
                  toggleDrawer()
                }}
                onMouseDown={(event) => {
                  event.preventDefault()
                }}
                tabIndex={0}
                type="button"
              >
                <EditIcon />
              </button>
              {!isAutoColorText && (
                <button
                  aria-label="Remove color"
                  className="link-trash"
                  onClick={() => {
                    editor.dispatchCommand(TOGGLE_COLOR_COMMAND, null)
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault()
                  }}
                  tabIndex={0}
                  type="button"
                >
                  <CloseMenuIcon />
                </button>
              )}
            </React.Fragment>
          )}
        </div>
      </div>
      <FieldsDrawer
        className="lexical-link-edit-drawer"
        data={stateData}
        drawerSlug={drawerSlug}
        drawerTitle={`Edit Text Color`}
        featureKey="colorText"
        handleDrawerSubmit={(fields: FormState, data: Data) => {
          const newColorTextPayload = data as { text: string } & ColorTextFields

          const bareColorTextFields: ColorTextFields = {
            textColor: newColorTextPayload.textColor,
          }

          editor.update(() => {
            const selection = $getSelection()
            let colorTextParent: ElementNode | null = null
            if ($isRangeSelection(selection)) {
              colorTextParent = getSelectedNode(selection).getParent()
            } else {
              if (selectedNodes.length) {
                colorTextParent = selectedNodes[0].getParent()
              }
            }

            if (colorTextParent) {
              const colorTextNode = $createColorTextNode({
                fields: bareColorTextFields,
              })
              colorTextParent.replace(colorTextNode, true)
            }

            // Always dispatch the command to create/update the colorText
            editor.dispatchCommand(TOGGLE_COLOR_COMMAND, {
              fields: bareColorTextFields,
              selectedNodes,
              text: newColorTextPayload.text,
            })
          })
        }}
        schemaPath={schemaPath}
        schemaPathSuffix="fields"
      />
    </React.Fragment>
  )
}
