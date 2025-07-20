import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { DialogHandler } from '@/lib/agents/dialog-handler';
import { AIVisionService } from '@/lib/llm/vision';

export async function GET() {
  let browser;
  let page;
  
  try {
    const dialogHandler = new DialogHandler();
    const aiVision = new AIVisionService();
    
    // Launch a browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    page = await browser.newPage();
    
    // Test with a site known to have newsletter popups
    const testSites = [
      'https://www.indeed.com/jobs?q=software+engineer&l=remote',
      'https://www.glassdoor.com/Job/remote-software-engineer-jobs-SRCH_IL.0,6_IS11047_KO7,24.htm'
    ];
    
    let testResults = [];
    
    for (const site of testSites) {
      try {
        console.log(`Testing newsletter popup handling on: ${site}`);
        
        // Go to the site
        await page.goto(site, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        // Wait for page to load
        await page.waitForTimeout(5000);
        
        // Take initial screenshot
        const beforeScreenshot = await page.screenshot({ fullPage: false });
        const beforeBase64 = aiVision.screenshotToBase64(beforeScreenshot);
        
        // Test automatic dialog handler
        const dialogResult = await dialogHandler.handleCommonDialogs(page);
        
        // Check if AI can detect remaining dialogs
        const remainingDialogs = await dialogHandler.detectRemainingDialogs(page);
        
        // Test AI vision for any remaining popups
        const pageHTML = await page.content();
        const aiAnalysis = await aiVision.analyzeForApplyButton(
          beforeBase64,
          page.url(),
          pageHTML.substring(0, 5000)
        );
        
        // Take screenshot after dialog handling
        const afterScreenshot = await page.screenshot({ fullPage: false });
        const afterBase64 = aiVision.screenshotToBase64(afterScreenshot);
        
        const siteResult = {
          site,
          dialogsHandled: dialogResult.dialogsHandled,
          dialogsFound: dialogResult.dialogsFound,
          remainingDialogs: remainingDialogs.hasDialogs,
          aiDetectedDialog: aiAnalysis.hasDialog,
          aiDialogAction: aiAnalysis.dialogAction,
          success: dialogResult.dialogsHandled > 0 || !remainingDialogs.hasDialogs,
          aiHandledDialog: false as boolean
        };
        
        testResults.push(siteResult);
        
        // If AI detected a dialog that wasn't handled, try to handle it
        if (aiAnalysis.hasDialog && aiAnalysis.dialogAction.shouldClick && aiAnalysis.dialogAction.selector) {
          try {
            await page.click(aiAnalysis.dialogAction.selector);
            console.log(`AI successfully clicked dialog: ${aiAnalysis.dialogAction.selector}`);
            siteResult.aiHandledDialog = true;
          } catch (error) {
            console.log(`AI couldn't click dialog: ${error}`);
            siteResult.aiHandledDialog = false;
          }
        }
        
      } catch (error) {
        testResults.push({
          site,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }
    
    await browser.close();
    
    return NextResponse.json({
      success: true,
      message: 'Newsletter popup handling test completed',
      results: testResults,
      summary: {
        totalSites: testSites.length,
        successfulSites: testResults.filter(r => r.success).length,
        dialogsHandled: testResults.reduce((sum, r) => sum + (('dialogsHandled' in r) ? r.dialogsHandled : 0), 0),
        aiDetections: testResults.filter(r => ('aiDetectedDialog' in r) && r.aiDetectedDialog).length
      }
    });
    
  } catch (error) {
    if (browser) await browser.close();
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Newsletter popup test failed'
    }, { status: 500 });
  }
} 