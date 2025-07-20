import React from 'react';
import { Button } from '@/components/ui/button';

interface MessageFormatterProps {
  content: string;
  className?: string;
  jobData?: any;
  showApplyAll?: boolean;
  totalJobs?: number;
  onJobApply?: (jobIndex: number) => void;
  onApplyAll?: () => void;
  isAutoApplying?: boolean;
}

export const MessageFormatter: React.FC<MessageFormatterProps> = ({ 
  content, 
  className = '',
  jobData,
  showApplyAll,
  totalJobs,
  onJobApply,
  onApplyAll,
  isAutoApplying
}) => {
  const formatMessage = (text: string): React.ReactElement => {
    // Replace URLs with non-clickable text to prevent automatic link creation
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const textWithoutUrls = text.replace(urlRegex, '(application link)');
    
    // Split by double newlines to create paragraphs
    const paragraphs = textWithoutUrls.split('\n\n');
    
    return (
      <div className={`space-y-3 ${className}`}>
        {paragraphs.map((paragraph, pIndex) => {
          // Check if this paragraph is a list (contains bullet points)
          const lines = paragraph.split('\n');
          const isListParagraph = lines.some(line => 
            line.trim().startsWith('•') || 
            line.trim().startsWith('-') || 
            line.trim().match(/^\d+\./)
          );
          
          if (isListParagraph) {
            return (
              <div key={pIndex} className="space-y-1">
                {lines.map((line, lIndex) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) return null;
                  
                  // Handle bullet points
                  if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
                    return (
                      <div key={lIndex} className="flex items-start space-x-2">
                        <span className="text-black mt-1 text-sm">•</span>
                        <span className="flex-1">{trimmedLine.substring(1).trim()}</span>
                      </div>
                    );
                  }
                  
                  // Handle numbered lists
                  const numberedMatch = trimmedLine.match(/^(\d+\.)\s*(.+)$/);
                  if (numberedMatch) {
                    return (
                      <div key={lIndex} className="flex items-start space-x-2">
                        <span className="text-black mt-1 text-sm font-medium">{numberedMatch[1]}</span>
                        <span className="flex-1">{numberedMatch[2]}</span>
                      </div>
                    );
                  }
                  
                  // Regular line within a list context
                  return (
                    <div key={lIndex} className="text-sm">
                      {trimmedLine}
                    </div>
                  );
                })}
              </div>
            );
          } else {
            // Regular paragraph - split by single newlines for line breaks
            const formattedLines = lines.map((line, lIndex) => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return null;
              
              return (
                <React.Fragment key={lIndex}>
                  {trimmedLine}
                  {lIndex < lines.length - 1 && <br />}
                </React.Fragment>
              );
            });
            
            return (
              <p key={pIndex} className="text-sm leading-relaxed">
                {formattedLines}
              </p>
            );
          }
        })}
      </div>
    );
  };

  // Special handling for job cards
  if (jobData) {
    return (
      <div className="bg-white border border-[#C9C8C7] rounded-lg p-4 space-y-3">
        {formatMessage(content)}
        <div className="pt-2 border-t border-[#C9C8C7]">
          <Button
            onClick={() => onJobApply?.(jobData.index)}
            disabled={isAutoApplying}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            size="sm"
          >
            {isAutoApplying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Applying...
              </>
            ) : (
              <>
                🚀 Apply Now
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Special handling for "Apply to All" section
  if (showApplyAll) {
    return (
      <div className="space-y-3">
        {formatMessage(content)}
        <div className="flex flex-col gap-2">
          <Button
            onClick={onApplyAll}
            disabled={isAutoApplying}
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {isAutoApplying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Starting Auto-Apply...
              </>
            ) : (
              <>
                🚀 Apply to All {totalJobs} Jobs
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return formatMessage(content);
};

export default MessageFormatter; 