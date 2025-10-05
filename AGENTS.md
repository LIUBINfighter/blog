# Blog Project Guide for AI Agents & Developers

> **Purpose**: This document provides essential project context for AI coding agents and developers to collaborate efficiently on this AstroPaper-based blog.

## 🏗️ Project Overview

- **Framework**: Astro 5.12.0 (Static Site Generator)
- **Theme**: AstroPaper
- **Language**: TypeScript, MDX, React
- **Styling**: Tailwind CSS 4.x
- **Package Manager**: pnpm
- **Deployment**: GitHub Pages at `https://blog.jay-bridge.dev/`

## 📂 Project Structure

```plaintext
blog/
├── src/
│   ├── config.ts              # Site configuration (SITE object)
│   ├── content.config.ts      # Content schema definition
│   ├── data/blog/             # 📝 BLOG POSTS HERE
│   │   ├── 2023/
│   │   ├── 2024/
│   │   └── 2025/
│   ├── assets/images/         # Images (optimized by Astro)
│   ├── components/            # Astro & React components
│   ├── layouts/               # Page layouts
│   └── pages/                 # Route pages
├── public/                    # Static assets (no processing)
├── astro.config.ts            # Astro configuration
└── package.json               # Dependencies & scripts
```

## 🚀 Essential Commands

```bash
# Development
pnpm dev              # Start dev server at http://localhost:4321
pnpm build            # Build for production (includes Astro check + Pagefind)
pnpm preview          # Preview production build

# Code Quality
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting
pnpm lint             # Lint with ESLint
pnpm lint:fix         # Auto-fix linting issues
pnpm check            # Run format:check + lint

# Utilities
pnpm astro --help     # Astro CLI help
pnpm sync             # Sync content collections
```

## 📝 Creating Blog Posts

### File Location
- Path: `src/data/blog/YYYY/filename.mdx`
- Example: `src/data/blog/2025/my-post.mdx`

### Minimal Schema (3 Required Fields)

```yaml
---
title: "Post Title"
description: "Brief description for SEO and cards"
pubDatetime: 2025-10-06T10:00:00+08:00
---

## Your Content Here
```

### Full Schema Reference

```yaml
---
# Required
title: string                    # Post title
description: string              # SEO description (50-160 chars recommended)
pubDatetime: Date                # ISO 8601 format with timezone

# Optional
slug: string                     # Custom URL (default: filename)
author: string                   # Default: "Jay Bridge"
modDatetime: Date | null         # Last modified time
featured: boolean                # Highlight on homepage
draft: boolean                   # true = not published
tags: string[]                   # Default: ["others"]
cover: ImagePath | string        # Cover image
ogImage: ImagePath | string      # Open Graph image
canonicalURL: string             # Canonical URL for SEO
hideEditPost: boolean            # Hide edit button
timezone: string                 # Default: "Asia/Shanghai"
---
```

### Content Features

**Markdown Support**
- Standard Markdown syntax
- Code highlighting (Shiki: light=min-light, dark=night-owl)
- Math equations (KaTeX): inline `$E=mc^2$`, block `$$...$$`
- Auto-generated TOC (use heading: `## Table of contents`)

**Code Blocks**
````markdown
```javascript title="example.js" {2,4-6}
const normal = "normal line";
const highlighted = "highlighted"; // line 2 highlighted
const added = "new code";  // [!code ++]
const removed = "old code"; // [!code --]
```
````

**Images**
```markdown
# Method 1: Optimized assets (recommended)
![Alt text](@/assets/images/2025/post-name/image.jpg)

# Method 2: Public static files
![Alt text](/public/image.jpg)
```

**MDX Components**
```mdx
import MyComponent from "@/components/react/MyComponent";

<MyComponent client:only="react" prop="value" />
```

## 🎯 Common Tasks for AI Agents

### Task: Create New Blog Post
1. Create file: `src/data/blog/YYYY/slug-name.mdx`
2. Add frontmatter with required fields
3. Write content in Markdown/MDX
4. (Optional) Add images to `src/assets/images/YYYY/slug-name/`
5. Run `pnpm dev` to preview

### Task: Add Image to Post
1. Create directory: `src/assets/images/YYYY/post-name/`
2. Add image files (prefer WebP)
3. Reference in post: `![Alt](@/assets/images/YYYY/post-name/image.webp)`

### Task: Update Site Configuration
- Edit `src/config.ts` for site metadata
- Edit `astro.config.ts` for build settings
- Edit `src/content.config.ts` for content schema

### Task: Fix Errors
```bash
pnpm astro check        # Type checking
pnpm lint               # Linting errors
pnpm format:check       # Format issues
```

## 🔧 Content Schema (src/content.config.ts)

```typescript
// Blog posts location
export const BLOG_PATH = "src/data";

// Schema validation (Zod)
const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: z.object({
    // ... see Full Schema Reference above
  })
});
```

**Important Notes**:
- Files starting with `_` are ignored
- Pattern matches `.md` and `.mdx` files
- Loader uses glob from `src/data` directory

## 🎨 Site Configuration (src/config.ts)

```typescript
export const SITE = {
  website: "https://blog.jay-bridge.dev/",
  author: "Jay Bridge",
  profile: "https://github.com/LIUBINfighter",
  desc: "Jay Bridge's Blog",
  title: "Jay Bridge's Blog",
  lightAndDarkMode: true,
  postPerIndex: 4,           // Posts on homepage
  postPerPage: 8,            // Posts per archive page
  showArchives: true,
  showBackButton: true,
  editPost: {
    enabled: true,
    text: "编辑页面",
    url: "https://github.com/liubinfighter/blog/edit/main/",
  },
  lang: "zh-cn",
  timezone: "Asia/Shanghai",
} as const;
```

## 📦 Key Dependencies

**Core**
- `astro`: Static site generator
- `react` + `react-dom`: Client-side components
- `tailwindcss`: Utility-first CSS

**Content**
- `@astrojs/mdx`: MDX support
- `remark-math` + `rehype-katex`: Math equations
- `remark-toc`: Table of contents
- `@pagefind/default-ui`: Search functionality

**Code Highlighting**
- `@shikijs/transformers`: Advanced code features

**Image Processing**
- `sharp`: Image optimization
- `@resvg/resvg-js`: SVG processing

## 🐛 Troubleshooting

### Post Not Showing
- ✅ Check `draft: false`
- ✅ Ensure file in `src/data/blog/YYYY/`
- ✅ Filename doesn't start with `_`
- ✅ Valid YAML frontmatter

### Image Not Displaying
- ✅ Use `@/assets/images/...` path
- ✅ Verify file exists
- ✅ Restart dev server

### Build Errors
```bash
pnpm astro check        # Type errors
pnpm lint:fix           # Auto-fix lint issues
pnpm format             # Format code
```

## 🎯 Best Practices for AI Agents

### When Creating Files
1. **Use absolute paths** starting from workspace root
2. **Follow naming convention**: `kebab-case.mdx`
3. **Always include required frontmatter fields**
4. **Add appropriate tags** (3-5 recommended)

### When Reading Context
1. Check `src/content.config.ts` for schema
2. Review existing posts in `src/data/blog/` for examples
3. Read `src/config.ts` for site settings

### When Suggesting Changes
1. Show minimal context (3-5 lines before/after)
2. Preserve exact indentation and whitespace
3. Never use placeholder comments like `// ...existing code...`

### Token Efficiency
- Reference this file for project context
- Cite specific sections instead of repeating content
- Use minimal examples from existing posts

## 📚 Reference Posts

Good examples for different post types:
- **Simple text**: `src/data/blog/2025/believe-build.mdx`
- **Technical guide**: `src/data/blog/2025/alphaTab.mdx`
- **Tutorial**: `src/data/blog/2025/how-to-write-post.mdx`
- **Review**: `src/data/blog/2024/course-review.mdx`

## 🔗 Important Files

| File | Purpose |
|------|---------|
| `src/config.ts` | Site metadata and settings |
| `src/content.config.ts` | Content schema definition |
| `astro.config.ts` | Astro build configuration |
| `package.json` | Dependencies and scripts |
| `src/data/blog/` | Blog post directory |

## 📖 Additional Resources

- Full tutorial: See `src/data/blog/2025/how-to-write-post.mdx`
- Astro docs: https://docs.astro.build
- AstroPaper theme: https://github.com/satnaing/astro-paper

---

**For AI Agents**: Always reference this file first for project context. Ask for clarification if requirements are unclear. Preserve existing code style and conventions.
