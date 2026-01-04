import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface ChecklistItem {
  id: string;
  item_text: string;
  item_type: string;
  is_required: boolean;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  sort_order: number;
  image_url: string | null;
  signature_url: string | null;
  response_text: string | null;
  response_value: unknown;
  options: unknown;
}

interface JobInfo {
  title: string;
  job_number: string | null;
  customer_name: string | null;
  address: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
}

// Helper to load image as base64
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportChecklistToPdf(
  items: ChecklistItem[],
  jobInfo: JobInfo
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  const sortedItems = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const completedCount = items.filter(i => i.is_completed).length;

  // Helper to add new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Checklist Report', margin, yPos);
  yPos += 10;

  // Job info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, margin, yPos);
  yPos += 12;

  // Job details box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, yPos, contentWidth, 45, 3, 3, 'FD');
  yPos += 8;

  doc.setTextColor(30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(jobInfo.title || 'Untitled Job', margin + 5, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);

  if (jobInfo.job_number) {
    doc.text(`Job #: ${jobInfo.job_number}`, margin + 5, yPos);
    yPos += 5;
  }
  if (jobInfo.customer_name) {
    doc.text(`Customer: ${jobInfo.customer_name}`, margin + 5, yPos);
    yPos += 5;
  }
  if (jobInfo.address) {
    doc.text(`Address: ${jobInfo.address}`, margin + 5, yPos);
    yPos += 5;
  }
  if (jobInfo.scheduled_date) {
    doc.text(`Scheduled: ${format(new Date(jobInfo.scheduled_date), 'MMMM d, yyyy')}`, margin + 5, yPos);
    yPos += 5;
  }
  if (jobInfo.completed_at) {
    doc.text(`Completed: ${format(new Date(jobInfo.completed_at), 'MMMM d, yyyy h:mm a')}`, margin + 5, yPos);
  }
  yPos += 15;

  // Progress summary
  doc.setTextColor(30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Checklist Progress: ${completedCount} of ${items.length} completed`, margin, yPos);
  yPos += 8;

  // Progress bar
  const progressWidth = contentWidth * 0.6;
  const progressHeight = 6;
  const progress = items.length > 0 ? completedCount / items.length : 0;
  
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(margin, yPos, progressWidth, progressHeight, 2, 2, 'F');
  
  if (progress > 0) {
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(margin, yPos, progressWidth * progress, progressHeight, 2, 2, 'F');
  }
  yPos += 15;

  // Checklist items
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Checklist Items', margin, yPos);
  yPos += 10;

  for (const item of sortedItems) {
    checkPageBreak(25);

    // Item container
    const itemStartY = yPos;
    
    // Checkbox
    doc.setDrawColor(180);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos - 4, 5, 5);
    
    if (item.is_completed) {
      doc.setFillColor(34, 197, 94);
      doc.rect(margin + 0.5, yPos - 3.5, 4, 4, 'F');
      doc.setTextColor(255);
      doc.setFontSize(8);
      doc.text('✓', margin + 1.2, yPos - 0.5);
    }

    // Item text
    doc.setFontSize(10);
    doc.setFont('helvetica', item.is_completed ? 'normal' : 'bold');
    doc.setTextColor(item.is_completed ? 120 : 30);
    
    const textLines = doc.splitTextToSize(item.item_text, contentWidth - 15);
    doc.text(textLines, margin + 8, yPos);
    yPos += textLines.length * 5;

    // Required badge
    if (item.is_required && !item.is_completed) {
      doc.setFontSize(7);
      doc.setTextColor(220, 38, 38);
      doc.text('REQUIRED', margin + 8, yPos);
      yPos += 4;
    }

    // Completion date
    if (item.completed_at) {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Completed: ${format(new Date(item.completed_at), 'MMM d, yyyy h:mm a')}`, margin + 8, yPos);
      yPos += 4;
    }

    // Response text
    if (item.response_text) {
      checkPageBreak(15);
      doc.setFillColor(248, 250, 252);
      const responseLines = doc.splitTextToSize(`Response: ${item.response_text}`, contentWidth - 20);
      const responseHeight = responseLines.length * 4 + 6;
      doc.roundedRect(margin + 8, yPos, contentWidth - 16, responseHeight, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(60);
      doc.text(responseLines, margin + 12, yPos + 4);
      yPos += responseHeight + 3;
    }

    // Response value
    if (item.response_value && !item.response_text) {
      checkPageBreak(15);
      const valueText = typeof item.response_value === 'object'
        ? JSON.stringify(item.response_value)
        : String(item.response_value);
      doc.setFillColor(248, 250, 252);
      const valueLines = doc.splitTextToSize(`Value: ${valueText}`, contentWidth - 20);
      const valueHeight = valueLines.length * 4 + 6;
      doc.roundedRect(margin + 8, yPos, contentWidth - 16, valueHeight, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(60);
      doc.text(valueLines, margin + 12, yPos + 4);
      yPos += valueHeight + 3;
    }

    // Image
    if (item.image_url) {
      checkPageBreak(60);
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text('Photo:', margin + 8, yPos);
      yPos += 3;

      const imageBase64 = await loadImageAsBase64(item.image_url);
      if (imageBase64) {
        try {
          const imgProps = doc.getImageProperties(imageBase64);
          const maxWidth = contentWidth - 20;
          const maxHeight = 50;
          let imgWidth = imgProps.width;
          let imgHeight = imgProps.height;
          
          // Scale to fit
          if (imgWidth > maxWidth) {
            const scale = maxWidth / imgWidth;
            imgWidth = maxWidth;
            imgHeight = imgHeight * scale;
          }
          if (imgHeight > maxHeight) {
            const scale = maxHeight / imgHeight;
            imgHeight = maxHeight;
            imgWidth = imgWidth * scale;
          }

          checkPageBreak(imgHeight + 5);
          doc.addImage(imageBase64, 'JPEG', margin + 8, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 5;
        } catch (e) {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text('[Image could not be loaded]', margin + 8, yPos);
          yPos += 5;
        }
      }
    }

    // Signature
    if (item.signature_url) {
      checkPageBreak(40);
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text('Signature:', margin + 8, yPos);
      yPos += 3;

      const sigBase64 = await loadImageAsBase64(item.signature_url);
      if (sigBase64) {
        try {
          const imgProps = doc.getImageProperties(sigBase64);
          const maxWidth = 80;
          const maxHeight = 30;
          let imgWidth = imgProps.width;
          let imgHeight = imgProps.height;
          
          if (imgWidth > maxWidth) {
            const scale = maxWidth / imgWidth;
            imgWidth = maxWidth;
            imgHeight = imgHeight * scale;
          }
          if (imgHeight > maxHeight) {
            const scale = maxHeight / imgHeight;
            imgHeight = maxHeight;
            imgWidth = imgWidth * scale;
          }

          checkPageBreak(imgHeight + 5);
          // White background for signature
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(200);
          doc.roundedRect(margin + 8, yPos, imgWidth + 10, imgHeight + 6, 2, 2, 'FD');
          doc.addImage(sigBase64, 'PNG', margin + 13, yPos + 3, imgWidth, imgHeight);
          yPos += imgHeight + 10;
        } catch (e) {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text('[Signature could not be loaded]', margin + 8, yPos);
          yPos += 5;
        }
      }
    }

    yPos += 8;

    // Divider line
    doc.setDrawColor(230);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + contentWidth, yPos);
    yPos += 8;
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'Generated by Field Service Management',
      margin,
      pageHeight - 10
    );
  }

  // Save the PDF
  const fileName = `checklist-${jobInfo.job_number || jobInfo.title || 'report'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
