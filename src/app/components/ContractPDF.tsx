'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type { Contract } from '@/lib/api';

// Professional styles for the contract PDF
const styles = StyleSheet.create({
  page: {
    padding: 50,
    paddingBottom: 100,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#333333',
  },
  
  // Header
  header: {
    textAlign: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#7C3AED',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 11,
    color: '#666666',
  },

  // Parties section
  partiesSection: {
    marginBottom: 25,
  },
  partiesTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  partyBlock: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  partyDetails: {
    fontSize: 9,
    color: '#555555',
    lineHeight: 1.5,
  },
  partyDivider: {
    textAlign: 'center',
    fontSize: 10,
    color: '#888888',
    marginVertical: 8,
  },

  // Preamble
  preambleSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  preambleText: {
    fontSize: 10,
    color: '#444444',
    lineHeight: 1.6,
    textAlign: 'justify',
  },

  // Articles
  articlesSection: {
    marginBottom: 30,
  },
  articlesIntro: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  article: {
    marginBottom: 15,
  },
  articleTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  articleContent: {
    fontSize: 9,
    color: '#444444',
    lineHeight: 1.6,
    textAlign: 'justify',
  },

  // Signatures
  signaturesSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#dddddd',
    minPresenceAhead: 150, // Ensure enough space before page break
  },
  signatureLocation: {
    textAlign: 'center',
    fontSize: 10,
    color: '#666666',
    marginBottom: 30,
  },
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '45%',
    textAlign: 'center',
  },
  signatureLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  signatureImage: {
    height: 60,
    maxHeight: 60,
    marginBottom: 10,
    objectFit: 'contain',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    marginTop: 50,
    marginBottom: 5,
  },
  signatureDate: {
    fontSize: 8,
    color: '#888888',
    marginTop: 5,
  },
  signaturePlaceholder: {
    height: 60,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderStyle: 'dashed',
    borderRadius: 4,
    marginBottom: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signaturePlaceholderText: {
    fontSize: 8,
    color: '#999999',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  footerText: {
    fontSize: 8,
    color: '#999999',
  },

  // Page number
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 50,
    fontSize: 8,
    color: '#999999',
  },
});

interface ContractPDFProps {
  contract: Contract;
  companyName?: string;
  companyLogo?: string;
}

export default function ContractPDF({ contract, companyName }: ContractPDFProps) {
  const { content, provider_signature, client_signature, provider_signed_at, client_signed_at } = contract;
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{content.title}</Text>
          {companyName && (
            <Text style={styles.subtitle}>{companyName}</Text>
          )}
        </View>

        {/* Parties */}
        <View style={styles.partiesSection}>
          <Text style={styles.partiesTitle}>ENTRE LES SOUSSIGNÉS :</Text>
          
          <View style={styles.partyBlock}>
            <Text style={styles.partyName}>{content.parties.provider.name}</Text>
            <Text style={styles.partyDetails}>{content.parties.provider.details}</Text>
          </View>
          
          <Text style={styles.partyDivider}>ET</Text>
          
          <View style={styles.partyBlock}>
            <Text style={styles.partyName}>{content.parties.client.name}</Text>
            <Text style={styles.partyDetails}>{content.parties.client.details}</Text>
          </View>
        </View>

        {/* Preamble */}
        <View style={styles.preambleSection}>
          <Text style={styles.sectionTitle}>PRÉAMBULE</Text>
          <Text style={styles.preambleText}>{content.preamble}</Text>
        </View>

        {/* Articles */}
        <View style={styles.articlesSection}>
          <Text style={styles.articlesIntro}>IL A ÉTÉ CONVENU CE QUI SUIT :</Text>
          
          {content.articles.map((article) => (
            <View key={article.number} style={styles.article}>
              <Text style={styles.articleTitle}>
                Article {article.number} - {article.title}
              </Text>
              <Text style={styles.articleContent}>{article.content}</Text>
            </View>
          ))}
        </View>

        {/* Signatures */}
        <View style={styles.signaturesSection} wrap={false}>
          <Text style={styles.signatureLocation}>
            Fait à {content.signatures.location}, le {content.signatures.date}
          </Text>
          
          <View style={styles.signaturesRow}>
            {/* Provider Signature */}
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Le Prestataire</Text>
              {provider_signature ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={provider_signature} style={styles.signatureImage} />
                  <Text style={styles.signatureDate}>
                    Signé le {formatDate(provider_signed_at) || content.signatures.date}
                  </Text>
                </>
              ) : (
                <View style={styles.signaturePlaceholder}>
                  <Text style={styles.signaturePlaceholderText}>En attente de signature</Text>
                </View>
              )}
            </View>

            {/* Client Signature */}
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Le Client</Text>
              {client_signature ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={client_signature} style={styles.signatureImage} />
                  <Text style={styles.signatureDate}>
                    Signé le {formatDate(client_signed_at) || content.signatures.date}
                  </Text>
                </>
              ) : (
                <View style={styles.signaturePlaceholder}>
                  <Text style={styles.signaturePlaceholderText}>En attente de signature</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Document généré par Eclipse Dashboard
          </Text>
        </View>

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

