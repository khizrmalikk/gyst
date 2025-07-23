import { jsPDF } from 'jspdf';

export interface DocumentGenerationOptions {
  title?: string;
  author?: string;
  subject?: string;
  fontSize?: number;
  lineHeight?: number;
  margin?: number;
  pageHeight?: number;
}

export class PDFGenerator {
  private doc: jsPDF;
  private options: Required<DocumentGenerationOptions>;
  private currentY: number = 0;
  private pageHeight: number;
  private maxContentY: number;

  constructor(options: DocumentGenerationOptions = {}) {
    this.doc = new jsPDF();
    this.pageHeight = this.doc.internal.pageSize.height;
    this.options = {
      title: options.title || 'Document',
      author: options.author || 'Job Application Bot',
      subject: options.subject || 'Generated Document',
      fontSize: options.fontSize || 11,
      lineHeight: options.lineHeight || 6,
      margin: options.margin || 20,
      pageHeight: options.pageHeight || this.pageHeight
    };

    // Calculate max Y position for content (leaving margin at bottom)
    this.maxContentY = this.pageHeight - this.options.margin;

    // Set document metadata
    this.doc.setProperties({
      title: this.options.title,
      author: this.options.author,
      subject: this.options.subject,
      creator: 'Job Application Bot'
    });
  }

  private checkPageBreak(nextLineHeight: number = this.options.lineHeight): boolean {
    if (this.currentY + nextLineHeight > this.maxContentY) {
      this.doc.addPage();
      this.currentY = this.options.margin;
      return true;
    }
    return false;
  }

  private addText(text: string, fontSize?: number, isBold?: boolean): void {
    if (fontSize) this.doc.setFontSize(fontSize);
    
    // Handle bold text
    if (isBold) {
      this.doc.setFont('helvetica', 'bold');
    } else {
      this.doc.setFont('helvetica', 'normal');
    }

    const splitText = this.doc.splitTextToSize(text, 170);
    
    // Handle each line with page break checking
    for (let i = 0; i < splitText.length; i++) {
      this.checkPageBreak();
      this.doc.text(splitText[i], this.options.margin, this.currentY);
      this.currentY += this.options.lineHeight;
    }
  }

  private addSection(title: string, content: string): void {
    // Add more space before section
    this.currentY += 8;
    this.checkPageBreak(20); // Check if we have space for title + some content
    
    // Section title (bold, larger font)
    this.addText(title, 14, true);
    this.currentY += 6; // More gap after title
    
    // Handle different content types with better formatting
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        this.currentY += 4; // Space for empty lines
        continue;
      }
      
      // Check if this is a job title/company line (usually followed by location/dates)
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      const isJobTitle = line && nextLine && !line.startsWith('-') && !line.startsWith('•') && 
                        (nextLine.includes('|') || nextLine.includes('20') || nextLine.includes('Present'));
      
      if (isJobTitle) {
        // Job title gets slightly larger font and bold
        this.addText(line, this.options.fontSize + 1, true);
        this.currentY += 2;
      } else if (line.startsWith('-') || line.startsWith('•')) {
        // Bullet points get slight indent
        this.addText(`  ${line}`, this.options.fontSize, false);
        this.currentY += 2;
      } else if (line.includes('|') && (line.includes('20') || line.includes('Present'))) {
        // Company/date lines get normal formatting
        this.addText(line, this.options.fontSize, false);
        this.currentY += 3; // Bit more space after company/date
      } else {
        // Regular content
        this.addText(line, this.options.fontSize, false);
        this.currentY += 2;
      }
    }
    
    this.currentY += 6; // More space after section
  }

  generateCV(content: string, userProfile: any): Buffer {
    this.currentY = this.options.margin;

    // Header with name (larger font)
    this.addText(userProfile.name || 'Professional CV', 16, true);
    this.currentY += 5;
    
    // Contact information
    const contactInfo = [];
    if (userProfile.email) contactInfo.push(`Email: ${userProfile.email}`);
    if (userProfile.phone) contactInfo.push(`Phone: ${userProfile.phone}`);
    if (userProfile.location) contactInfo.push(`Location: ${userProfile.location}`);
    
    if (contactInfo.length > 0) {
      this.addText(contactInfo.join(' | '), 10, false);
      this.currentY += 10; // Extra space after contact info
    }

    // Parse and structure the content properly
    if (content && content.trim()) {
      // If the content appears to be structured CV content, parse it
      if (content.includes('PROFESSIONAL SUMMARY') || content.includes('KEY SKILLS') || content.includes('WORK EXPERIENCE')) {
        this.parseStructuredCV(content);
      } else {
        // Treat as plain content
        this.addText(content, this.options.fontSize, false);
      }
    } else {
      this.addText('CV content is being generated. Please try again in a moment.', this.options.fontSize, false);
    }

    return Buffer.from(this.doc.output('arraybuffer'));
  }

  private parseStructuredCV(content: string): void {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let currentSection = '';
    let sectionContent: string[] = [];

    for (const line of lines) {
      // Skip duplicate header information that's already in the PDF header
      if (this.isDuplicateHeaderInfo(line)) {
        continue;
      }
      
      // Check if this line is a section header - improved detection
      const isSection = line.match(/^[A-Z\s&]{3,}$/);
      const isSectionHeader = isSection && (
        line.includes('PROFESSIONAL SUMMARY') ||
        line.includes('KEY SKILLS') ||
        line.includes('WORK EXPERIENCE') ||
        line.includes('EXPERIENCE') ||
        line.includes('EDUCATION') ||
        line.includes('CERTIFICATIONS') ||
        line.includes('LANGUAGES') ||
        line.includes('PROJECTS') ||
        line.includes('PROFESSIONAL LINKS') ||
        line === 'PROFESSIONAL SUMMARY' ||
        line === 'KEY SKILLS' ||
        line === 'WORK EXPERIENCE' ||
        line === 'EXPERIENCE' ||
        line === 'EDUCATION' ||
        line === 'CERTIFICATIONS' ||
        line === 'LANGUAGES' ||
        line === 'PROJECTS' ||
        line === 'PROFESSIONAL LINKS'
      );
      
      if (isSectionHeader) {
        // Save previous section if exists
        if (currentSection && sectionContent.length > 0) {
          this.addSection(currentSection, sectionContent.join('\n'));
        }
        
        // Start new section
        currentSection = line;
        sectionContent = [];
      } else if (currentSection) {
        // Add content to current section
        sectionContent.push(line);
      } else {
        // Content before any section header - treat as standalone content
        if (!this.isDuplicateHeaderInfo(line)) {
          this.addText(line, this.options.fontSize, false);
          this.currentY += 3; // Add some spacing
        }
      }
    }

    // Add the last section
    if (currentSection && sectionContent.length > 0) {
      this.addSection(currentSection, sectionContent.join('\n'));
    }
  }

  private isDuplicateHeaderInfo(line: string): boolean {
    // Skip lines that duplicate the header information we already added
    return (
      // Skip standalone name (likely duplicate) - more strict matching
      /^[*]*\s*[A-Z][a-z]+ [A-Z][a-z]+\s*[*]*$/.test(line.trim()) ||
      // Skip lines with just location
      /^[A-Za-z\s]+,\s*[A-Z]{2,}$/.test(line) ||
      /^[A-Za-z\s]*\s*$/.test(line) && line.length < 30 && line.length > 5 ||
      // Skip lines with just phone numbers
      /^\+?[\d\s\-\(\)]+$/.test(line) ||
      // Skip lines with just email
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(line) ||
      // Skip contact info lines that contain Email:, Phone:, Location:
      (line.includes('Email:') && line.includes('|')) ||
      // Skip lines that look like location, phone, email formatted separately
      (line.includes('@') && line.length < 50 && !line.includes(' ')) ||
      (line.startsWith('+') && /^\+?\d+$/.test(line.replace(/[\s\-\(\)]/g, ''))) ||
      // Skip any line that's just bold formatting of name
      /^\*\*.*\*\*$/.test(line.trim()) && line.length < 50
    );
  }

  generateCoverLetter(content: string, jobInfo: any, userProfile: any): Buffer {
    this.currentY = this.options.margin;

    // Header with user info
    this.addText(userProfile.name || 'Cover Letter', 12, true);
    
    const contactInfo = [];
    if (userProfile.email) contactInfo.push(userProfile.email);
    if (userProfile.phone) contactInfo.push(userProfile.phone);
    if (contactInfo.length > 0) {
      this.addText(contactInfo.join(' | '), 10, false);
    }

    this.currentY += 15;

    // Date
    this.addText(new Date().toLocaleDateString(), this.options.fontSize, false);
    this.currentY += 15;

    // Company info
    if (jobInfo.company) {
      this.addText(jobInfo.company, this.options.fontSize, false);
      if (jobInfo.location) {
        this.addText(jobInfo.location, this.options.fontSize, false);
      }
      this.currentY += 15;
    }

    // Subject line
    if (jobInfo.title) {
      this.addText(`Re: Application for ${jobInfo.title} Position`, 11, true);
      this.currentY += 15;
    }

    // Main content
    this.addText(content, this.options.fontSize, false);

    return Buffer.from(this.doc.output('arraybuffer'));
  }

  generateGenericPDF(content: string, title: string = 'Document'): Buffer {
    this.currentY = this.options.margin;
    
    this.addText(title, 16, true);
    this.currentY += 10;
    this.addText(content, this.options.fontSize, false);

    return Buffer.from(this.doc.output('arraybuffer'));
  }
} 