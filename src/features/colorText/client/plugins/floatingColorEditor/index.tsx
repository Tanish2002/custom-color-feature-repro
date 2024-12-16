'use client'
import * as React from 'react'
import { createPortal } from 'react-dom'


import { PluginComponentWithAnchor } from '@payloadcms/richtext-lexical'

import { ColorEditor } from './ColorEditor'
import { ClientProps } from '../..'

export const FloatingColorTextEditorPlugin: PluginComponentWithAnchor<ClientProps> = (props) => {
  const { anchorElem = document.body } = props
  return createPortal(<ColorEditor anchorElem={anchorElem} />, anchorElem)
}
