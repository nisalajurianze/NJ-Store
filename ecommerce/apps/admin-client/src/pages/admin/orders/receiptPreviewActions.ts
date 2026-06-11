import { downloadUrl } from '@njstore/utils';

export const downloadPreviewAsset = (url: string, filename: string): void => {
  downloadUrl(url, filename);
};

export const printHtmlDocument = (html: string): boolean => {
  const frame = document.createElement('iframe');
  frame.title = 'Packing slip print frame';
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.visibility = 'hidden';
  document.body.appendChild(frame);

  const printWindow = frame.contentWindow;
  if (!printWindow) {
    frame.remove();
    return false;
  }

  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();

    window.setTimeout(() => {
      frame.remove();
    }, 1000);
  };
  frame.srcdoc = html;

  return true;
};
