#!/bin/bash
# Audit theme usage: find raw Tailwind color classes that should use semantic tokens
# Run from project root: ./scripts/audit-theme.sh

echo "=== Raw color classes (candidates for theme tokens) ==="
echo ""
echo "text-gray-* (use bb-text-primary, bb-text-secondary, bb-text-muted):"
grep -r "text-gray-[0-9]" --include="*.tsx" --include="*.ts" app components lib 2>/dev/null | grep -v "bb-text-" | grep -v "node_modules" | wc -l

echo ""
echo "bg-gray-* (use bb-bg-*, bb-interactive-hover):"
grep -r "bg-gray-[0-9]" --include="*.tsx" --include="*.ts" app components lib 2>/dev/null | grep -v "node_modules" | wc -l

echo ""
echo "border-gray-* (use bb-border-default, bb-border-subtle):"
grep -r "border-gray-[0-9]" --include="*.tsx" --include="*.ts" app components lib 2>/dev/null | grep -v "node_modules" | wc -l

echo ""
echo "inline style= (should be in CSS):"
grep -r 'style={' --include="*.tsx" app components 2>/dev/null | grep -v "node_modules" | wc -l
