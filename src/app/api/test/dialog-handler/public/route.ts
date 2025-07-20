import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { DialogHandler } from '@/lib/agents/dialog-handler';

export async function GET() {
  let browser;
  let page;
  
  try {
    const dialogHandler = new DialogHandler();
    
    // Launch a browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    page = await browser.newPage();
    
    // Test with a site that commonly has cookie dialogs
    await page.goto('https://www.indeed.com/jobs?q=software+engineer&l=remote', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Test our dialog handler
    const dialogResult = await dialogHandler.handleCommonDialogs(page);
    
    // Check for remaining dialogs
    const remainingDialogs = await dialogHandler.detectRemainingDialogs(page);
    
    // Take a screenshot to see the final result
    const screenshot = await page.screenshot({ fullPage: false });
    const screenshotBase64 = screenshot.toString('base64');
    
    return NextResponse.json({
      success: true,
      dialogsHandled: dialogResult.dialogsHandled,
      dialogsFound: dialogResult.dialogsFound,
      remainingDialogs: remainingDialogs.hasDialogs,
      remainingDialogElements: remainingDialogs.dialogElements,
      screenshot: `data:image/png;base64,${screenshotBase64}`,
      message: `Dialog handler test completed. Handled ${dialogResult.dialogsHandled} dialogs.`
    });
    
  } catch (error) {
    console.error('Dialog handler test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Dialog handler test failed'
    }, { status: 500 });
    
  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
} 