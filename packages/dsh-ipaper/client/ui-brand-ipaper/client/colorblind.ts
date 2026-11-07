import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'

/** Blue/orange status accents preserve light/dark/system and redundant status labels. */
export const COLORBLIND_TOKENS: ThemeTokenOverrides = {
  '--dsw-alias-state-success-primary': { light: '#0072B2', dark: '#56B4E9' },
  '--dsw-alias-state-error-primary': { light: '#B54100', dark: '#E69F00' },
  '--dsw-alias-state-warn-primary': { light: '#936000', dark: '#F0C45A' },
}
