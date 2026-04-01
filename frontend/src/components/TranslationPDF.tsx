import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import '../lib/pdfFonts';

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    paddingTop: 56,
    paddingBottom: 72,
    paddingHorizontal: 56,
    fontFamily: 'Noto Sans',
    color: '#1a1a1a',
    fontSize: 11,
    lineHeight: 1.7,
  },
  brand: {
    fontSize: 9,
    fontWeight: 700,
    color: '#b45309',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111111',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 11,
    color: '#737373',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 28,
    paddingBottom: 20,
    borderBottom: '1px solid #e5e5e5',
  },
  metaLabel: {
    fontSize: 9,
    color: '#a3a3a3',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    color: '#404040',
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#111111',
    marginBottom: 8,
    marginTop: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.7,
    color: '#404040',
  },
  divider: {
    borderBottom: '1px solid #e5e5e5',
    marginVertical: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 36,
    left: 56,
    right: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1px solid #e5e5e5',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#a3a3a3',
  },
});

interface TranslationPDFProps {
  fileName: string;
  targetLanguage: string;
  translatedText: string;
  originalText?: string;
  fontFamily?: string;
}

export function TranslationPDF({ fileName, targetLanguage, translatedText, originalText, fontFamily = 'Noto Sans' }: TranslationPDFProps) {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={{ ...s.page, fontFamily }}>
        <Text style={s.brand}>METY Technology</Text>

        <Text style={s.title}>CSA Worksheet — {targetLanguage}</Text>
        <Text style={s.subtitle}>{fileName}</Text>

        <View style={s.metaRow}>
          <View>
            <Text style={s.metaLabel}>Language</Text>
            <Text style={s.metaValue}>{targetLanguage}</Text>
          </View>
          <View>
            <Text style={s.metaLabel}>Source File</Text>
            <Text style={s.metaValue}>{fileName}</Text>
          </View>
          <View>
            <Text style={s.metaLabel}>Date</Text>
            <Text style={s.metaValue}>{date}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>{targetLanguage} Worksheet</Text>
        <Text style={s.body}>{translatedText}</Text>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>CSA Worksheet · METY Technology</Text>
          <Text style={s.footerText}>{date}</Text>
        </View>
      </Page>
    </Document>
  );
}
