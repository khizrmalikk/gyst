import { Page } from 'playwright';

export class DialogHandler {
  
  /**
   * Handle common website dialogs (cookies, notifications, etc.)
   */
  async handleCommonDialogs(page: Page): Promise<{
    dialogsHandled: number;
    dialogsFound: string[];
  }> {
    const result = {
      dialogsHandled: 0,
      dialogsFound: [] as string[]
    };

    // Common dialog patterns to look for and close
    const dialogPatterns = [
      // Cookie consent dialogs
      {
        name: 'Cookie Consent',
        selectors: [
          'button:has-text("Accept")',
          'button:has-text("Accept All")',
          'button:has-text("Allow All")',
          'button:has-text("Accept Cookies")',
          'button:has-text("I Accept")',
          'button:has-text("Agree")',
          'button:has-text("OK")',
          '[data-testid="cookie-accept"]',
          '[id*="cookie"] button:has-text("Accept")',
          '[class*="cookie"] button:has-text("Accept")',
          '.cookie-banner button:has-text("Accept")',
          '#cookie-consent button:has-text("Accept")'
        ]
      },
      // Notification permission dialogs
      {
        name: 'Notification Permission',
        selectors: [
          'button:has-text("Allow")',
          'button:has-text("Enable")',
          'button:has-text("Turn On")',
          'button:has-text("Not Now")',
          'button:has-text("Maybe Later")',
          'button:has-text("No Thanks")',
          '[data-testid="notification-allow"]',
          '[data-testid="notification-dismiss"]'
        ]
      },
      // Location permission dialogs
      {
        name: 'Location Permission',
        selectors: [
          'button:has-text("Allow Location")',
          'button:has-text("Share Location")',
          'button:has-text("Not Now")',
          'button:has-text("Skip")'
        ]
      },
      // General modal/overlay close buttons
      {
        name: 'Modal Close',
        selectors: [
          'button[aria-label="Close"]',
          'button[aria-label="close"]',
          'button[title="Close"]',
          '.modal button:has-text("✕")',
          '.modal button:has-text("×")',
          '.overlay button:has-text("✕")',
          '.dialog button:has-text("×")',
          '[role="dialog"] button[aria-label="Close"]',
          '.close-button',
          '.modal-close',
          '.dialog-close'
        ]
      },
      // GDPR/Privacy dialogs
      {
        name: 'GDPR/Privacy',
        selectors: [
          'button:has-text("Reject All")',
          'button:has-text("Accept All")',
          'button:has-text("Continue")',
          'button:has-text("Proceed")',
          '[data-testid="privacy-accept"]',
          '[data-testid="gdpr-accept"]'
        ]
      },
      // Age verification
      {
        name: 'Age Verification',
        selectors: [
          'button:has-text("I am 18+")',
          'button:has-text("Yes")',
          'button:has-text("Continue")',
          'button:has-text("Enter")'
        ]
      },
      // Newsletter/Email signup dismissal - Enhanced with X button patterns
      {
        name: 'Newsletter Popup',
        selectors: [
          'button:has-text("No Thanks")',
          'button:has-text("Skip")',
          'button:has-text("Maybe Later")',
          'button:has-text("Close")',
          '.newsletter-popup button:has-text("×")',
          '.email-signup button:has-text("×")',
          
          // Generic X close buttons - common in popups
          'button:has-text("×")',
          'button:has-text("✕")',
          'button:has-text("X")',
          'span:has-text("×")',
          'span:has-text("✕")',
          'div:has-text("×")',
          'a:has-text("×")',
          
          // Close buttons with specific attributes
          'button[aria-label*="close" i]',
          'button[title*="close" i]',
          'span[aria-label*="close" i]',
          'div[aria-label*="close" i]',
          
          // Newsletter/popup specific close patterns
          '[data-testid*="newsletter"] button',
          '[data-testid*="popup"] button',
          '[data-testid*="modal"] button',
          '[data-testid*="close"]',
          '[data-dismiss="modal"]',
          '[data-modal-close]',
          '[data-popup-close]',
          
          // CSS class based close buttons
          '.close',
          '.close-btn',
          '.close-button',
          '.popup-close',
          '.modal-close',
          '.newsletter-close',
          '.overlay-close',
          '.dialog-close',
          
          // Common popup container close buttons
          '.popup .close',
          '.modal .close',
          '.overlay .close',
          '.dialog .close',
          '.newsletter .close',
          '.signup .close',
          '.subscribe .close',
          
          // Top-right positioned close buttons (common newsletter pattern)
          'button[style*="position: absolute"][style*="top"][style*="right"]',
          'button[style*="position: fixed"][style*="top"][style*="right"]',
          '.popup [style*="position: absolute"][style*="top"][style*="right"]',
          '.modal [style*="position: absolute"][style*="top"][style*="right"]',
          
          // Generic close patterns with class combinations
          '[class*="close"][class*="button"]',
          '[class*="close"][class*="icon"]',
          '[class*="close"][class*="btn"]',
          '[class*="btn"][class*="close"]',
          '[class*="icon"][class*="close"]'
        ]
      }
    ];

    // Try to handle each type of dialog
    for (const dialogType of dialogPatterns) {
      try {
        for (const selector of dialogType.selectors) {
          try {
            // Look for the element with a short timeout
            const element = await page.locator(selector).first();
            
            if (await element.isVisible({ timeout: 1000 })) {
              await element.click({ timeout: 3000 });
              result.dialogsHandled++;
              result.dialogsFound.push(dialogType.name);
              
              // Wait a moment for the dialog to close
              await page.waitForTimeout(1000);
              break; // Move to next dialog type
            }
          } catch (error) {
            // Continue to next selector
            continue;
          }
        }
      } catch (error) {
        // Continue to next dialog type
        continue;
      }
    }

    return result;
  }

  /**
   * Take screenshot and check if there are still dialogs blocking the view
   */
  async detectRemainingDialogs(page: Page): Promise<{
    hasDialogs: boolean;
    dialogElements: string[];
  }> {
    const result = {
      hasDialogs: false,
      dialogElements: [] as string[]
    };

    // Common dialog container selectors
    const dialogContainerSelectors = [
      '[role="dialog"]',
      '[role="alertdialog"]',
      '.modal',
      '.popup',
      '.overlay',
      '.dialog',
      '.cookie-banner',
      '.notification-banner',
      '[data-testid*="modal"]',
      '[data-testid*="dialog"]',
      '[class*="modal"]',
      '[class*="popup"]',
      '[class*="dialog"]',
      '[id*="modal"]',
      '[id*="popup"]',
      '[id*="dialog"]'
    ];

    for (const selector of dialogContainerSelectors) {
      try {
        const elements = await page.locator(selector).all();
        
        for (const element of elements) {
          if (await element.isVisible()) {
            result.hasDialogs = true;
            result.dialogElements.push(selector);
          }
        }
      } catch (error) {
        // Continue checking other selectors
        continue;
      }
    }

    return result;
  }

  /**
   * Enhanced wait for page to be ready (no loading indicators, dialogs handled)
   */
  async waitForPageReady(page: Page, maxWaitMs: number = 15000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      try {
        // Wait for basic page load
        await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
        
        // Handle any dialogs
        await this.handleCommonDialogs(page);
        
        // Wait for loading indicators to disappear
        const loadingSelectors = [
          '.loading',
          '.spinner',
          '.loader',
          '[data-testid="loading"]',
          '[class*="loading"]',
          '[class*="spinner"]'
        ];
        
        let stillLoading = false;
        for (const selector of loadingSelectors) {
          try {
            if (await page.locator(selector).first().isVisible({ timeout: 1000 })) {
              stillLoading = true;
              break;
            }
          } catch {
            // Element not found, continue
            continue;
          }
        }
        
        if (!stillLoading) {
          // One final dialog check
          await this.handleCommonDialogs(page);
          
          // Wait a moment for any final renders
          await page.waitForTimeout(2000);
          break;
        }
        
        // Wait before next check
        await page.waitForTimeout(1000);
        
      } catch (error) {
        // Continue trying until timeout
        continue;
      }
    }
  }
} 