'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { Facture, Company, InvoiceLine } from '../models/Models';

// Styles professionnels pour le PDF
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#333333',
  },
  
  // En-tête avec deux colonnes
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
  },
  headerLeft: {
    width: '55%',
  },
  headerRight: {
    width: '40%',
    textAlign: 'right',
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  companyDetails: {
    fontSize: 8,
    color: '#666666',
    lineHeight: 1.5,
  },
  invoiceLabel: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 15,
    letterSpacing: 2,
  },
  invoiceMeta: {
    fontSize: 9,
    marginBottom: 4,
  },
  metaLabel: {
    color: '#888888',
  },
  metaValue: {
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },

  // Section deux colonnes (émetteur/destinataire)
  addressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 35,
  },
  addressBlock: {
    width: '45%',
  },
  addressTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  addressName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 9,
    color: '#444444',
    marginBottom: 2,
  },

  // Projet
  projectSection: {
    marginBottom: 25,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderLeftWidth: 3,
    borderLeftColor: '#1a1a1a',
  },
  projectLabel: {
    fontSize: 8,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  projectName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginTop: 3,
  },

  // Tableau des prestations
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    backgroundColor: '#fafafa',
  },
  colDescription: {
    width: '38%',
    paddingRight: 10,
  },
  colUnit: {
    width: '12%',
    textAlign: 'center',
  },
  colQuantity: {
    width: '12%',
    textAlign: 'center',
  },
  colPrice: {
    width: '19%',
    textAlign: 'right',
  },
  colTotal: {
    width: '19%',
    textAlign: 'right',
  },
  cellText: {
    fontSize: 9,
    color: '#333333',
  },
  cellTextBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },

  // Section totaux
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 30,
  },
  totalsTable: {
    width: 220,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  totalRowBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#dddddd',
  },
  totalLabel: {
    fontSize: 9,
    color: '#666666',
  },
  totalValue: {
    fontSize: 9,
    color: '#333333',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },

  // Notes / Conditions
  notesSection: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  notesTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 9,
    color: '#444444',
    lineHeight: 1.5,
  },

  // Pied de page
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 50,
    right: 50,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#dddddd',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerColumn: {
    width: '30%',
  },
  footerTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 2,
  },
  footerCenter: {
    textAlign: 'center',
    marginTop: 15,
  },
  footerCenterText: {
    fontSize: 7,
    color: '#aaaaaa',
  },

  // Statut
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 2,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#2e7d32',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
}: FacturePDFProps) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: facture.currency || 'EUR',
    }).format(amount);
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'payée':
        return { bg: '#e8f5e9', color: '#2e7d32' };
      case 'sent':
      case 'envoyée':
        return { bg: '#e3f2fd', color: '#1565c0' };
      case 'overdue':
      case 'en retard':
        return { bg: '#ffebee', color: '#c62828' };
      default:
        return { bg: '#f5f5f5', color: '#616161' };
    }
  };

  const statusColors = getStatusStyle(facture.facture_status);

  const getUnitLabel = (unit?: string) => {
    switch (unit) {
      case 'hour': return 'h';
      case 'day': return 'j';
      case 'fixed': return '';
      case 'unit': return 'u';
      default: return 'h';
    }
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
    if (line.unit === 'fixed') {
      return `${line.quantity}`;
    }
    return `${line.quantity}${getUnitLabel(line.unit)}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company?.name && (
              <Text style={styles.companyName}>{company.name}</Text>
            )}
            <Text style={styles.companyDetails}>
              {[
                company?.location,
                company?.phoneNumber,
                company?.email,
                company?.website,
              ]
                .filter(Boolean)
                .join('\n')}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceLabel}>FACTURE</Text>
            <Text style={styles.invoiceMeta}>
              <Text style={styles.metaLabel}>N° </Text>
              <Text style={styles.metaValue}>{facture.reference || '-'}</Text>
            </Text>
            <Text style={styles.invoiceMeta}>
              <Text style={styles.metaLabel}>Date : </Text>
              <Text style={styles.metaValue}>{formatDate(facture.date)}</Text>
            </Text>
            <Text style={styles.invoiceMeta}>
              <Text style={styles.metaLabel}>Échéance : </Text>
              <Text style={styles.metaValue}>{formatDate(facture.due_date)}</Text>
            </Text>
            {facture.facture_status && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColors.bg, alignSelf: 'flex-end' },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColors.color }]}>
                  {facture.facture_status}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Adresses émetteur / destinataire */}
        <View style={styles.addressSection}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressTitle}>De</Text>
            {company?.name && (
              <Text style={styles.addressName}>{company.name}</Text>
            )}
            {company?.location && (
              <Text style={styles.addressLine}>{company.location}</Text>
            )}
            {company?.email && (
              <Text style={styles.addressLine}>{company.email}</Text>
            )}
            {company?.phoneNumber && (
              <Text style={styles.addressLine}>{company.phoneNumber}</Text>
            )}
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.addressTitle}>Facturer à</Text>
            <Text style={styles.addressName}>
              {facture.client_id?.name || 'Client non spécifié'}
            </Text>
            {facture.client_id?.enterprise && (
              <Text style={styles.addressLine}>{facture.client_id.enterprise}</Text>
            )}
            {facture.client_id?.adress && (
              <Text style={styles.addressLine}>{facture.client_id.adress}</Text>
            )}
            {facture.client_id?.email && (
              <Text style={styles.addressLine}>{facture.client_id.email}</Text>
            )}
          </View>
        </View>

        {/* Projet */}
        {facture.project?.title && (
          <View style={styles.projectSection}>
            <Text style={styles.projectLabel}>Projet concerné</Text>
            <Text style={styles.projectName}>{facture.project.title}</Text>
          </View>
        )}

        {/* Tableau des prestations */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDescription, styles.tableHeaderCell]}>
              Description
            </Text>
            <Text style={[styles.colUnit, styles.tableHeaderCell]}>
              Type
            </Text>
            <Text style={[styles.colQuantity, styles.tableHeaderCell]}>
              Quantité
            </Text>
            <Text style={[styles.colPrice, styles.tableHeaderCell]}>
              Prix unitaire
            </Text>
            <Text style={[styles.colTotal, styles.tableHeaderCell]}>
              Montant
            </Text>
          </View>
          {invoiceLines.map((line, index) => (
            <View
              key={line.id || index}
              style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            >
              <Text style={[styles.colDescription, styles.cellText]}>
                {line.description || '-'}
              </Text>
              <Text style={[styles.colUnit, styles.cellText]}>
                {getUnitDisplay(line.unit)}
              </Text>
              <Text style={[styles.colQuantity, styles.cellText]}>
                {formatQuantity(line)}
              </Text>
              <Text style={[styles.colPrice, styles.cellText]}>
                {formatCurrency(line.unit_price)}
              </Text>
              <Text style={[styles.colTotal, styles.cellTextBold]}>
                {formatCurrency(line.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totaux */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTable}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sous-total HT</Text>
              <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
            </View>
            {tvaApplicable && (
              <View style={styles.totalRowBorder}>
                <Text style={styles.totalLabel}>TVA ({tvaRate}%)</Text>
                <Text style={styles.totalValue}>{formatCurrency(tvaAmount)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>
                {tvaApplicable ? 'Total TTC' : 'Total'}
              </Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {facture.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes et conditions</Text>
            <Text style={styles.notesText}>{facture.notes}</Text>
          </View>
        )}

        {/* Pied de page */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.footerColumn}>
              <Text style={styles.footerTitle}>Informations légales</Text>
              {company?.siret && (
                <Text style={styles.footerText}>SIRET : {company.siret}</Text>
              )}
              {company?.siren && (
                <Text style={styles.footerText}>SIREN : {company.siren}</Text>
              )}
              {company?.vat && (
                <Text style={styles.footerText}>TVA : {company.vat}</Text>
              )}
            </View>
            <View style={styles.footerColumn}>
              <Text style={styles.footerTitle}>Coordonnées</Text>
              {company?.email && (
                <Text style={styles.footerText}>{company.email}</Text>
              )}
              {company?.phoneNumber && (
                <Text style={styles.footerText}>{company.phoneNumber}</Text>
              )}
            </View>
            <View style={styles.footerColumn}>
              <Text style={styles.footerTitle}>Paiement</Text>
              <Text style={styles.footerText}>À régler avant le</Text>
              <Text style={styles.footerText}>{formatDate(facture.due_date)}</Text>
            </View>
          </View>
          <View style={styles.footerCenter}>
            <Text style={styles.footerCenterText}>
              Merci pour votre confiance
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default FacturePDF;
