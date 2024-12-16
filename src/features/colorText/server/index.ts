import type {
  Config,
  Field,
  FieldAffectingData,
  FieldSchemaMap,
  SanitizedConfig,
} from 'payload'

import { sanitizeFields } from 'payload'

import { convertLexicalNodesToHTML, createNode, createServerFeature } from '@payloadcms/richtext-lexical';
import { getBaseFields } from './baseFields';
import { AutoColorTextNode } from '../nodes/AutoColorTextNode';
import { ColorTextNode } from '../nodes/ColorTextNode';
import { ClientProps } from 'src/features/colorText/client/index';

export interface colorMap {
  label: string;
  className: string;
}

export type ExclusiveTextColorCollectionProps = {
  enabledColors: colorMap[]
}

export type TextColorFeatureServerProps = {
  fields?:
  | ((args: {
    config: SanitizedConfig
    defaultFields: FieldAffectingData[]
  }) => (Field | FieldAffectingData)[])
  | Field[]
} & ExclusiveTextColorCollectionProps

export const ColorTextFeature = createServerFeature<
  ExclusiveTextColorCollectionProps,
  TextColorFeatureServerProps,
  ClientProps
>({
  feature: async ({ config: _config, isRoot, parentIsLocalized, props }) => {
    const validRelationships = _config.collections.map((c) => c.slug) || []

    const sanitizedProps: TextColorFeatureServerProps = props;
    const _transformedFields = getBaseFields(props.enabledColors)

    // Strip any functions or non-serializable data from fields
    const sanitizedFields = await sanitizeFields({
      config: _config as unknown as Config,
      fields: _transformedFields as Field[],
      parentIsLocalized,
      requireFieldLevelRichTextEditor: isRoot,
      validRelationships,
    })

    const sanitizedFieldsWithoutText = sanitizedFields.filter(
      (field) => !('name' in field) || field.name !== 'text',
    )

    sanitizedProps.fields = sanitizedFields
    return {
      ClientFeature: {
        path: '/features/colorText/client',
        exportName: 'ColorTextFeatureClient',
      },
      clientFeatureProps: {
        enabledColors: sanitizedProps.enabledColors,
      } as ExclusiveTextColorCollectionProps,
      generateSchemaMap: () => {
        const schemaMap: FieldSchemaMap = new Map()

        schemaMap.set('fields', {
          fields: sanitizedFields,
        })

        return schemaMap
      },
      nodes: [
        createNode({
          node: AutoColorTextNode,
          converters: {
            html: {
              converter: async ({
                converters,
                currentDepth,
                depth,
                draft,
                node,
                overrideAccess,
                parent,
                req,
                showHiddenFields,
              }) => {
                const childrenText = await convertLexicalNodesToHTML({
                  converters,
                  currentDepth,
                  depth,
                  draft,
                  lexicalNodes: node.children,
                  overrideAccess,
                  parent: {
                    ...node,
                    parent,
                  },
                  req,
                  showHiddenFields,
                })
                const className = node.fields.textColor
                return `<span class="${className}">${childrenText}</span>`
              },
              nodeTypes: [AutoColorTextNode.getType()],
            },
          },
        }),
        createNode({
          node: ColorTextNode,
          converters: {
            html: {
              converter: async ({
                converters,
                currentDepth,
                depth,
                draft,
                node,
                overrideAccess,
                parent,
                req,
                showHiddenFields,
              }) => {
                const childrenText = await convertLexicalNodesToHTML({
                  converters,
                  currentDepth,
                  depth,
                  draft,
                  lexicalNodes: node.children,
                  overrideAccess,
                  parent: {
                    ...node,
                    parent,
                  },
                  req,
                  showHiddenFields,
                })

                const className = node.fields.textColor

                return `<span class="${className}">${childrenText}</span>`
              },
              nodeTypes: [ColorTextNode.getType()],
            },
          },
          getSubFields: () => {
            return sanitizedFieldsWithoutText
          },
          getSubFieldsData: ({ node }) => {
            return node?.fields
          },
        }),
      ],
      sanitizedServerFeatureProps: sanitizedProps,
    }
  },
  key: 'colorText',
})
