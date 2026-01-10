import { pdf } from '@react-pdf/renderer';
import FacturePDF from '@/app/components/FacturePDF';
import type { Facture } from '@/types';

interface Company {
  name: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  siret?: string;
  siren?: string;
  vat_number?: string;
  rcs?: string;
  capital_social?: string;
  code_ape?: string;
}

interface InvoiceLine {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  unit?: string;
}

/**
 * Génère un PDF de facture/devis et le retourne en base64
 */
export async function generatePdfBase64(
  facture: Facture,
  company: Company | null,
  defaultTaxRate: number = 20 // Taux de TVA par défaut
): Promise<string> {
  // Parser les lignes de facture
  let invoiceLines: InvoiceLine[] = [];
  if (facture.invoice_lines) {
    if (typeof facture.invoice_lines === 'string') {
      try {
        invoiceLines = JSON.parse(facture.invoice_lines);
      } catch {
        invoiceLines = [];
      }
    } else if (Array.isArray(facture.invoice_lines)) {
      invoiceLines = facture.invoice_lines as InvoiceLine[];
    }
  }

  // Calculer les totaux
  const subtotal = invoiceLines.reduce((sum, line) => sum + (line.total || 0), 0);
  const tvaApplicable = facture.tva_applicable ?? false;
  const tvaRate = tvaApplicable ? defaultTaxRate : 0;
  const tvaAmount = tvaApplicable ? subtotal * (tvaRate / 100) : 0;
  const total = subtotal + tvaAmount;

  // Générer le PDF avec JSX
  const blob = await pdf(
    <FacturePDF
      facture={facture}
      company={company}
      invoiceLines={invoiceLines}
      tvaApplicable={tvaApplicable}
      tvaRate={tvaRate}
      tvaAmount={tvaAmount}
      subtotal={subtotal}
      total={total}
    />
  ).toBlob();

  // Convertir en base64
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

