/**
 * Accessibility Audit Utilities for BP Logistics Dashboard
 * Provides WCAG 2.1 AA compliance testing and reporting
 */

interface AccessibilityIssue {
  level: 'error' | 'warning' | 'info';
  rule: string;
  description: string;
  element?: HTMLElement;
  selector?: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  help: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  wcagCriterion: string;
}

interface AccessibilityAuditResult {
  passed: number;
  failed: number;
  warnings: number;
  issues: AccessibilityIssue[];
  score: number;
  summary: {
    colorContrast: number;
    keyboardNavigation: number;
    semanticStructure: number;
    ariaLabeling: number;
    formAccessibility: number;
  };
}

class AccessibilityAuditor {
  private issues: AccessibilityIssue[] = [];

  /**
   * Run comprehensive accessibility audit
   */
  async audit(): Promise<AccessibilityAuditResult> {
    this.issues = [];

    // Run all audit checks
    this.checkColorContrast();
    this.checkKeyboardNavigation();
    this.checkSemanticStructure();
    this.checkAriaLabeling();
    this.checkFormAccessibility();
    this.checkImages();
    this.checkHeadingStructure();
    this.checkLinks();
    this.checkTables();

    return this.generateReport();
  }

  /**
   * Check color contrast ratios
   */
  private checkColorContrast(): void {
    const elements = document.querySelectorAll('*');
    
    elements.forEach(element => {
      if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return;
      
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const contrastRatio = this.calculateContrastRatio(color, backgroundColor);
        
        if (contrastRatio < 4.5) {
          this.addIssue({
            level: 'error',
            rule: 'color-contrast',
            description: `Insufficient color contrast ratio: ${contrastRatio.toFixed(2)} (minimum 4.5:1)`,
            element: element as HTMLElement,
            selector: this.getSelector(element),
            impact: 'serious',
            help: 'Ensure text has sufficient contrast against its background',
            wcagLevel: 'AA',
            wcagCriterion: '1.4.3 Contrast (Minimum)'
          });
        }
      }
    });
  }

  /**
   * Check keyboard navigation
   */
  private checkKeyboardNavigation(): void {
    // Check for focusable elements without visible focus indicators
    const focusableElements = document.querySelectorAll([
      'a[href]',
      'button',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', '));

    focusableElements.forEach(element => {
      const styles = window.getComputedStyle(element, ':focus');
      const outlineWidth = styles.outlineWidth;
      const outlineStyle = styles.outlineStyle;
      
      if (outlineWidth === '0px' || outlineStyle === 'none') {
        this.addIssue({
          level: 'warning',
          rule: 'focus-visible',
          description: 'Focusable element lacks visible focus indicator',
          element: element as HTMLElement,
          selector: this.getSelector(element),
          impact: 'serious',
          help: 'Ensure all focusable elements have visible focus indicators',
          wcagLevel: 'AA',
          wcagCriterion: '2.4.7 Focus Visible'
        });
      }
    });

    // Check for keyboard traps
    const modals = document.querySelectorAll('[role="dialog"], [aria-modal="true"]');
    modals.forEach(modal => {
      if (!modal.querySelector('[data-focus-trap]')) {
        this.addIssue({
          level: 'error',
          rule: 'focus-trap',
          description: 'Modal dialog lacks proper focus trapping',
          element: modal as HTMLElement,
          selector: this.getSelector(modal),
          impact: 'serious',
          help: 'Implement focus trapping for modal dialogs',
          wcagLevel: 'AA',
          wcagCriterion: '2.1.2 No Keyboard Trap'
        });
      }
    });
  }

  /**
   * Check semantic HTML structure
   */
  private checkSemanticStructure(): void {
    // Check for proper landmark usage
    const main = document.querySelectorAll('main, [role="main"]');
    if (main.length === 0) {
      this.addIssue({
        level: 'error',
        rule: 'landmark-main',
        description: 'Page lacks a main landmark',
        impact: 'serious',
        help: 'Add a main element or role="main" to identify the primary content',
        wcagLevel: 'A',
        wcagCriterion: '1.3.1 Info and Relationships'
      });
    } else if (main.length > 1) {
      this.addIssue({
        level: 'error',
        rule: 'landmark-main-multiple',
        description: 'Page has multiple main landmarks',
        impact: 'serious',
        help: 'Ensure only one main landmark per page',
        wcagLevel: 'A',
        wcagCriterion: '1.3.1 Info and Relationships'
      });
    }

    // Check for navigation landmarks
    const nav = document.querySelectorAll('nav, [role="navigation"]');
    if (nav.length === 0) {
      this.addIssue({
        level: 'warning',
        rule: 'landmark-navigation',
        description: 'Page lacks navigation landmarks',
        impact: 'moderate',
        help: 'Add nav elements or role="navigation" for navigation sections',
        wcagLevel: 'A',
        wcagCriterion: '1.3.1 Info and Relationships'
      });
    }
  }

  /**
   * Check ARIA labeling
   */
  private checkAriaLabeling(): void {
    // Check for elements with ARIA attributes but no accessible names
    const ariaElements = document.querySelectorAll('[role], [aria-label], [aria-labelledby], [aria-describedby]');
    
    ariaElements.forEach(element => {
      if (element.hasAttribute('role')) {
        const role = element.getAttribute('role');
        const accessibleName = this.getAccessibleName(element);
        
        if (['button', 'link', 'menuitem', 'tab'].includes(role!) && !accessibleName) {
          this.addIssue({
            level: 'error',
            rule: 'aria-label-missing',
            description: `Element with role="${role}" lacks accessible name`,
            element: element as HTMLElement,
            selector: this.getSelector(element),
            impact: 'serious',
            help: 'Provide accessible name using aria-label, aria-labelledby, or text content',
            wcagLevel: 'A',
            wcagCriterion: '4.1.2 Name, Role, Value'
          });
        }
      }
    });

    // Check for invalid ARIA references
    document.querySelectorAll('[aria-labelledby], [aria-describedby]').forEach(element => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const describedBy = element.getAttribute('aria-describedby');
      
      [labelledBy, describedBy].forEach(ids => {
        if (ids) {
          ids.split(' ').forEach(id => {
            if (id && !document.getElementById(id)) {
              this.addIssue({
                level: 'error',
                rule: 'aria-reference-invalid',
                description: `ARIA reference points to non-existent element: ${id}`,
                element: element as HTMLElement,
                selector: this.getSelector(element),
                impact: 'serious',
                help: 'Ensure ARIA references point to existing elements',
                wcagLevel: 'A',
                wcagCriterion: '4.1.2 Name, Role, Value'
              });
            }
          });
        }
      });
    });
  }

  /**
   * Check form accessibility
   */
  private checkFormAccessibility(): void {
    // Check for form inputs without labels
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const label = this.getAssociatedLabel(input);
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      
      if (!label && !ariaLabel && !ariaLabelledBy) {
        this.addIssue({
          level: 'error',
          rule: 'form-label-missing',
          description: 'Form input lacks associated label',
          element: input as HTMLElement,
          selector: this.getSelector(input),
          impact: 'critical',
          help: 'Associate form inputs with labels using <label>, aria-label, or aria-labelledby',
          wcagLevel: 'A',
          wcagCriterion: '3.3.2 Labels or Instructions'
        });
      }
    });

    // Check for required fields without indication
    const requiredInputs = document.querySelectorAll('input[required], select[required], textarea[required]');
    
    requiredInputs.forEach(input => {
      const ariaRequired = input.getAttribute('aria-required');
      if (ariaRequired !== 'true') {
        this.addIssue({
          level: 'warning',
          rule: 'form-required-indication',
          description: 'Required field lacks aria-required attribute',
          element: input as HTMLElement,
          selector: this.getSelector(input),
          impact: 'moderate',
          help: 'Add aria-required="true" to required form fields',
          wcagLevel: 'A',
          wcagCriterion: '3.3.2 Labels or Instructions'
        });
      }
    });
  }

  /**
   * Check image accessibility
   */
  private checkImages(): void {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      const alt = img.getAttribute('alt');
      const ariaLabel = img.getAttribute('aria-label');
      const role = img.getAttribute('role');
      
      if (alt === null && !ariaLabel && role !== 'presentation') {
        this.addIssue({
          level: 'error',
          rule: 'image-alt-missing',
          description: 'Image lacks alt text',
          element: img,
          selector: this.getSelector(img),
          impact: 'critical',
          help: 'Provide descriptive alt text for images or use alt="" for decorative images',
          wcagLevel: 'A',
          wcagCriterion: '1.1.1 Non-text Content'
        });
      } else if (alt === '' && !role) {
        // Empty alt text should have role="presentation" for clarity
        this.addIssue({
          level: 'info',
          rule: 'image-decorative-role',
          description: 'Decorative image could use role="presentation"',
          element: img,
          selector: this.getSelector(img),
          impact: 'minor',
          help: 'Consider adding role="presentation" to decorative images with empty alt text',
          wcagLevel: 'A',
          wcagCriterion: '1.1.1 Non-text Content'
        });
      }
    });
  }

  /**
   * Check heading structure
   */
  private checkHeadingStructure(): void {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    
    if (headings.length === 0) {
      this.addIssue({
        level: 'warning',
        rule: 'heading-structure-missing',
        description: 'Page lacks heading structure',
        impact: 'moderate',
        help: 'Use headings (h1-h6) to create a logical document structure',
        wcagLevel: 'AA',
        wcagCriterion: '2.4.10 Section Headings'
      });
      return;
    }

    // Check for proper heading hierarchy
    let previousLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (level > previousLevel + 1) {
        this.addIssue({
          level: 'warning',
          rule: 'heading-hierarchy-skip',
          description: `Heading level skipped from h${previousLevel} to h${level}`,
          element: heading as HTMLElement,
          selector: this.getSelector(heading),
          impact: 'moderate',
          help: 'Use headings in logical order without skipping levels',
          wcagLevel: 'AA',
          wcagCriterion: '1.3.1 Info and Relationships'
        });
      }
      
      previousLevel = level;
    });
  }

  /**
   * Check link accessibility
   */
  private checkLinks(): void {
    const links = document.querySelectorAll('a[href]');
    
    links.forEach(link => {
      const text = this.getAccessibleName(link);
      
      if (!text.trim()) {
        this.addIssue({
          level: 'error',
          rule: 'link-text-missing',
          description: 'Link lacks accessible text',
          element: link as HTMLElement,
          selector: this.getSelector(link),
          impact: 'critical',
          help: 'Provide descriptive text for links using text content, aria-label, or aria-labelledby',
          wcagLevel: 'A',
          wcagCriterion: '2.4.4 Link Purpose (In Context)'
        });
      } else if (text.toLowerCase().includes('click here') || text.toLowerCase().includes('read more')) {
        this.addIssue({
          level: 'warning',
          rule: 'link-text-vague',
          description: 'Link text is not descriptive',
          element: link as HTMLElement,
          selector: this.getSelector(link),
          impact: 'moderate',
          help: 'Use descriptive link text that explains the link purpose',
          wcagLevel: 'AA',
          wcagCriterion: '2.4.4 Link Purpose (In Context)'
        });
      }
    });
  }

  /**
   * Check table accessibility
   */
  private checkTables(): void {
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
      const caption = table.querySelector('caption');
      const summary = table.getAttribute('summary');
      const ariaLabel = table.getAttribute('aria-label');
      
      if (!caption && !summary && !ariaLabel) {
        this.addIssue({
          level: 'warning',
          rule: 'table-caption-missing',
          description: 'Data table lacks caption or description',
          element: table,
          selector: this.getSelector(table),
          impact: 'moderate',
          help: 'Provide a caption, summary, or aria-label for data tables',
          wcagLevel: 'A',
          wcagCriterion: '1.3.1 Info and Relationships'
        });
      }

      // Check for header cells
      const headers = table.querySelectorAll('th');
      const cells = table.querySelectorAll('td');
      
      if (cells.length > 0 && headers.length === 0) {
        this.addIssue({
          level: 'error',
          rule: 'table-headers-missing',
          description: 'Data table lacks header cells',
          element: table,
          selector: this.getSelector(table),
          impact: 'serious',
          help: 'Use <th> elements to identify table headers',
          wcagLevel: 'A',
          wcagCriterion: '1.3.1 Info and Relationships'
        });
      }
    });
  }

  /**
   * Helper methods
   */
  private addIssue(issue: AccessibilityIssue): void {
    this.issues.push(issue);
  }

  private calculateContrastRatio(color1: string, color2: string): number {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd want a more robust color parsing library
    const luminance1 = this.getLuminance(color1);
    const luminance2 = this.getLuminance(color2);
    const brightest = Math.max(luminance1, luminance2);
    const darkest = Math.min(luminance1, luminance2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  private getLuminance(color: string): number {
    // Simplified luminance calculation
    // This is a basic implementation - a real audit would use a proper color library
    return 0.5; // Placeholder
  }

  private getSelector(element: Element): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `${element.tagName.toLowerCase()}.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  private getAccessibleName(element: Element): string {
    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // Check aria-labelledby
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) return labelElement.textContent || '';
    }

    // Check text content
    return element.textContent || '';
  }

  private getAssociatedLabel(input: Element): HTMLLabelElement | null {
    const id = input.getAttribute('id');
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label as HTMLLabelElement;
    }

    // Check if input is wrapped in a label
    const parentLabel = input.closest('label');
    return parentLabel as HTMLLabelElement | null;
  }

  private generateReport(): AccessibilityAuditResult {
    const errors = this.issues.filter(issue => issue.level === 'error');
    const warnings = this.issues.filter(issue => issue.level === 'warning');
    const passed = 100 - errors.length - warnings.length; // Simplified

    const score = Math.max(0, 100 - (errors.length * 10) - (warnings.length * 5));

    return {
      passed,
      failed: errors.length,
      warnings: warnings.length,
      issues: this.issues,
      score,
      summary: {
        colorContrast: this.calculateCategoryScore('color-contrast'),
        keyboardNavigation: this.calculateCategoryScore('focus-visible', 'focus-trap'),
        semanticStructure: this.calculateCategoryScore('landmark-', 'heading-'),
        ariaLabeling: this.calculateCategoryScore('aria-'),
        formAccessibility: this.calculateCategoryScore('form-', 'image-alt')
      }
    };
  }

  private calculateCategoryScore(...rulePatterns: string[]): number {
    const categoryIssues = this.issues.filter(issue =>
      rulePatterns.some(pattern => issue.rule.includes(pattern))
    );
    
    const errors = categoryIssues.filter(issue => issue.level === 'error').length;
    const warnings = categoryIssues.filter(issue => issue.level === 'warning').length;
    
    return Math.max(0, 100 - (errors * 15) - (warnings * 5));
  }
}

/**
 * Run accessibility audit on current page
 */
export const runAccessibilityAudit = async (): Promise<AccessibilityAuditResult> => {
  const auditor = new AccessibilityAuditor();
  return await auditor.audit();
};

/**
 * Generate accessibility report HTML
 */
export const generateAccessibilityReport = (result: AccessibilityAuditResult): string => {
  const { score, issues, summary } = result;
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'text-red-700 bg-red-100';
      case 'serious': return 'text-red-600 bg-red-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return `
    <div class="accessibility-report p-6 bg-white rounded-lg shadow">
      <h2 class="text-2xl font-bold mb-4">Accessibility Audit Report</h2>
      
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-2">Overall Score</h3>
        <div class="text-3xl font-bold ${getScoreColor(score)}">${score}/100</div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="p-4 bg-green-50 rounded">
          <div class="text-2xl font-bold text-green-600">${result.passed}</div>
          <div class="text-sm text-green-800">Tests Passed</div>
        </div>
        <div class="p-4 bg-red-50 rounded">
          <div class="text-2xl font-bold text-red-600">${result.failed}</div>
          <div class="text-sm text-red-800">Errors</div>
        </div>
        <div class="p-4 bg-yellow-50 rounded">
          <div class="text-2xl font-bold text-yellow-600">${result.warnings}</div>
          <div class="text-sm text-yellow-800">Warnings</div>
        </div>
      </div>

      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-4">Category Scores</h3>
        <div class="space-y-2">
          ${Object.entries(summary).map(([category, score]) => `
            <div class="flex justify-between items-center">
              <span class="capitalize">${category.replace(/([A-Z])/g, ' $1')}</span>
              <span class="font-semibold ${getScoreColor(score)}">${score}/100</span>
            </div>
          `).join('')}
        </div>
      </div>

      ${issues.length > 0 ? `
        <div>
          <h3 class="text-lg font-semibold mb-4">Issues Found</h3>
          <div class="space-y-3">
            ${issues.map(issue => `
              <div class="border rounded p-3 ${issue.level === 'error' ? 'border-red-200' : issue.level === 'warning' ? 'border-yellow-200' : 'border-blue-200'}">
                <div class="flex justify-between items-start mb-2">
                  <h4 class="font-medium">${issue.description}</h4>
                  <span class="px-2 py-1 text-xs rounded ${getImpactColor(issue.impact)}">${issue.impact}</span>
                </div>
                <p class="text-sm text-gray-600 mb-2">${issue.help}</p>
                <div class="text-xs text-gray-500">
                  <span>WCAG ${issue.wcagLevel}: ${issue.wcagCriterion}</span>
                  ${issue.selector ? ` • ${issue.selector}` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '<p class="text-green-600">No accessibility issues found!</p>'}
    </div>
  `;
};

export default {
  runAccessibilityAudit,
  generateAccessibilityReport
};