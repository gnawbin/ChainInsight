/**
 * Mantine requires PostCSS for its `postcss-preset-mantine` mixins and for the
 * breakpoint variables used by its CSS modules.
 *
 * Tailwind was removed during the Mantine migration, so there is no second
 * styling system to reconcile here.
 */
module.exports = {
  plugins: {
    "postcss-preset-mantine": {},
    "postcss-simple-vars": {
      variables: {
        "mantine-breakpoint-xs": "36em",
        "mantine-breakpoint-sm": "48em",
        "mantine-breakpoint-md": "62em",
        "mantine-breakpoint-lg": "75em",
        "mantine-breakpoint-xl": "88em",
      },
    },
  },
};
