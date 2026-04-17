import type { Theme } from '@/types/theme';
import { withPrColors } from './prColors';

// import amoled_dark_Raw from './amoled-dark.json';
// import amoled_light_Raw from './amoled-light.json';
import aura_dark_Raw from './aura-dark.json';
import aura_light_Raw from './aura-light.json';
import ayu_dark_Raw from './ayu-dark.json';
import ayu_light_Raw from './ayu-light.json';
import carbonfox_dark_Raw from './carbonfox-dark.json';
import carbonfox_light_Raw from './carbonfox-light.json';
import catppuccin_dark_Raw from './catppuccin-dark.json';
import catppuccin_light_Raw from './catppuccin-light.json';
// import cursor_dark_Raw from './cursor-dark.json';
// import cursor_light_Raw from './cursor-light.json';
import dracula_dark_Raw from './dracula-dark.json';
import dracula_light_Raw from './dracula-light.json';
import github_dark_Raw from './github-dark.json';
// import github_light_Raw from './github-light.json';
import gruvbox_dark_Raw from './gruvbox-dark.json';
import gruvbox_light_Raw from './gruvbox-light.json';
import kanagawa_dark_Raw from './kanagawa-dark.json';
import kanagawa_light_Raw from './kanagawa-light.json';
// import lucent_orng_dark_Raw from './lucent-orng-dark.json';
// import lucent_orng_light_Raw from './lucent-orng-light.json';
import monokai_dark_Raw from './monokai-dark.json';
import monokai_light_Raw from './monokai-light.json';
import nightowl_dark_Raw from './nightowl-dark.json';
import nightowl_light_Raw from './nightowl-light.json';
import nord_dark_Raw from './nord-dark.json';
import nord_light_Raw from './nord-light.json';
// import oc_2_dark_Raw from './oc-2-dark.json';
// import oc_2_light_Raw from './oc-2-light.json';
import ipaper_dark_Raw from './fields-of-the-shire-dark.json';
import ipaper_light_Raw from './fields-of-the-shire-light.json';
import onedarkpro_dark_Raw from './onedarkpro-dark.json';
import onedarkpro_light_Raw from './onedarkpro-light.json';
// import orng_dark_Raw from './orng-dark.json';
// import orng_light_Raw from './orng-light.json';
// import rosepine_dark_Raw from './rosepine-dark.json';
// import rosepine_light_Raw from './rosepine-light.json';
// import shadesofpurple_dark_Raw from './shadesofpurple-dark.json';
// import shadesofpurple_light_Raw from './shadesofpurple-light.json';
import solarized_dark_Raw from './solarized-dark.json';
import solarized_light_Raw from './solarized-light.json';
import tokyonight_dark_Raw from './tokyonight-dark.json';
import tokyonight_light_Raw from './tokyonight-light.json';
// import vercel_dark_Raw from './vercel-dark.json';
// import vercel_light_Raw from './vercel-light.json';
import vesper_dark_Raw from './vesper-dark.json';
import vesper_light_Raw from './vesper-light.json';
// import zenburn_dark_Raw from './zenburn-dark.json';
// import zenburn_light_Raw from './zenburn-light.json';
import mono_plus_dark_Raw from './mono-plus-dark.json';
import mono_plus_light_Raw from './mono-plus-light.json';
import mono_dark_Raw from './mono-dark.json';
import mono_light_Raw from './mono-light.json';
import vitesse_dark_dark_Raw from './vitesse-dark-dark.json';
import vitesse_light_light_Raw from './vitesse-light-light.json';

const githubDarkColorblindTheme: Theme = {
  ...(github_dark_Raw as Theme),
  metadata: {
    ...(github_dark_Raw as Theme).metadata,
    id: 'github-dark-colorblind',
    name: 'GitHub Dark Colorblind',
    description: 'Ported from the iKanban GitHub Dark Colorblind theme',
    tags: ['dark', 'opencode', 'ported', 'github', 'colorblind'],
  },
  colors: {
    ...(github_dark_Raw as Theme).colors,
    status: {
      ...(github_dark_Raw as Theme).colors.status,
      info: '#79c0ff',
      infoBackground: '#0d2748',
      infoBorder: '#1f6feb',
    },
    pr: {
      ...((github_dark_Raw as Theme).colors.pr ?? {}),
      open: '#3fb950',
      draft: '#8b949e',
      blocked: '#d29922',
      merged: '#58a6ff',
      closed: '#f85149',
    },
    syntax: {
      ...((github_dark_Raw as Theme).colors.syntax ?? {}),
      base: {
        ...((github_dark_Raw as Theme).colors.syntax?.base ?? {}),
        string: '#56d364',
        number: '#79c0ff',
        function: '#79c0ff',
        variable: '#d2a8ff',
        type: '#d2a8ff',
      },
      tokens: {
        ...((github_dark_Raw as Theme).colors.syntax?.tokens ?? {}),
        functionCall: '#79c0ff',
        method: '#79c0ff',
        variableProperty: '#79c0ff',
        variableOther: '#d2a8ff',
        variableGlobal: '#79c0ff',
        parameter: '#d2a8ff',
        constant: '#79c0ff',
        class: '#d2a8ff',
        className: '#d2a8ff',
        interface: '#d2a8ff',
        struct: '#d2a8ff',
        enum: '#d2a8ff',
        typeParameter: '#d2a8ff',
        namespace: '#d2a8ff',
        tagAttribute: '#79c0ff',
        tagAttributeValue: '#79c0ff',
        boolean: '#79c0ff',
      },
      highlights: {
        ...((github_dark_Raw as Theme).colors.syntax?.highlights ?? {}),
        diffAdded: '#79c0ff',
        diffAddedBackground: '#0d2748',
        diffRemoved: '#ffb77c',
        diffRemovedBackground: '#3a2312',
      },
    },
    sidebar: {
      ...((github_dark_Raw as Theme).colors.sidebar ?? {}),
      active: '#0d2748',
      accent: '#58a6ff',
    },
    markdown: {
      ...((github_dark_Raw as Theme).colors.markdown ?? {}),
      heading1: '#79c0ff',
      heading2: '#79c0ff',
      link: '#58a6ff',
      linkHover: '#79c0ff',
      bold: '#ff7b72',
      italic: '#d29922',
      listMarker: '#79c0ff99',
    },
    tools: {
      ...((github_dark_Raw as Theme).colors.tools ?? {}),
      edit: {
        ...((github_dark_Raw as Theme).colors.tools?.edit ?? {}),
        added: '#79c0ff',
        addedBackground: '#0d2748',
        removed: '#ffb77c',
        removedBackground: '#3a2312',
      },
      bash: {
        ...((github_dark_Raw as Theme).colors.tools?.bash ?? {}),
        info: '#79c0ff',
      },
      lsp: {
        ...((github_dark_Raw as Theme).colors.tools?.lsp ?? {}),
        info: '#79c0ff',
      },
    },
  },
};

export const presetThemes: Theme[] = [
  ipaper_dark_Raw as Theme,
  ipaper_light_Raw as Theme,
  // amoled_dark_Raw as Theme,
  // amoled_light_Raw as Theme,
  aura_dark_Raw as Theme,
  aura_light_Raw as Theme,
  ayu_dark_Raw as Theme,
  ayu_light_Raw as Theme,
  carbonfox_dark_Raw as Theme,
  carbonfox_light_Raw as Theme,
  catppuccin_dark_Raw as Theme,
  catppuccin_light_Raw as Theme,
  // cursor_dark_Raw as Theme,
  // cursor_light_Raw as Theme,
  dracula_dark_Raw as Theme,
  dracula_light_Raw as Theme,
  githubDarkColorblindTheme,
  // github_dark_Raw as Theme,
  // github_light_Raw as Theme,
  gruvbox_dark_Raw as Theme,
  gruvbox_light_Raw as Theme,
  kanagawa_dark_Raw as Theme,
  kanagawa_light_Raw as Theme,
  // lucent_orng_dark_Raw as Theme,
  // lucent_orng_light_Raw as Theme,
  monokai_dark_Raw as Theme,
  monokai_light_Raw as Theme,
  nightowl_dark_Raw as Theme,
  nightowl_light_Raw as Theme,
  nord_dark_Raw as Theme,
  nord_light_Raw as Theme,
  // oc_2_dark_Raw as Theme,
  // oc_2_light_Raw as Theme,
  onedarkpro_dark_Raw as Theme,
  onedarkpro_light_Raw as Theme,
  // orng_dark_Raw as Theme,
  // orng_light_Raw as Theme,
  // rosepine_dark_Raw as Theme,
  // rosepine_light_Raw as Theme,
  // shadesofpurple_dark_Raw as Theme,
  // shadesofpurple_light_Raw as Theme,
  solarized_dark_Raw as Theme,
  solarized_light_Raw as Theme,
  tokyonight_dark_Raw as Theme,
  tokyonight_light_Raw as Theme,
  // vercel_dark_Raw as Theme,
  // vercel_light_Raw as Theme,
  vesper_dark_Raw as Theme,
  vesper_light_Raw as Theme,
  // zenburn_dark_Raw as Theme,
  // zenburn_light_Raw as Theme,
  mono_plus_dark_Raw as Theme,
  mono_plus_light_Raw as Theme,
  mono_dark_Raw as Theme,
  mono_light_Raw as Theme,
  vitesse_dark_dark_Raw as Theme,
  vitesse_light_light_Raw as Theme,
].map((theme) => withPrColors(theme));
