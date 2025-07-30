# Accessibility Implementation Guide

## Overview

The BP Logistics Dashboard has been enhanced with comprehensive WCAG 2.1 AA accessibility features to ensure equal access for all users, including those using assistive technologies.

## 🌟 Key Accessibility Features

### ♿ WCAG 2.1 AA Compliance
- **Color Contrast**: All text meets minimum 4.5:1 contrast ratio requirements
- **Keyboard Navigation**: Full keyboard accessibility throughout the application
- **Screen Reader Support**: Comprehensive ARIA labeling and semantic HTML
- **Focus Management**: Visible focus indicators and proper focus trapping
- **Responsive Design**: Accessible across all device sizes and orientations

### 🎯 Core Accessibility Components

#### 1. AccessibilityProvider
Global accessibility context that manages:
- System preference detection (high contrast, reduced motion)
- User accessibility settings
- Global keyboard shortcuts
- ARIA live regions for announcements

```tsx
import { AccessibilityProvider, useAccessibility } from './components/accessibility/AccessibilityProvider';

function App() {
  return (
    <AccessibilityProvider>
      {/* Your app content */}
    </AccessibilityProvider>
  );
}
```

#### 2. AccessibleKPICard
WCAG compliant KPI display component with:
- Proper ARIA labeling
- Keyboard navigation
- Screen reader optimized content
- High contrast support

```tsx
import AccessibleKPICard from './components/accessibility/AccessibleKPICard';

<AccessibleKPICard
  title="Vessel Utilization"
  value={85.3}
  unit="%"
  trend={2.1}
  isPositive={true}
  tooltip="Percentage of time vessels are actively working"
  target={90}
/>
```

#### 3. AccessibleNavigation
Fully accessible navigation with:
- Skip links
- Keyboard navigation
- ARIA landmarks
- Mobile accessibility

```tsx
import AccessibleNavigation from './components/accessibility/AccessibleNavigation';

<AccessibleNavigation
  navigationItems={navigationItems}
  currentPath={location.pathname}
  brandName="BP Logistics Dashboard"
/>
```

#### 4. AccessibleTable
Comprehensive table accessibility:
- Table headers and captions
- Keyboard navigation
- Sortable columns
- Search and filter functionality

```tsx
import AccessibleTable from './components/accessibility/AccessibleTable';

<AccessibleTable
  data={tableData}
  columns={columns}
  caption="Vessel performance data"
  searchable={true}
  sortable={true}
/>
```

## 🔧 Accessibility Utilities

### Focus Management
```typescript
import { focusManagement } from './utils/accessibility';

// Trap focus within a modal
const cleanup = focusManagement.trapFocus(modalElement);

// Move focus programmatically
focusManagement.moveFocusToNext();
focusManagement.moveFocusToPrevious();
```

### Screen Reader Announcements
```typescript
import { screenReader } from './utils/accessibility';

// Announce messages to screen readers
screenReader.announce('Data has been updated', 'polite');
screenReader.announce('Error occurred', 'assertive');
```

### Color Contrast Checking
```typescript
import { colorContrast } from './utils/accessibility';

// Check contrast ratios
const isCompliant = colorContrast.meetsAAContrast('#333333', '#ffffff');
const textColor = colorContrast.getHighContrastText('#0066cc');
```

### Custom Hooks
```typescript
import { useAriaLiveRegion, useKeyboardNavigation } from './utils/accessibility';

function MyComponent() {
  const { announce } = useAriaLiveRegion();
  const { currentIndex, handleKeyDown } = useKeyboardNavigation(itemCount);
  
  // Use in your component logic
}
```

## 🎨 Accessibility Styles

### CSS Classes Available
```css
/* Screen reader only content */
.sr-only

/* Focus management */
.focus-trap
.focus-visible

/* High contrast support */
.high-contrast

/* Large text support */
.large-text

/* Reduced motion support */
.reduce-motion

/* Skip links */
.skip-link
```

### System Preference Support
The application automatically detects and respects:
- `prefers-contrast: high`
- `prefers-reduced-motion: reduce`
- `prefers-color-scheme: dark` (planned)

## ⌨️ Keyboard Navigation

### Global Shortcuts
- **Tab**: Navigate through focusable elements
- **Shift + Tab**: Navigate backwards
- **F6**: Cycle through main page sections
- **Escape**: Close modals/dropdowns
- **Ctrl/Cmd + /**: Focus search (when available)
- **Alt + 1-9**: Quick navigation to landmarks

### Component-Specific Navigation
- **Arrow Keys**: Navigate within grids, menus, and tables
- **Enter/Space**: Activate buttons and links
- **Home/End**: Go to first/last item in lists
- **Page Up/Down**: Navigate through paginated content

## 📱 Mobile Accessibility

- **Touch Targets**: Minimum 44px touch targets
- **Gesture Alternatives**: All gestures have keyboard/button alternatives
- **Orientation Support**: Works in both portrait and landscape
- **Zoom Support**: Up to 200% zoom without horizontal scrolling

## 🧪 Testing and Validation

### Automated Testing
```bash
# Run accessibility audit
npm run audit:accessibility

# Run with ESLint accessibility rules
npm run lint
```

### Manual Testing Checklist
- [ ] Navigate entire app using only keyboard
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify color contrast meets WCAG AA standards
- [ ] Test with high contrast mode enabled
- [ ] Verify reduced motion preferences are respected
- [ ] Test at 200% zoom level
- [ ] Validate on mobile devices

### Accessibility Audit Tool
```typescript
import { runAccessibilityAudit, generateAccessibilityReport } from './utils/accessibilityAudit';

// Run comprehensive audit
const results = await runAccessibilityAudit();
const reportHTML = generateAccessibilityReport(results);
```

## 📋 Implementation Checklist

### ✅ Completed Features
- [x] WCAG 2.1 AA color contrast compliance
- [x] Comprehensive keyboard navigation
- [x] Screen reader optimization
- [x] ARIA labeling and landmarks
- [x] Focus management and trapping
- [x] Skip links and navigation aids
- [x] System preference detection
- [x] High contrast mode support
- [x] Reduced motion support
- [x] Accessible form controls
- [x] Table accessibility
- [x] Image alt text requirements
- [x] Heading structure validation
- [x] Link accessibility
- [x] Error message accessibility

### 🔄 Ongoing Improvements
- [ ] Dark mode accessibility (planned)
- [ ] Voice control support (planned)
- [ ] Enhanced mobile gestures (planned)
- [ ] Multi-language support (planned)

## 🛠️ Development Guidelines

### Adding New Components
1. Use semantic HTML elements
2. Include proper ARIA attributes
3. Ensure keyboard accessibility
4. Test with screen readers
5. Validate color contrast

### Code Review Checklist
- Forms have associated labels
- Images have appropriate alt text
- Interactive elements are keyboard accessible
- Color is not the only way to convey information
- Text has sufficient contrast
- Headings follow logical hierarchy

### Testing New Features
1. Test keyboard-only navigation
2. Verify screen reader announcements
3. Check high contrast mode appearance
4. Validate focus indicators
5. Test on mobile devices

## 📚 Resources and References

### WCAG 2.1 Guidelines
- [WCAG 2.1 AA Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/?levels=aa)
- [WebAIM Accessibility Checklist](https://webaim.org/standards/wcag/checklist)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)

### Screen Readers for Testing
- **NVDA** (Windows, free): https://www.nvaccess.org/
- **JAWS** (Windows, paid): https://www.freedomscientific.com/products/software/jaws/
- **VoiceOver** (macOS/iOS, built-in): Built into Apple devices
- **TalkBack** (Android, built-in): Built into Android devices

## 🤝 Support and Maintenance

### Reporting Accessibility Issues
1. Document the specific barrier encountered
2. Include steps to reproduce
3. Specify assistive technology used
4. Provide expected vs. actual behavior

### Regular Maintenance
- Run accessibility audits monthly
- Update dependencies regularly
- Test with latest assistive technologies
- Monitor WCAG guideline updates

---

**Note**: Accessibility is an ongoing process. This implementation provides a solid foundation, but continuous testing and improvement ensure the best experience for all users.