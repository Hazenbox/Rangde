/**
 * Design Tokens for UI Consistency
 * 
 * Centralized spacing, sizing, and styling constants to ensure
 * harmonious and pixel-perfect alignment across all components.
 */

export const DESIGN_TOKENS = {
  // Sidebar Tokens
  sidebar: {
    width: {
      standard: 'w-60', // 240px - standard sidebar width
      chat: 'w-[312px]', // 312px - AI chat sidebar width
    },
    header: {
      padding: 'px-3 pt-4 pb-3',
      height: 'h-14', // 56px
      titleSize: 'text-[14px]',
      titleWeight: 'font-semibold',
    },
    content: {
      paddingHorizontal: 'px-3',
      sectionPaddingVertical: 'py-2',
      sectionGap: 'gap-2',
      scrollPadding: 'p-3',
    },
    search: {
      padding: 'px-3 py-2',
      inputHeight: 'h-8',
      inputTextSize: 'text-xs',
      iconSize: 'h-3.5 w-3.5',
    },
    button: {
      size: 'h-7 w-7',
      shape: 'rounded-full',
      iconSize: 'h-3 w-3',
    },
    border: 'border-r border-border/30',
    background: 'bg-sidebar-background',
  },

  // Main Container Tokens
  main: {
    header: {
      padding: 'px-4 pt-4 pb-3',
      titleSize: 'text-[14px]',
      titleWeight: 'font-semibold',
    },
    content: {
      paddingHorizontal: 'px-4',
      spacing: 'space-y-4',
      gap: 'gap-4',
    },
  },

  // Toolbar Tokens
  toolbar: {
    shape: 'rounded-full',
    padding: 'px-1.5 py-1',
    gap: 'gap-1',
    button: {
      size: 'h-7 w-7',
      shape: 'rounded-full',
      iconSize: 'h-3 w-3',
    },
    background: 'bg-background/95 backdrop-blur-sm',
    border: 'border',
    shadow: 'shadow-lg',
  },

  // Common spacing values
  spacing: {
    sectionGap: 'gap-2',
    itemGap: 'gap-1',
    contentSpacing: 'space-y-2',
  },

  // Typography
  typography: {
    heading: 'text-[14px] font-semibold',
    body: 'text-xs',
    caption: 'text-[10px]',
    label: 'text-[11px]',
  },
} as const;

/**
 * Helper function to combine design tokens with additional classes
 */
export function withTokens(...tokens: (string | undefined | false)[]) {
  return tokens.filter(Boolean).join(' ');
}
