// baseFields.ts
import type { FieldAffectingData } from 'payload'
import { colorMap } from '.'

export const getBaseFields = (
  enabledColors: colorMap[],
): FieldAffectingData[] => {
  const baseFields: FieldAffectingData[] = [
    {
      name: 'text',
      type: 'text',
      label: 'Text to display',
      required: true,
    },
    {
      name: 'textColor',
      type: 'select',
      admin: {
        description: 'Color of the text',
      },
      defaultValue: enabledColors[0].className,  // Make sure to use className here
      label: 'Text Color',
      options: enabledColors.map(color => ({
        label: color.label,
        value: color.className,
      })),
      required: true,
    },
  ]
  return baseFields
}
