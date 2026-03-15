'use client';

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { Facture, Company, InvoiceLine } from '../models/Models';

// Enregistrer la police DM Sans si disponible (optionnel - Helvetica comme fallback)
const fontFamily = 'Helvetica';

const styles = StyleSheet.create({
  page: {
    padding: 0,
    paddingBottom: 0,
    fontSize: 10,
    fontFamily,
    backgroundColor: '#ffffff',
    color: '#0a0a0a',
    display: 'flex',
    flexDirection: 'column',
  },
  // Barre accent noire
  accentBar: {
    height: 4,
    backgroundColor: '#0a0a0a',
  },
  // Header
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 36,
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#e0ddd6',
  },
  brandBlock: {
    flexDirection: 'column',
    gap: 16,
  },
  brandLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogoMark: {
    width: 38,
    height: 38,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandLogoImage: {
    width: 38,
    height: 38,
    objectFit: 'contain',
  },
  brandInitials: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  brandName: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: '#0a0a0a',
    letterSpacing: -0.5,
    lineHeight: 1.2,
  },
  brandTagline: {
    fontSize: 11,
    color: '#888888',
    marginTop: 1,
  },
  brandContacts: {
    flexDirection: 'column',
    gap: 4,
  },
  brandContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    fontSize: 11,
    color: '#444444',
  },
  invoiceIdBlock: {
    textAlign: 'right',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 10,
  },
  invLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#888888',
  },
  invNum: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 28,
    color: '#0a0a0a',
    letterSpacing: -0.5,
    lineHeight: 1,
  },
  invStatus: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 4,
    paddingHorizontal: 11,
    borderRadius: 20,
    backgroundColor: '#e6f4ee',
    color: '#166534',
  },
  invStatusPending: {
    backgroundColor: '#fef9c3',
    color: '#854d0e',
  },
  // Meta grid
  metaGrid: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0ddd6',
  },
  metaCell: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 24,
    paddingLeft: 48,
    borderRightWidth: 1,
    borderRightColor: '#e0ddd6',
  },
  metaCellLast: {
    borderRightWidth: 0,
  },
  metaCellLbl: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#888888',
    marginBottom: 5,
  },
  metaCellVal: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0a0a0a',
  },
  metaCellValMono: {
    fontFamily: 'Helvetica',
  },
  // Parties
  parties: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0ddd6',
    backgroundColor: '#f7f6f3',
  },
  party: {
    flex: 1,
    paddingVertical: 22,
    paddingHorizontal: 48,
    borderRightWidth: 1,
    borderRightColor: '#e0ddd6',
  },
  partyLast: {
    borderRightWidth: 0,
  },
  partyRole: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#888888',
    marginBottom: 10,
  },
  partyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0a0a0a',
    marginBottom: 5,
    letterSpacing: -0.3,
  },
  partyDetail: {
    fontSize: 12,
    color: '#444444',
    lineHeight: 1.7,
  },
  // Section title
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0ddd6',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#888888',
  },
  // Table
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#f7f6f3',
    borderBottomWidth: 1,
    borderBottomColor: '#e0ddd6',
    paddingVertical: 9,
    paddingHorizontal: 16,
    paddingLeft: 48,
  },
  tableHeadCell: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#888888',
  },
  tableHeadCellRight: {
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingLeft: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#e0ddd6',
    alignItems: 'flex-start',
  },
  colDesc: { flex: 3, paddingRight: 10 },
  colType: { width: 60 },
  colQty: { width: 50, textAlign: 'right' },
  colPrice: { width: 80, textAlign: 'right' },
  colTotal: { width: 80, textAlign: 'right', paddingRight: 48 },
  cellText: {
    fontSize: 10,
    color: '#0a0a0a',
  },
  cellTextBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0a0a0a',
  },
  tdType: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#f7f6f3',
    borderWidth: 1,
    borderColor: '#e0ddd6',
    color: '#444444',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 4,
  },
  // Totals
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 24,
    paddingHorizontal: 48,
    paddingTop: 24,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#e0ddd6',
    backgroundColor: '#f7f6f3',
  },
  totalsBlock: {
    width: 280,
  },
  totRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    fontSize: 12,
    color: '#444444',
  },
  totVal: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#444444',
  },
  totSep: {
    height: 1,
    backgroundColor: '#e0ddd6',
    marginVertical: 12,
  },
  totFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 10,
  },
  totFinalLbl: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0a0a0a',
  },
  totFinalVal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: '#0a0a0a',
    letterSpacing: -0.5,
  },
  // Notes
  notesSection: {
    paddingVertical: 22,
    paddingHorizontal: 48,
    borderTopWidth: 1,
    borderTopColor: '#e0ddd6',
  },
  notesLbl: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#888888',
    marginBottom: 7,
  },
  notesText: {
    fontSize: 12,
    color: '#444444',
    lineHeight: 1.7,
  },
  // Footer
  docFooter: {
    borderTopWidth: 3,
    borderTopColor: '#0a0a0a',
    paddingVertical: 18,
    paddingHorizontal: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f7f6f3',
    flexWrap: 'wrap',
    gap: 8,
  },
  footerLeft: {
    fontSize: 10,
    color: '#444444',
    lineHeight: 1.8,
  },
  footerRight: {
    textAlign: 'right',
    fontSize: 10,
    color: '#888888',
    lineHeight: 1.8,
  },
  footerStrong: {
    fontFamily: 'Helvetica-Bold',
    color: '#0a0a0a',
  },
});

interface FacturePDFProps {
  facture: Facture;
  company: Company | null;
  invoiceLines: InvoiceLine[];
  tvaApplicable: boolean;
  tvaRate: number;
  tvaAmount: number;
  subtotal: number;
  total: number;
  logoUrl?: string | null;
}

const FacturePDF = ({
  facture,
  company,
  invoiceLines,
  tvaApplicable,
  tvaRate,
  tvaAmount,
  subtotal,
  total,
  logoUrl,
}: FacturePDFProps) => {
  const isQuote = facture.document_type === 'quote';
  const documentTitle = isQuote ? 'Devis' : 'Facture';
  const dateLabel = isQuote ? "Valide jusqu'au" : "Date d'échéance";
  const dateValue = isQuote ? facture.valid_until : facture.due_date;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    const currency = facture.currency || 'EUR';
    const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
    const parts = amount.toFixed(2).split('.');
    const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${int},${parts[1]} ${symbol}`;
  };

  const getUnitDisplay = (unit?: string) => {
    switch (unit) {
      case 'hour': return 'Heure';
      case 'day': return 'Jour';
      case 'fixed': return 'Forfait';
      case 'unit': return 'Unité';
      default: return 'Heure';
    }
  };

  const formatQuantity = (line: InvoiceLine) => {
    if (line.unit === 'fixed') return `${line.quantity}`;
    const suffix = line.unit === 'hour' ? 'h' : line.unit === 'day' ? 'j' : 'u';
    return `${line.quantity} ${suffix}`;
  };

  const status = isQuote ? (facture.quote_status || 'draft') : (facture.facture_status || 'draft');
  const initials = company?.name
    ? company.name.trim().split(/\s+/).length >= 2
      ? (company.name.split(/\s+/)[0][0] + company.name.split(/\s+/).pop()![0]).toUpperCase()
      : company.name.slice(0, 2).toUpperCase()
    : '?';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Barre accent */}
        <View style={styles.accentBar} fixed />

        {/* Header */}
        <View style={styles.docHeader} wrap={false}>
          <View style={styles.brandBlock}>
            <View style={styles.brandLogo}>
              {logoUrl ? (
                <View style={styles.brandLogoMark}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={logoUrl} style={styles.brandLogoImage} />
                </View>
              ) : (
                <View style={styles.brandLogoMark}>
                  <Text style={styles.brandInitials}>{initials}</Text>
                </View>
              )}
              <View>
                <Text style={styles.brandName}>{company?.name || 'Entreprise'}</Text>
                {company?.domaine && (
                  <Text style={styles.brandTagline}>{company.domaine}</Text>
                )}
              </View>
            </View>
            <View style={styles.brandContacts}>
              {company?.email && (
                <Text style={styles.brandContactRow}>{company.email}</Text>
              )}
              {company?.website && (
                <Text style={styles.brandContactRow}>{company.website}</Text>
              )}
              {company?.phoneNumber && (
                <Text style={styles.brandContactRow}>{company.phoneNumber}</Text>
              )}
            </View>
          </View>
          <View style={styles.invoiceIdBlock}>
            <Text style={styles.invLabel}>{documentTitle}</Text>
            <Text style={styles.invNum}>#{facture.reference || '-'}</Text>
            <Text style={[styles.invStatus, (status === 'paid' || status === 'accepted') ? {} : styles.invStatusPending]}>
              {status === 'paid' || status === 'accepted' ? 'Payée' : status === 'sent' ? 'Envoyée' : 'Brouillon'}
            </Text>
          </View>
        </View>

        {/* Meta grid */}
        <View style={styles.metaGrid} wrap={false}>
          <View style={styles.metaCell}>
            <Text style={styles.metaCellLbl}>Référence</Text>
            <Text style={[styles.metaCellVal, styles.metaCellValMono]}>{facture.reference || '-'}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaCellLbl}>Date d&apos;émission</Text>
            <Text style={styles.metaCellVal}>{formatDate(facture.date)}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaCellLbl}>{dateLabel}</Text>
            <Text style={styles.metaCellVal}>{dateValue ? formatDate(dateValue) : '-'}</Text>
          </View>
          <View style={[styles.metaCell, styles.metaCellLast]}>
            <Text style={styles.metaCellLbl}>Devise</Text>
            <Text style={styles.metaCellVal}>{facture.currency || 'EUR'} — Euro</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.parties} wrap={false}>
          <View style={styles.party}>
            <Text style={styles.partyRole}>Émetteur</Text>
            <Text style={styles.partyName}>{company?.name || 'Entreprise'}</Text>
            <Text style={styles.partyDetail}>
              {[company?.email, company?.siret && `SIRET : ${company.siret}`, company?.siren && `SIREN : ${company.siren}`, company?.location]
                .filter(Boolean)
                .join('\n')}
            </Text>
          </View>
          <View style={[styles.party, styles.partyLast]}>
            <Text style={styles.partyRole}>Destinataire</Text>
            <Text style={styles.partyName}>{facture.client_id?.name || 'Client'}</Text>
            <Text style={styles.partyDetail}>
              {[facture.client_id?.email, facture.client_id?.enterprise, facture.client_id?.website, facture.client_id?.adress]
                .filter(Boolean)
                .join('\n')}
            </Text>
          </View>
        </View>

        {/* Prestations */}
        <View style={styles.sectionTitleRow} wrap={false}>
          <Text style={styles.sectionTitle}>Prestations</Text>
        </View>
        <View style={styles.tableHead} wrap={false}>
          <Text style={[styles.tableHeadCell, styles.colDesc]}>Description</Text>
          <Text style={[styles.tableHeadCell, styles.colType]}>Type</Text>
          <Text style={[styles.tableHeadCell, styles.tableHeadCellRight, styles.colQty]}>Qté</Text>
          <Text style={[styles.tableHeadCell, styles.tableHeadCellRight, styles.colPrice]}>Prix unitaire</Text>
          <Text style={[styles.tableHeadCell, styles.tableHeadCellRight, styles.colTotal]}>Total HT</Text>
        </View>
        {invoiceLines.map((line, index) => (
          <View key={line.id || index} style={styles.tableRow} wrap={false}>
            <Text style={[styles.colDesc, styles.cellTextBold]}>{line.description || '-'}</Text>
            <View style={styles.colType}>
              <Text style={styles.tdType}>{getUnitDisplay(line.unit)}</Text>
            </View>
            <Text style={[styles.colQty, styles.cellText]}>{formatQuantity(line)}</Text>
            <Text style={[styles.colPrice, styles.cellText]}>
              {line.unit === 'fixed' ? '—' : formatCurrency(line.unit_price)}
            </Text>
            <Text style={[styles.colTotal, styles.cellTextBold]}>
              {line.total === 0 ? 'Offert' : formatCurrency(line.total)}
            </Text>
          </View>
        ))}

        {/* Totaux */}
        <View style={styles.totalsSection} wrap={false}>
          <View style={styles.totalsBlock}>
            <View style={styles.totRow}>
              <Text>Sous-total HT</Text>
              <Text style={styles.totVal}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.totRow}>
              <Text>TVA ({tvaApplicable ? `${tvaRate}%` : '0%'} — {tvaApplicable ? 'applicable' : 'non applicable'})</Text>
              <Text style={!tvaApplicable ? { ...styles.totVal, color: '#bbbbbb' } : styles.totVal}>
                {tvaApplicable ? formatCurrency(tvaAmount) : '—'}
              </Text>
            </View>
            <View style={styles.totSep} />
            <View style={styles.totFinal}>
              <Text style={styles.totFinalLbl}>Total TTC</Text>
              <Text style={styles.totFinalVal}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {facture.notes && (
          <View style={styles.notesSection} wrap={false}>
            <Text style={styles.notesLbl}>Conditions de règlement</Text>
            <Text style={styles.notesText}>{facture.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.docFooter} fixed wrap={false}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerStrong}>{company?.name || 'Entreprise'}</Text>
            <Text>{(company?.siret ? `SIRET ${company.siret} · ` : '') + (company?.siren ? `SIREN ${company.siren}` : '')}</Text>
            <Text>{(company?.email ? `${company.email} · ` : '') + (company?.phoneNumber || '')}</Text>
          </View>
          <View style={styles.footerRight}>
            <Text>{documentTitle} <Text style={styles.footerStrong}>#{facture.reference}</Text></Text>
            <Text>Émise le {formatDate(facture.date)}</Text>
            <Text>Page 1 / 1</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default FacturePDF;
