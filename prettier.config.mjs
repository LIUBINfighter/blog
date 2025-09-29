/**
 * Central Prettier config to ensure consistent formatting across
 * .ts / .tsx / .astro / .md / .mdx files.
 */
export default {
  semi: true,
  singleQuote: false,
  printWidth: 100,
  tabWidth: 2,
  trailingComma: "all",
  arrowParens: "always",
  overrides: [
    {
      files: "*.mdx",
      options: { printWidth: 90 },
    },
    {
      files: ["*.astro"],
      options: { parser: "astro" },
    },
  ],
};
