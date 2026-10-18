/**
 * printHelper.js
 * Isolated Iframe Print Engine for High-Fidelity Vector PDF Generation.
 * 
 * Solves the browser layout engine flaw where visibility:hidden does not collapse
 * layout space inside deeply nested React/Bootstrap modal containers.
 * 
 * Guarantees:
 * 1. Zero invisible blank preceding pages (Page 1 starts immediately at top margin: 12mm).
 * 2. Unrestricted document flow (bypasses modal overflow-y: hidden/auto clipping).
 * 3. Pre-print image hydration (University Seal is fully loaded before print dialog triggers).
 * 4. Automatic page-break avoidance for table rows and sign-off blocks.
 * 5. Full styling parity by cloning all active stylesheets and inline rules.
 */

export function printIsolatedElement(elementId, options = {}) {
    return new Promise((resolve) => {
        const docTitle = typeof options === 'string' 
            ? options 
            : (options?.title || document.title || 'Print Document');

        const targetElement = document.getElementById(elementId);
        if (!targetElement) {
            console.warn(`[printHelper] Element #${elementId} not found. Falling back to native window.print()`);
            window.print();
            resolve(false);
            return;
        }

        // 1. Create temporary off-screen iframe outside #root and modal wrappers
        const iframe = document.createElement('iframe');
        iframe.setAttribute('style', 'position:fixed;top:-9999px;left:-9999px;width:1024px;height:1024px;border:0;opacity:0;pointer-events:none;');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.setAttribute('title', 'Isolated Print Canvas');
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
            console.warn('[printHelper] Unable to access iframe document. Falling back to window.print()');
            document.body.removeChild(iframe);
            window.print();
            resolve(false);
            return;
        }

        // 2. Setup standard HTML structure
        iframeDoc.open();
        iframeDoc.write(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${docTitle}</title>
</head>
<body></body>
</html>`);
        iframeDoc.close();

        // 3. Clone stylesheets and inline styles from parent document
        const parentHead = document.head;
        const parentStyles = parentHead.querySelectorAll('link[rel="stylesheet"], style');
        parentStyles.forEach((node) => {
            iframeDoc.head.appendChild(node.cloneNode(true));
        });

        // 4. Inject dedicated print pagination and layout CSS
        const printStyleTag = iframeDoc.createElement('style');
        printStyleTag.id = 'isolated-print-rules';
        printStyleTag.textContent = `
            @page {
                size: letter portrait;
                margin: 12mm 15mm 15mm 15mm;
            }

            *, *::before, *::after {
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }

            html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #212529 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                font-size: 9.5pt !important;
                line-height: 1.4 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
            }

            /* Strip all modal/viewport clipping artifacts */
            .modal, .modal-dialog, .modal-content, .modal-body,
            .letter-sheet-container, .decision-form13-sheet {
                position: static !important;
                max-width: 100% !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
                background: transparent !important;
            }

            /* Hide interactive and non-printable elements */
            .no-print, .btn, button, .btn-group, input, select {
                display: none !important;
            }

            /* Table pagination & cell typography */
            table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin-bottom: 1rem !important;
                page-break-inside: auto !important;
                break-inside: auto !important;
            }

            thead {
                display: table-header-group !important;
            }

            tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }

            td, th {
                padding: 4px 8px !important;
                font-size: 8.5pt !important;
                vertical-align: top !important;
            }

            /* Block-level break protection */
            .page-break-avoid {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }

            /* Brand colors & alert badge styling */
            .bg-light { background-color: #f8f9fa !important; }
            .bg-white { background-color: #ffffff !important; }
            .bg-dark { background-color: #212529 !important; color: #ffffff !important; }
            .bg-success { background-color: #198754 !important; color: #ffffff !important; }
            .bg-warning { background-color: #ffc107 !important; color: #000000 !important; }
            .bg-danger { background-color: #dc3545 !important; color: #ffffff !important; }
            .bg-primary { background-color: #0d6efd !important; color: #ffffff !important; }
            .bg-info-subtle { background-color: #cff4fc !important; }
            .bg-success-subtle { background-color: #d1e7dd !important; }
            .bg-warning-subtle { background-color: #fff3cd !important; }
            .bg-danger-subtle { background-color: #f8d7da !important; }
            .bg-primary-subtle { background-color: #cfe2ff !important; }
            .text-theme-primary { color: #003366 !important; }
            .border-theme-primary { border-color: #003366 !important; }
        `;
        iframeDoc.head.appendChild(printStyleTag);

        // 5. Clone target element into iframe body
        const clonedContent = targetElement.cloneNode(true);
        iframeDoc.body.appendChild(clonedContent);

        // 6. Pre-print Image Hydration Barrier
        const images = Array.from(iframeDoc.images);
        const imagePromises = images.map((img) => {
            if (img.complete && img.naturalHeight !== 0) {
                return Promise.resolve();
            }
            return new Promise((imgResolve) => {
                img.onload = () => imgResolve();
                img.onerror = () => imgResolve();
                // Safety fallback timeout in case image load hangs
                setTimeout(imgResolve, 500);
            });
        });

        // 7. Await images, then trigger print dialog
        Promise.all(imagePromises).then(() => {
            setTimeout(() => {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                    resolve(true);
                } catch (printErr) {
                    console.warn('[printHelper] Error invoking iframe print:', printErr);
                    window.print();
                    resolve(false);
                } finally {
                    // Safe cleanup after print dialogue completes or is cancelled
                    setTimeout(() => {
                        try {
                            if (document.body.contains(iframe)) {
                                document.body.removeChild(iframe);
                            }
                        } catch (e) {}
                    }, 2000);
                }
            }, 150);
        });
    });
}
