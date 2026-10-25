/**
 * WhatsApp Invoice & UPI Payment Link Formatter
 *
 * Formats multilingual WhatsApp invoice receipts with direct UPI payment links,
 * itemized summaries, and merchant marketing footers.
 */

export interface WhatsAppInvoicePayload {
  customerName?: string;
  customerPhone?: string;
  companyName: string;
  invoiceNumber: string;
  date: string;
  grandTotal: string;
  isPaid: boolean;
  paymentMode?: string; // 'cash' | 'upi' | 'card' | 'credit'
  upiVpa?: string;
  items: Array<{ name: string; qty: string | number; rate: string | number }>;
  language?: string; // 'en-IN' | 'hi-IN' | 'te-IN' | 'ta-IN' | 'kn-IN' | 'mr-IN'
}

export function formatWhatsAppInvoiceMessage(payload: WhatsAppInvoicePayload): string {
  const {
    customerName,
    companyName,
    invoiceNumber,
    date,
    grandTotal,
    isPaid,
    paymentMode,
    upiVpa,
    items,
    language = 'en-IN',
  } = payload;

  const clientGreeting = customerName ? `${customerName}` : 'Customer';
  const cleanTotal = Number(grandTotal || 0).toFixed(2);

  // Generate UPI deep link if merchant UPI is provided
  let upiPaymentLink = '';
  if (upiVpa) {
    const cleanVpa = upiVpa.trim();
    const cleanPayee = encodeURIComponent(companyName.trim());
    upiPaymentLink = `upi://pay?pa=${cleanVpa}&pn=${cleanPayee}&am=${cleanTotal}&cu=INR&tn=Invoice%20${invoiceNumber}`;
  }

  // Format compact item list (max 5 items, then "+N more")
  const itemsText = items
    .slice(0, 5)
    .map((it) => `• ${it.name} (x${it.qty}) - ₹${Number(it.rate) * Number(it.qty)}`)
    .join('\n');
  const moreCount = items.length > 5 ? `\n...and ${items.length - 5} more items` : '';

  switch (language) {
    case 'hi-IN':
      return [
        `🙏 *नमस्ते ${clientGreeting} जी,*`,
        `*${companyName}* से आपका बिल विवरण:`,
        `━━━━━━━━━━━━━━━━━━`,
        `📄 *बिल सं.*: ${invoiceNumber}`,
        `📅 *तारीख*: ${date}`,
        `💵 *कुल राशि*: *₹${cleanTotal}*`,
        `📌 *स्थिति*: ${isPaid ? `✅ भुगतान प्राप्त (${paymentMode || 'Paid'})` : '⏳ भुगतान लंबित (Pending)'}`,
        `━━━━━━━━━━━━━━━━━━`,
        `🛒 *सामान विवरण*:`,
        itemsText + moreCount,
        `━━━━━━━━━━━━━━━━━━`,
        !isPaid && upiPaymentLink
          ? `⚡ *तुरंत UPI से भुगतान करें:*\n👉 ${upiPaymentLink}\n`
          : '',
        `✨ *${companyName} में खरीदारी के लिए धन्यवाद!*`,
        `कृपया दोबारा पधारें! 🙏`,
      ]
        .filter(Boolean)
        .join('\n');

    case 'te-IN':
      return [
        `🙏 *నమస్కారం ${clientGreeting} గారు,*`,
        `*${companyName}* నుండి మీ బిల్లు వివరాలు:`,
        `━━━━━━━━━━━━━━━━━━`,
        `📄 *బిల్లు నంబర్*: ${invoiceNumber}`,
        `📅 *తేదీ*: ${date}`,
        `💵 *మొత్తం*: *₹${cleanTotal}*`,
        `📌 *స్థితి*: ${isPaid ? `✅ చెల్లించబడింది (${paymentMode || 'Paid'})` : '⏳ పెండింగ్‌లో ఉంది'}`,
        `━━━━━━━━━━━━━━━━━━`,
        `🛒 *వస్తువుల వివరాలు*:`,
        itemsText + moreCount,
        `━━━━━━━━━━━━━━━━━━`,
        !isPaid && upiPaymentLink
          ? `⚡ *UPI ద్వారా వెంటనే చెల్లించండి:*\n👉 ${upiPaymentLink}\n`
          : '',
        `✨ *${companyName} లో కొనుగోలు చేసినందుకు ధన్యవాదాలు!* 🙏`,
      ]
        .filter(Boolean)
        .join('\n');

    case 'ta-IN':
      return [
        `🙏 *வணக்கம் ${clientGreeting},*`,
        `*${companyName}* இலிருந்து உங்கள் பில் விவரங்கள்:`,
        `━━━━━━━━━━━━━━━━━━`,
        `📄 *பில் எண்*: ${invoiceNumber}`,
        `📅 *தேதி*: ${date}`,
        `💵 *மொத்த தொகை*: *₹${cleanTotal}*`,
        `📌 *நிலை*: ${isPaid ? `✅ செலுத்தப்பட்டது (${paymentMode || 'Paid'})` : '⏳ நிலுவை'}`,
        `━━━━━━━━━━━━━━━━━━`,
        `🛒 *பொருட்கள்*:`,
        itemsText + moreCount,
        `━━━━━━━━━━━━━━━━━━`,
        !isPaid && upiPaymentLink
          ? `⚡ *UPI மூலம் உடனடியாக செலுத்தவும்:*\n👉 ${upiPaymentLink}\n`
          : '',
        `✨ *${companyName} இல் ஷாப்பிங் செய்ததற்கு நன்றி!* 🙏`,
      ]
        .filter(Boolean)
        .join('\n');

    case 'kn-IN':
      return [
        `🙏 *ನಮಸ್ಕಾರ ${clientGreeting},*`,
        `*${companyName}* ನಿಂದ ನಿಮ್ಮ ಬಿಲ್ ವಿವರ:`,
        `━━━━━━━━━━━━━━━━━━`,
        `📄 *ಬಿಲ್ ಸಂಖ್ಯೆ*: ${invoiceNumber}`,
        `📅 *ದಿನಾಂಕ*: ${date}`,
        `💵 *ಒಟ್ಟು ಮೊತ್ತ*: *₹${cleanTotal}*`,
        `📌 *ಸ್ಥಿತಿ*: ${isPaid ? `✅ ಪಾವತಿಸಲಾಗಿದೆ (${paymentMode || 'Paid'})` : '⏳ ಬಾಕಿ ಇದೆ'}`,
        `━━━━━━━━━━━━━━━━━━`,
        `🛒 *ವಸ್ತುಗಳು*:`,
        itemsText + moreCount,
        `━━━━━━━━━━━━━━━━━━`,
        !isPaid && upiPaymentLink
          ? `⚡ *UPI ಮೂಲಕ ತಕ್ಷಣ ಪಾವತಿಸಿ:*\n👉 ${upiPaymentLink}\n`
          : '',
        `✨ *${companyName} ನಲ್ಲಿ ಶಾಪಿಂಗ್ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು!* 🙏`,
      ]
        .filter(Boolean)
        .join('\n');

    case 'mr-IN':
      return [
        `🙏 *नमस्कार ${clientGreeting},*`,
        `*${companyName}* कडून आपले बिल तपशील:`,
        `━━━━━━━━━━━━━━━━━━`,
        `📄 *बिल क्र.*: ${invoiceNumber}`,
        `📅 *तारीख*: ${date}`,
        `💵 *एकूण रक्कम*: *₹${cleanTotal}*`,
        `📌 *स्थिती*: ${isPaid ? `✅ भरणा झाला (${paymentMode || 'Paid'})` : '⏳ देय बाकी'}`,
        `━━━━━━━━━━━━━━━━━━`,
        `🛒 *वस्तू तपशील*:`,
        itemsText + moreCount,
        `━━━━━━━━━━━━━━━━━━`,
        !isPaid && upiPaymentLink
          ? `⚡ *UPI द्वारे त्वरित पैसे पाठवा:*\n👉 ${upiPaymentLink}\n`
          : '',
        `✨ *${companyName} येथे खरेदी केल्याबद्दल धन्यवाद!* 🙏`,
      ]
        .filter(Boolean)
        .join('\n');

    default:
      // English (Default)
      return [
        `🙏 *Hello ${clientGreeting},*`,
        `Here is your invoice from *${companyName}*:`,
        `━━━━━━━━━━━━━━━━━━`,
        `📄 *Invoice #*: ${invoiceNumber}`,
        `📅 *Date*: ${date}`,
        `💵 *Grand Total*: *₹${cleanTotal}*`,
        `📌 *Status*: ${isPaid ? `✅ Paid (${paymentMode || 'Cash/UPI'})` : '⏳ Unpaid / Pending'}`,
        `━━━━━━━━━━━━━━━━━━`,
        `🛒 *Items Summary*:`,
        itemsText + moreCount,
        `━━━━━━━━━━━━━━━━━━`,
        !isPaid && upiPaymentLink
          ? `⚡ *Pay instantly via UPI:*\n👉 ${upiPaymentLink}\n`
          : '',
        `✨ *Thank you for shopping with ${companyName}!* 🙏`,
        `Have a great day ahead!`,
      ]
        .filter(Boolean)
        .join('\n');
  }
}

/**
 * Open WhatsApp chat with pre-filled message
 */
export function openWhatsAppChat(phone: string | undefined, message: string) {
  let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const encoded = encodeURIComponent(message);
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}
