import PDFDocument from 'pdfkit';
import { formatCurrency, formatDate } from '@njstore/utils';
const drawSummaryLine = (doc, label, value, y, emphasize = false) => {
    doc
        .font('Helvetica-Bold')
        .fontSize(emphasize ? 12 : 10)
        .fillColor(emphasize ? '#D4AF37' : '#1A1A1A')
        .text(label, 350, y, { width: 82 })
        .text(value, 438, y, { width: 98, align: 'right' });
};
const PAGE_MARGIN = 48;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const BRAND_NAVY = '#0A1F44';
const BRAND_GOLD = '#D4AF37';
const INK = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const SOFT = '#F8FAFC';
const fetchImageBuffer = async (url) => {
    if (!url || url.endsWith('.svg')) {
        return null;
    }
    try {
        const response = await fetch(url, {
            headers: {
                Accept: 'image/png,image/jpeg,image/jpg;q=0.9,*/*;q=0.5'
            }
        });
        if (!response.ok) {
            return null;
        }
        return Buffer.from(await response.arrayBuffer());
    }
    catch {
        return null;
    }
};
const resolveDocumentLogo = async (siteConfig) => (await fetchImageBuffer(siteConfig.storeLogoLight?.url)) ??
    (await fetchImageBuffer(siteConfig.storeLogo?.url)) ??
    (await fetchImageBuffer(siteConfig.storeLogoDark?.url));
const drawWordmark = (doc, siteConfig, logoBuffer) => {
    if (logoBuffer) {
        try {
            doc.image(logoBuffer, PAGE_MARGIN, 28, { fit: [120, 54], valign: 'center' });
            return;
        }
        catch {
            // Fall back to text if the remote asset is not a PDFKit-supported image.
        }
    }
    doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(24)
        .text(siteConfig.storeName, PAGE_MARGIN, 33, { width: 220 });
};
const drawDocumentChrome = (doc, siteConfig, documentType, logoBuffer) => {
    doc.rect(0, 0, doc.page.width, 126).fill(BRAND_NAVY);
    doc.polygon([430, 0], [doc.page.width, 0], [doc.page.width, 126], [386, 126]).fill('#102A5C');
    doc.circle(548, 24, 46).fill('#173B78');
    doc.roundedRect(396, 36, 150, 42, 18).fill(BRAND_GOLD);
    doc.fillColor(BRAND_NAVY).font('Helvetica-Bold').fontSize(13).text(documentType, 416, 49, { width: 110, align: 'center' });
    drawWordmark(doc, siteConfig, logoBuffer);
    doc.fillColor('#E5ECF7').font('Helvetica').fontSize(9).text('Premium electronics | Transparent quotations | Secure orders', PAGE_MARGIN, 88);
};
const drawInfoCard = (doc, title, lines, x, y, width, height) => {
    doc.roundedRect(x, y, width, height, 10).fillAndStroke(SOFT, BORDER);
    doc.fillColor(BRAND_NAVY).font('Helvetica-Bold').fontSize(10).text(title.toUpperCase(), x + 16, y + 14, { width: width - 32 });
    doc.font('Helvetica').fontSize(9).fillColor(INK);
    lines.filter(Boolean).forEach((line, index) => {
        doc.text(line, x + 16, y + 36 + index * 15, { width: width - 32, lineGap: 1 });
    });
};
const drawOrderTableHeader = (doc, y) => {
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 28, 8).fill(BRAND_NAVY);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    doc.text('ITEM', 62, y + 10, { width: 242 });
    doc.text('QTY', 318, y + 10, { width: 40, align: 'right' });
    doc.text('UNIT', 378, y + 10, { width: 72, align: 'right' });
    doc.text('TOTAL', 464, y + 10, { width: 70, align: 'right' });
    return y + 40;
};
const ensureOrderPageSpace = (doc, y, minHeight = 42, repeatTableHeader = true, bottomLimit = 676) => {
    if (y + minHeight <= bottomLimit) {
        return y;
    }
    doc.addPage({ size: 'A4', margin: PAGE_MARGIN });
    return repeatTableHeader ? drawOrderTableHeader(doc, PAGE_MARGIN) : PAGE_MARGIN;
};
/**
 * Generates a branded quotation or invoice PDF in memory.
 */
export const generateOrderPdfBuffer = async (order, siteConfig, documentType, customerEmail, customerName) => {
    const logoBuffer = await resolveDocumentLogo(siteConfig);
    return new Promise((resolve, reject) => {
        const chunks = [];
        const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        const documentNumber = order.isQuotation ? order.quotationNumber ?? order.orderNumber : order.orderNumber;
        const paymentLabel = order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Bank Transfer';
        const fulfilmentLabel = order.type.replaceAll('_', ' ');
        const orderStatusLabel = order.isQuotation ? 'awaiting confirmation' : order.status.replaceAll('_', ' ');
        const paymentStatusLabel = order.paymentStatus.replaceAll('_', ' ');
        const destinationLines = order.shippingAddress
            ? [
                order.shippingAddress.fullName,
                order.shippingAddress.line1,
                order.shippingAddress.line2,
                [order.shippingAddress.city, order.shippingAddress.district].filter(Boolean).join(', '),
                order.shippingAddress.country,
                order.shippingAddress.phone
            ].filter(Boolean)
            : [order.pickupSlot ? `Pickup slot: ${order.pickupSlot}` : 'Store pickup'];
        drawDocumentChrome(doc, siteConfig, documentType, logoBuffer);
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(documentNumber, PAGE_MARGIN, 152, { width: 285 });
        doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(`Issued ${formatDate(order.createdAt)}`, PAGE_MARGIN, 180);
        drawInfoCard(doc, 'Document Details', [`Payment: ${paymentLabel}`, `Payment status: ${paymentStatusLabel}`, `Order status: ${orderStatusLabel}`, `Fulfilment: ${fulfilmentLabel}`], 344, 146, 203, 96);
        drawInfoCard(doc, 'Bill To', [customerName, customerEmail, ...destinationLines], PAGE_MARGIN, 246, 246, 128);
        drawInfoCard(doc, 'Store Details', [
            siteConfig.storeName,
            siteConfig.supportPhoneNumber ? `Phone: ${siteConfig.supportPhoneNumber}` : '',
            siteConfig.whatsappNumber ? `WhatsApp: ${siteConfig.whatsappNumber}` : '',
            siteConfig.bankTransferDetails.bankName ? `Bank: ${siteConfig.bankTransferDetails.bankName}` : ''
        ], 302, 246, 246, 128);
        doc.fillColor(BRAND_NAVY).font('Helvetica-Bold').fontSize(13).text('Items', PAGE_MARGIN, 402);
        let y = drawOrderTableHeader(doc, 424);
        for (const item of order.items) {
            y = ensureOrderPageSpace(doc, y);
            const itemLabel = `${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ''}`;
            const itemLabelHeight = doc.font('Helvetica-Bold').fontSize(9).heightOfString(itemLabel, { width: 242 });
            const skuHeight = item.sku ? 12 : 0;
            const rowHeight = Math.max(42, itemLabelHeight + skuHeight + 20);
            doc.roundedRect(PAGE_MARGIN, y - 7, CONTENT_WIDTH, rowHeight, 8).fillAndStroke('#FFFFFF', BORDER);
            doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text(itemLabel, 62, y, { width: 242 });
            if (item.sku) {
                doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(`SKU ${item.sku}`, 62, y + itemLabelHeight + 3, { width: 242 });
            }
            doc.fillColor(INK).font('Helvetica').fontSize(9);
            doc.text(String(item.quantity), 318, y, { width: 40, align: 'right' });
            doc.text(formatCurrency(item.price), 378, y, { width: 72, align: 'right' });
            doc.font('Helvetica-Bold').text(formatCurrency(item.price * item.quantity), 464, y, { width: 70, align: 'right' });
            y += rowHeight + 8;
        }
        const taxLabel = order.taxAmount && order.taxAmount > 0
            ? `${order.taxLabel ?? 'Tax'}${order.taxRate ? ` (${order.taxRate}%)` : ''}`
            : null;
        const summaryLines = [
            ['Subtotal', formatCurrency(order.subtotal)],
            ['Shipping', formatCurrency(order.shippingFee)],
            ['Discount', `-${formatCurrency(order.discount)}`],
            ...((order.loyaltyDiscount ?? 0) > 0
                ? [['Loyalty points', `-${formatCurrency(order.loyaltyDiscount ?? 0)}`]]
                : []),
            ...(taxLabel ? [[taxLabel, formatCurrency(order.taxAmount ?? 0)]] : [])
        ];
        const summaryBoxHeight = 58 + summaryLines.length * 18;
        y = ensureOrderPageSpace(doc, y, summaryBoxHeight + 88, false, 760);
        const dividerY = y + 30 + summaryLines.length * 18 + 4;
        doc.roundedRect(326, y + 12, 222, summaryBoxHeight, 14).fill(SOFT);
        doc.rect(326, y + 12, 6, summaryBoxHeight).fill(BRAND_GOLD);
        summaryLines.forEach(([label, value], index) => {
            drawSummaryLine(doc, label, value, y + 30 + index * 18);
        });
        doc.moveTo(350, dividerY).lineTo(536, dividerY).strokeColor(BORDER).lineWidth(1).stroke();
        drawSummaryLine(doc, 'Total', formatCurrency(order.total), dividerY + 10, true);
        const footerY = Math.max(704, y + summaryBoxHeight + 28);
        doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor(MUTED)
            .text(documentType === 'QUOTATION'
            ? `Quotation valid until ${order.quotationExpiry ? formatDate(order.quotationExpiry) : 'N/A'}.`
            : 'Thank you for shopping with NJ Store.', PAGE_MARGIN, footerY, { width: 260 });
        doc.text(order.paymentMethod === 'cash_on_delivery'
            ? 'Payment method: Cash on Delivery. Collect payment at delivery before handover.'
            : `Bank transfer: ${siteConfig.bankTransferDetails.accountName} | ${siteConfig.bankTransferDetails.bankName} | ${siteConfig.bankTransferDetails.accountNumber}`, PAGE_MARGIN, footerY + 18, { width: CONTENT_WIDTH });
        doc.moveTo(PAGE_MARGIN, footerY - 12).lineTo(548, footerY - 12).strokeColor(BORDER).stroke();
        doc.end();
    });
};
const addSectionHeading = (doc, title, y) => {
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0A1F44').text(title, 48, y);
    doc
        .moveTo(48, y + 20)
        .lineTo(548, y + 20)
        .strokeColor('#D4AF37')
        .lineWidth(1)
        .stroke();
    return y + 30;
};
const ensurePageSpace = (doc, y, minHeight = 72) => {
    if (y + minHeight <= 752) {
        return y;
    }
    doc.addPage({ size: 'A4', margin: 48 });
    return 56;
};
export const generateAnalyticsPdfBuffer = async (analytics, siteConfig) => new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.rect(0, 0, doc.page.width, 112).fill('#0A1F44');
    doc
        .fillColor('#D4AF37')
        .fontSize(26)
        .font('Helvetica-Bold')
        .text(siteConfig.storeName, 48, 32);
    doc
        .fillColor('#FFFFFF')
        .fontSize(14)
        .text('ADMIN DASHBOARD REPORT', 48, 68);
    doc.fillColor('#1A1A1A').font('Helvetica').fontSize(11);
    doc.text(`Selected range: ${analytics.range.label}`, 48, 140);
    doc.text(`Comparison: ${analytics.range.comparisonLabel}`, 48, 158);
    doc.text(`Generated: ${formatDate(new Date())}`, 48, 176);
    let y = 214;
    y = addSectionHeading(doc, 'Key Performance Indicators', y);
    const kpiColumnX = [48, 300];
    analytics.kpis.forEach((kpi, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const boxX = kpiColumnX[column] ?? 48;
        const boxY = y + row * 82;
        const value = kpi.currency ? formatCurrency(kpi.value) : String(Math.round(kpi.value));
        const deltaLabel = `${kpi.delta >= 0 ? '+' : ''}${kpi.delta}%`;
        doc.roundedRect(boxX, boxY, 248, 64, 12).fillAndStroke('#F8FAFC', '#D4AF37');
        doc.fillColor('#6B7280').font('Helvetica').fontSize(10).text(kpi.label.toUpperCase(), boxX + 14, boxY + 12, { width: 200 });
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(18).text(value, boxX + 14, boxY + 28, { width: 160 });
        doc
            .fillColor(kpi.delta >= 0 ? '#059669' : '#DC2626')
            .font('Helvetica-Bold')
            .fontSize(11)
            .text(deltaLabel, boxX + 178, boxY + 32, { width: 56, align: 'right' });
    });
    y += Math.ceil(analytics.kpis.length / 2) * 82 + 12;
    y = ensurePageSpace(doc, y, 180);
    y = addSectionHeading(doc, 'Funnel & Fulfilment Snapshot', y);
    doc.font('Helvetica').fontSize(11).fillColor('#1A1A1A');
    analytics.funnel.forEach((stage) => {
        doc.text(`${stage.label}: ${stage.count}`, 48, y);
        y += 18;
    });
    y += 4;
    analytics.statusBreakdown.forEach((status) => {
        doc.text(`${status.status}: ${status.count}`, 48, y);
        y += 18;
    });
    y += 8;
    y = ensurePageSpace(doc, y, 220);
    y = addSectionHeading(doc, 'Top Products', y);
    if (!analytics.topProducts.length) {
        doc.font('Helvetica').fontSize(11).fillColor('#4B5563').text('No top-product revenue was recorded for this range.', 48, y);
        y += 22;
    }
    else {
        analytics.topProducts.forEach((product, index) => {
            doc
                .font('Helvetica-Bold')
                .fontSize(11)
                .fillColor('#111827')
                .text(`${index + 1}. ${product.name}`, 48, y, { width: 260 });
            doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
            doc.text(`Units: ${product.unitsSold}`, 320, y);
            doc.text(`Revenue: ${formatCurrency(product.revenue)}`, 390, y, { width: 160, align: 'right' });
            y += 20;
        });
    }
    y += 12;
    y = ensurePageSpace(doc, y, 220);
    y = addSectionHeading(doc, 'Geographic Demand', y);
    if (!analytics.geographicDistribution.length) {
        doc.font('Helvetica').fontSize(11).fillColor('#4B5563').text('No district-level paid order data was recorded for this range.', 48, y);
        y += 22;
    }
    else {
        analytics.geographicDistribution.slice(0, 10).forEach((entry) => {
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(entry.district, 48, y);
            doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
            doc.text(`${entry.orderCount} orders`, 220, y);
            doc.text(formatCurrency(entry.revenue), 390, y, { width: 160, align: 'right' });
            y += 18;
        });
    }
    y += 12;
    y = ensurePageSpace(doc, y, 220);
    y = addSectionHeading(doc, 'Low Stock Watchlist', y);
    if (!analytics.lowStockAlerts.length) {
        doc.font('Helvetica').fontSize(11).fillColor('#4B5563').text('No low-stock alerts are active right now.', 48, y);
        y += 22;
    }
    else {
        analytics.lowStockAlerts.slice(0, 12).forEach((alert) => {
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(alert.productName, 48, y, { width: 250 });
            doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
            doc.text(alert.variantSku, 320, y);
            doc.text(`${alert.stock} left`, 472, y, { width: 76, align: 'right' });
            y += 18;
        });
    }
    doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#6B7280')
        .text(`Dashboard report generated from the admin analytics export on ${formatDate(new Date())}.`, 48, 784, { align: 'left' });
    doc.end();
});
export const generateSalesAnalysisPdfBuffer = async (salesAnalysis, siteConfig) => new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.rect(0, 0, doc.page.width, 112).fill('#0A1F44');
    doc.fillColor('#D4AF37').fontSize(26).font('Helvetica-Bold').text(siteConfig.storeName, 48, 32);
    doc.fillColor('#FFFFFF').fontSize(14).text('SALES ANALYSIS REPORT', 48, 68);
    doc.fillColor('#1A1A1A').font('Helvetica').fontSize(11);
    doc.text('Coverage: rolling daily, monthly, yearly, forecast, retention, RFM, and customer behavior mining', 48, 140, { width: 500 });
    doc.text(`Generated: ${formatDate(new Date())}`, 48, 176);
    let y = 214;
    y = addSectionHeading(doc, 'Net Sales Snapshots', y);
    const snapshotColumnX = [48, 220, 392];
    [
        salesAnalysis.snapshots.today,
        salesAnalysis.snapshots.monthToDate,
        salesAnalysis.snapshots.yearToDate
    ].forEach((snapshot, index) => {
        const boxX = snapshotColumnX[index] ?? 48;
        doc.roundedRect(boxX, y, 148, 92, 12).fillAndStroke('#F8FAFC', '#D4AF37');
        doc.fillColor('#6B7280').font('Helvetica').fontSize(10).text(snapshot.label.toUpperCase(), boxX + 12, y + 12, { width: 120 });
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(17).text(formatCurrency(snapshot.net), boxX + 12, y + 28, { width: 120 });
        doc.fillColor('#374151').font('Helvetica').fontSize(9);
        doc.text(`Revenue: ${formatCurrency(snapshot.revenue)}`, boxX + 12, y + 54, { width: 120 });
        doc.text(`Expenses: ${formatCurrency(snapshot.expenses)}`, boxX + 12, y + 68, { width: 120 });
        doc.text(`${snapshot.orderCount} orders`, boxX + 12, y + 82, { width: 120 });
    });
    y += 116;
    y = ensurePageSpace(doc, y, 180);
    y = addSectionHeading(doc, 'Forecast & Strongest Month', y);
    const forecastSeries = salesAnalysis.dailySales.slice(-30);
    const pointCount = forecastSeries.length;
    const sumX = forecastSeries.reduce((sum, _point, index) => sum + index, 0);
    const sumY = forecastSeries.reduce((sum, point) => sum + point.revenue, 0);
    const sumXY = forecastSeries.reduce((sum, point, index) => sum + index * point.revenue, 0);
    const sumXX = forecastSeries.reduce((sum, _point, index) => sum + index * index, 0);
    const denominator = pointCount * sumXX - sumX * sumX;
    const slope = denominator === 0 ? 0 : (pointCount * sumXY - sumX * sumY) / denominator;
    const intercept = pointCount === 0 ? 0 : (sumY - slope * sumX) / pointCount;
    const projectedRevenue = Array.from({ length: 7 }, (_, index) => Math.max(0, intercept + slope * (pointCount + index))).reduce((sum, value) => sum + value, 0);
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12).text('Projected next 7 days', 48, y);
    doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
    doc.text(formatCurrency(projectedRevenue), 48, y + 18);
    doc.text(`Daily slope: ${formatCurrency(Math.abs(slope))}${slope >= 0 ? ' upward' : ' downward'}`, 48, y + 34);
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12).text('Strongest month', 300, y);
    doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
    doc.text(salesAnalysis.strongestMonth?.label ?? 'N/A', 300, y + 18);
    doc.text(salesAnalysis.strongestMonth ? formatCurrency(salesAnalysis.strongestMonth.revenue) : 'No monthly revenue history yet.', 300, y + 34, { width: 220 });
    y += 74;
    y = ensurePageSpace(doc, y, 220);
    y = addSectionHeading(doc, 'Retention Cohorts', y);
    if (!salesAnalysis.retentionCohorts.length) {
        doc.font('Helvetica').fontSize(11).fillColor('#4B5563').text('No paid customer cohorts are available yet.', 48, y);
        y += 22;
    }
    else {
        salesAnalysis.retentionCohorts.slice(0, 6).forEach((cohort) => {
            const monthOneRate = cohort.retention.find((cell) => cell.monthOffset === 1)?.retentionRate;
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(`${cohort.cohortLabel} cohort`, 48, y);
            doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
            doc.text(`${cohort.cohortSize} customers`, 190, y);
            doc.text(`Month 1 retention: ${monthOneRate === null || monthOneRate === undefined ? 'N/A' : `${Math.round(monthOneRate * 100)}%`}`, 300, y, { width: 220 });
            y += 18;
        });
    }
    y += 12;
    y = ensurePageSpace(doc, y, 240);
    y = addSectionHeading(doc, 'RFM Segments', y);
    salesAnalysis.rfmSegments.forEach((segment) => {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(segment.label, 48, y, { width: 140 });
        doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
        doc.text(`${segment.customerCount} customers`, 190, y);
        doc.text(`Revenue: ${formatCurrency(segment.totalRevenue)}`, 300, y, { width: 120 });
        doc.text(`AOV: ${formatCurrency(segment.averageOrderValue)}`, 430, y, { width: 118, align: 'right' });
        y += 18;
    });
    y += 12;
    y = ensurePageSpace(doc, y, 240);
    y = addSectionHeading(doc, 'Customer Behavior Mining', y);
    const mining = salesAnalysis.customerMining;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Engagement score', 48, y, { width: 130 });
    doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
    doc.text(`${mining.summary.siteEngagementScore}/100`, 190, y, { width: 80 });
    doc.text(`${mining.summary.uniqueVisitors} visitors`, 300, y, { width: 100 });
    doc.text(`${mining.summary.totalProductViews} product views`, 410, y, { width: 138, align: 'right' });
    y += 24;
    if (!mining.topProducts.length) {
        doc.font('Helvetica').fontSize(11).fillColor('#4B5563').text('No customer product demand events are available yet.', 48, y);
        y += 22;
    }
    else {
        mining.topProducts.slice(0, 6).forEach((product, index) => {
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(`${index + 1}. ${product.name}`, 48, y, { width: 240 });
            doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
            doc.text(`${product.viewCount} views`, 300, y, { width: 70 });
            doc.text(`${product.cartAdds} carts`, 374, y, { width: 64 });
            doc.text(`Score ${product.demandScore}`, 440, y, { width: 108, align: 'right' });
            y += 18;
        });
    }
    y += 12;
    y = ensurePageSpace(doc, y, 240);
    y = addSectionHeading(doc, 'Tracked Expenses', y);
    if (!salesAnalysis.expenses.length) {
        doc.font('Helvetica').fontSize(11).fillColor('#4B5563').text('No manual outgoing expenses are being tracked yet.', 48, y);
        y += 22;
    }
    else {
        salesAnalysis.expenses.slice(0, 10).forEach((expense) => {
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(expense.label, 48, y, { width: 220 });
            doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
            doc.text(expense.category, 275, y, { width: 90 });
            doc.text(formatDate(expense.incurredOn), 370, y, { width: 80 });
            doc.text(formatCurrency(expense.amount), 448, y, { width: 100, align: 'right' });
            y += 18;
        });
    }
    doc.end();
});
