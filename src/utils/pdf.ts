import type { jsPDF } from "jspdf";

const pageMargin = 14;

export function addPdfHeader(doc: jsPDF, title: string, subtitle?: string) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(11, 11, 11);
  doc.rect(0, 0, width, 34, "F");
  doc.setFillColor(242, 183, 5);
  doc.rect(0, 34, width, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Taller de Motos Villa", pageMargin, 14);

  doc.setTextColor(255, 208, 138);
  doc.setFontSize(9);
  doc.text("Servicio de motocicletas", pageMargin, 21);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(title, pageMargin, 46);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(subtitle, pageMargin, 52);
    return 62;
  }

  return 56;
}

export function addPdfFooter(doc: jsPDF) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(230, 230, 230);
    doc.line(pageMargin, height - 16, width - pageMargin, height - 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text("Hecho desde Moto-Flow | Sistema de gestion para talleres", pageMargin, height - 9);
    doc.text(`Pagina ${page} de ${pages}`, width - pageMargin, height - 9, { align: "right" });
  }
}

export function ensurePdfSpace(doc: jsPDF, y: number, needed = 24) {
  const height = doc.internal.pageSize.getHeight();
  if (y + needed < height - 22) return y;
  doc.addPage();
  return 18;
}

export function pdfInfoBox(doc: jsPDF, label: string, value: string, x: number, y: number, width: number) {
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(x, y, width, 20, 3, 3, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(label, x + 4, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(doc.splitTextToSize(value, width - 8), x + 4, y + 14);
}
