# BidBlender theme system

Centralised semantic design tokens for consistent styling across the marketing site and demo app.

## Semantic classes (use these)

Defined in `app/globals.css` under `@layer components`.

### Text
| Class | Use for |
|-------|---------|
| `bb-text-primary` | Headings, important content |
| `bb-text-secondary` | Body text, labels |
| `bb-text-muted` | Captions, hints |
| `bb-text-muted-alt` | Slightly lighter muted (gray-400) |
| `bb-text-link` | Links (includes hover:underline) |
| `bb-text-error` | Error messages |
| `bb-text-accent` | Accent highlights |

### Page structure
| Class | Use for |
|-------|---------|
| `bb-page-title` | Page h1 (text-2xl font-bold) |
| `bb-page-subtitle` | Page description under title |
| `bb-section-title` | Card/section headings |

### Backgrounds
| Class | Use for |
|-------|---------|
| `bb-bg-base` | Main app background |
| `bb-bg-surface` | Cards, elevated panels |
| `bb-bg-sidebar` | Sidebar background |

### Borders
| Class | Use for |
|-------|---------|
| `bb-border-default` | Standard borders (gray-600) |
| `bb-border-subtle` | Soft borders (gray-700/50) |
| `bb-border-r-subtle` | Right border subtle |
| `bb-panel-border` | Panel dividers (border-b) |

### Interactive
| Class | Use for |
|-------|---------|
| `bb-nav-link` | Nav links (text + hover) |
| `bb-nav-link-active` | Active nav item |
| `bb-interactive-hover` | Buttons, list items (hover bg) |
| `bb-interactive-hover-subtle` | Subtle hover |
| `bb-card-hover` | Card hover (border) |
| `bb-input-focus` | Input focus ring |

### Form controls
| Class | Use for |
|-------|---------|
| `bb-input` | Text inputs |
| `bb-select` | Select dropdowns |
| `bb-checkbox` | Checkboxes |

### Components
| Class | Use for |
|-------|---------|
| `bb-card` | Card container |
| `bb-card-interactive` | Clickable card |
| `bb-list-item` | List row (checkbox-style) |
| `bb-empty-state` | Empty state container |
| `bb-panel-header` | Collapsible header |
| `bb-prompt-chip` | Suggested prompt button |
| `bb-btn-primary` | Primary CTA button |

## Audit

Run `./scripts/audit-theme.sh` to count remaining raw color classes.

## Regex replacements (for future cleanup)

```bash
# Page titles
s/text-2xl font-bold text-gray-100/bb-page-title/g

# Section titles  
s/font-semibold text-gray-100/bb-section-title/g

# Muted text
s/text-gray-400/bb-text-muted-alt/g
s/text-gray-500/bb-text-muted/g
```
