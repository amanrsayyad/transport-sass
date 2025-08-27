import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Helper function to convert any color to simple RGB
const convertToSimpleRGB = (element: HTMLElement): void => {
  // First, remove all CSS variables that might contain problematic color functions
  const cssVarProps = ['--background', '--foreground', '--primary', '--secondary', '--accent', '--destructive', '--border'];
  cssVarProps.forEach(prop => {
    try {
      element.style.removeProperty(prop);
    } catch (e) {
      // Ignore errors
    }
  });

  // Force all CSS properties to computed values
  const style = window.getComputedStyle(element);
  const properties = [
    'color', 'backgroundColor', 'borderColor', 'borderTopColor', 
    'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'outlineColor', 'textDecorationColor', 'fill', 'stroke'
  ];
  
  // Apply computed styles directly to element
  properties.forEach(prop => {
    try {
      const value = style.getPropertyValue(prop);
      if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
        // Check if the value contains unsupported color functions
        if (value.includes('lab(') || value.includes('oklch(') || value.includes('var(--')) {
          // Replace with a safe fallback color
          if (prop === 'color') {
            (element.style as any)[prop] = '#000000'; // Black for text
          } else if (prop === 'backgroundColor') {
            (element.style as any)[prop] = '#ffffff'; // White for background
          } else if (prop.includes('border')) {
            (element.style as any)[prop] = '#cccccc'; // Light gray for borders
          } else {
            (element.style as any)[prop] = '#000000'; // Default to black
          }
        } else {
          // Properly typed dynamic property access
          (element.style as any)[prop] = value;
        }
      }
    } catch (e) {
      // Ignore errors for properties that don't exist
    }
  });
  
  // Process children recursively
  Array.from(element.children).forEach(child => {
    convertToSimpleRGB(child as HTMLElement);
  });
};

// Helper function to explicitly convert all CSS variables to simple RGB values
const convertCssVariablesToRGB = (element: HTMLElement): void => {
  // Get all elements including the root element
  const allElements = [element, ...Array.from(element.querySelectorAll('*'))];
  
  // List of all CSS variables used in the theme
  const cssVarProps = [
    '--radius', '--background', '--foreground', '--card', '--card-foreground',
    '--popover', '--popover-foreground', '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
    '--accent', '--accent-foreground', '--destructive', '--border', '--input',
    '--ring', '--sidebar', '--sidebar-foreground', '--sidebar-primary',
    '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-border', '--sidebar-ring', '--chart-1', '--chart-2', '--chart-3',
    '--chart-4', '--chart-5'
  ];
  
  allElements.forEach(el => {
    if (el instanceof HTMLElement) {
      // Remove all CSS variables
      cssVarProps.forEach(prop => {
        try {
          el.style.removeProperty(prop);
        } catch (e) {
          // Ignore errors
        }
      });
      
      // Force simple colors for all elements
      el.style.color = '#000000';
      el.style.backgroundColor = '#ffffff';
      el.style.borderColor = '#cccccc';
      
      // Remove any tailwind classes that might use CSS variables
      const classesToRemove = [
        'bg-background', 'text-foreground', 'border-border', 'outline-ring',
        'bg-primary', 'text-primary', 'bg-secondary', 'text-secondary',
        'bg-muted', 'text-muted', 'bg-accent', 'text-accent', 'bg-destructive'
      ];
      
      classesToRemove.forEach(cls => {
        el.classList.remove(cls);
      });
    }
  });
};

export const generateInvoicePDF = async (invoiceElement: HTMLElement, invoiceNumber: string) => {
  try {
    // Create a clone of the element to modify its styles without affecting the original
    const clonedElement = invoiceElement.cloneNode(true) as HTMLElement;
    document.body.appendChild(clonedElement);
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    clonedElement.style.top = '-9999px';
    clonedElement.style.width = `${invoiceElement.offsetWidth}px`;
    clonedElement.style.height = `${invoiceElement.offsetHeight}px`;
    
    // Apply a clean stylesheet to the cloned element to override any problematic styles
    const styleOverride = document.createElement('style');
    styleOverride.textContent = `
      * {
        color: #000000 !important;
        background-color: #ffffff !important;
        border-color: #cccccc !important;
        --radius: 0 !important;
        --background: #ffffff !important;
        --foreground: #000000 !important;
        --primary: #000000 !important;
        --secondary: #cccccc !important;
        --accent: #cccccc !important;
        --destructive: #ff0000 !important;
        --border: #cccccc !important;
      }
    `;
    clonedElement.appendChild(styleOverride);
    
    // Apply multiple style simplification techniques
    try {
      // First pass: Remove CSS variables
      convertCssVariablesToRGB(clonedElement);
      
      // Second pass: Convert remaining colors to simple RGB
      convertToSimpleRGB(clonedElement);
      
      // Third pass: Force inline styles for critical elements
      const criticalElements = clonedElement.querySelectorAll('h1, h2, h3, p, span, div, table, tr, td, th');
      criticalElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.color = '#000000';
          el.style.backgroundColor = '#ffffff';
          if (el.tagName === 'TABLE' || el.tagName === 'TD' || el.tagName === 'TH' || el.tagName === 'TR') {
            el.style.borderColor = '#000000';
          }
        }
      });
    } catch (styleError) {
      console.warn('Style simplification error:', styleError);
      // Continue even if style simplification fails
    }
    
    // Configure html2canvas options for better quality
    const canvas = await html2canvas(clonedElement, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: clonedElement.offsetWidth,
      height: clonedElement.offsetHeight,
      logging: false, // Disable logging to reduce console noise
      onclone: (clonedDoc, clonedElement) => {
        // Additional opportunity to modify the cloned document before rendering
        try {
          // Add a style tag to override any remaining problematic styles
          const styleTag = clonedDoc.createElement('style');
          styleTag.innerHTML = `
            * {
              color: #000000 !important;
              background-color: #ffffff !important;
              border-color: #cccccc !important;
            }
          `;
          clonedDoc.head.appendChild(styleTag);
          
          // Force simple colors on all elements
          const allElements = clonedElement.querySelectorAll('*');
          allElements.forEach(el => {
            if (el instanceof HTMLElement) {
              // Force simple background colors
              el.style.backgroundColor = '#ffffff';
              el.style.color = '#000000';
              el.style.borderColor = '#cccccc';
            }
          });
        } catch (e) {
          console.warn('Error in onclone handler:', e);
        }
        return clonedElement;
      }
    });
    
    // Remove the cloned element after rendering
    document.body.removeChild(clonedElement);

    try {
      // Convert canvas to image data
      let imgData;
      try {
        imgData = canvas.toDataURL("image/png");
      } catch (canvasError) {
        console.error("Error converting canvas to image data:", canvasError);
        throw new Error("Failed to process the invoice for PDF generation. Please try again with simpler styling.");
      }
      
      // Create PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Calculate dimensions to fit the content
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate scaling to fit the page
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;
      
      // Center the image on the page
      const x = (pdfWidth - scaledWidth) / 2;
      const y = (pdfHeight - scaledHeight) / 2;

      // Add the image to the PDF
      try {
        pdf.addImage(imgData, "PNG", x, y, scaledWidth, scaledHeight);
      } catch (addImageError) {
        console.error("Error adding image to PDF:", addImageError);
        throw new Error("Failed to add the invoice to the PDF. Please try again with a simpler invoice layout.");
      }
      
      // Save the PDF
      try {
        pdf.save(`Invoice_${invoiceNumber}.pdf`);
      } catch (saveError) {
        console.error("Error saving PDF:", saveError);
        throw new Error("Failed to save the PDF. Please check your browser settings and try again.");
      }
      
      return true; // Indicate success
    } catch (pdfError: unknown) {
      console.error("Error creating PDF from canvas:", pdfError);
      const errorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
      throw new Error(`Error creating PDF: ${errorMessage}`);
    }
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    
    // Provide more specific error messages based on the error type
    if (error.message && error.message.includes("unsupported color function")) {
      console.error("Color function error details:", error);
      throw new Error(`PDF generation failed: The document contains unsupported color formats (like lab or oklch). The system has attempted to simplify the colors but was unsuccessful. Please try again or contact support.`);
    } else if (error.message && error.message.includes("Tainted canvases")) {
      throw new Error(`PDF generation failed: The invoice contains elements that cannot be processed securely. Please ensure all images are from the same domain.`);
    } else if (error.message && error.message.includes("Maximum call stack")) {
      throw new Error(`PDF generation failed: The invoice is too complex to process. Please simplify the invoice layout.`);
    } else {
      throw new Error(`Failed to generate PDF: ${error.message || error}`);
    }
  }
};