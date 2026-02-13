'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  IconLoader2,
  IconAlertTriangle,
  IconCheck,
  IconSignature,
  IconTrash,
  IconFileText,
  IconLanguage,
} from '@tabler/icons-react';
import { fetchContractByToken, signContractAsClient, type Contract } from '@/lib/api';

// Translations for the public contract page
const translations = {
  fr: {
    loading: 'Chargement du contrat...',
    error: 'Erreur',
    invalidToken: 'Token invalide',
    contractNotFound: 'Contrat introuvable ou lien expiré',
    loadingError: 'Erreur lors du chargement du contrat',
    signingError: 'Erreur lors de la signature',
    successTitle: 'Contrat signé avec succès !',
    successMessage: 'Merci d\'avoir signé ce contrat. Vous recevrez une copie par email sous peu.',
    contract: 'Contrat',
    from: 'De la part de',
    signContract: 'Signer le contrat',
    sign: 'Signer',
    betweenParties: 'ENTRE LES SOUSSIGNÉS :',
    and: 'ET',
    thatsYou: '← C\'est vous',
    preamble: 'PRÉAMBULE',
    agreedTerms: 'IL A ÉTÉ CONVENU CE QUI SUIT :',
    article: 'Article',
    madeAt: 'Fait à',
    on: 'le',
    provider: 'Le Prestataire',
    client: 'Le Client',
    signedOn: 'Signé le',
    pending: 'En attente',
    clickToSign: 'Cliquer pour signer',
    yourSignature: '← Votre signature',
    signContractModal: 'Signez le contrat',
    drawSignature: 'Dessinez votre signature ci-dessous',
    clear: 'Effacer',
    cancel: 'Annuler',
    signing: 'Signature...',
    legalNotice: '⚠️ En signant ce document, vous acceptez les termes du contrat ci-dessus. Cette signature électronique a valeur légale.',
  },
  en: {
    loading: 'Loading contract...',
    error: 'Error',
    invalidToken: 'Invalid token',
    contractNotFound: 'Contract not found or link expired',
    loadingError: 'Error loading contract',
    signingError: 'Error signing contract',
    successTitle: 'Contract signed successfully!',
    successMessage: 'Thank you for signing this contract. You will receive a copy by email shortly.',
    contract: 'Contract',
    from: 'From',
    signContract: 'Sign Contract',
    sign: 'Sign',
    betweenParties: 'BETWEEN THE UNDERSIGNED:',
    and: 'AND',
    thatsYou: '← That\'s you',
    preamble: 'PREAMBLE',
    agreedTerms: 'IT HAS BEEN AGREED AS FOLLOWS:',
    article: 'Article',
    madeAt: 'Made at',
    on: 'on',
    provider: 'The Provider',
    client: 'The Client',
    signedOn: 'Signed on',
    pending: 'Pending',
    clickToSign: 'Click to sign',
    yourSignature: '← Your signature',
    signContractModal: 'Sign the contract',
    drawSignature: 'Draw your signature below',
    clear: 'Clear',
    cancel: 'Cancel',
    signing: 'Signing...',
    legalNotice: '⚠️ By signing this document, you accept the terms of the contract above. This electronic signature is legally binding.',
  },
};

type Language = 'fr' | 'en';

export default function PublicContractSignPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;

  // Language state - can be set via URL param ?lang=en
  const [language, setLanguage] = useState<Language>('fr');
  const t = translations[language];

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Set language from URL param on mount
  useEffect(() => {
    const langParam = searchParams.get('lang');
    if (langParam === 'en' || langParam === 'fr') {
      setLanguage(langParam);
    }
  }, [searchParams]);

  // Fetch contract on mount
  useEffect(() => {
    const loadContract = async () => {
      if (!token) {
        setError(t.invalidToken);
        setLoading(false);
        return;
      }

      try {
        const data = await fetchContractByToken(token);
        if (!data) {
          setError(t.contractNotFound);
        } else if (data.client_signature) {
          setSigned(true);
          setContract(data);
        } else {
          setContract(data);
        }
      } catch {
        setError(t.loadingError);
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Clean the edited HTML to remove signature section
  const cleanedHtml = useMemo(() => {
    const editedHtml = (contract?.content as { editedHtml?: string })?.editedHtml;
    if (!editedHtml) return null;
    
    // Remove signature section from HTML (usually at the end with hr, Fait à, etc.)
    let cleaned = editedHtml;
    
    // Remove everything after the last hr or "Fait à"
    const hrIndex = cleaned.lastIndexOf('<hr');
    if (hrIndex > 0) {
      cleaned = cleaned.substring(0, hrIndex);
    }
    
    // Also try to remove "Fait à" section if no hr
    const faitAIndex = cleaned.lastIndexOf('Fait à');
    const madeAtIndex = cleaned.lastIndexOf('Made at');
    const signatureIndex = Math.max(faitAIndex, madeAtIndex);
    if (signatureIndex > 0) {
      // Find the parent paragraph or div
      const beforeSignature = cleaned.substring(0, signatureIndex);
      const lastOpenTag = Math.max(
        beforeSignature.lastIndexOf('<p'),
        beforeSignature.lastIndexOf('<div')
      );
      if (lastOpenTag > 0) {
        cleaned = cleaned.substring(0, lastOpenTag);
      }
    }
    
    return cleaned;
  }, [contract?.content]);

  // Canvas drawing functions
  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setLastPos(coords);
  }, [getCanvasCoords]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const coords = getCanvasCoords(e);
    
    ctx.beginPath();
    ctx.strokeStyle = '#1a1428';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    setLastPos(coords);
  }, [isDrawing, lastPos, getCanvasCoords]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !token) return;
    
    const signature = canvas.toDataURL('image/png');
    setSignatureData(signature);
    setSigning(true);

    try {
      const result = await signContractAsClient(token, signature);
      if (result.success) {
        setSigned(true);
        setShowSignaturePad(false);
      } else {
        setError(result.message);
      }
    } catch {
      setError(t.signingError);
    } finally {
      setSigning(false);
    }
  };

  const formatDate = (dateString?: string, locale: Language = 'fr') => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'fr' ? 'en' : 'fr');
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <IconLoader2 className="w-12 h-12 !text-violet-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white  shadow-xl p-8 max-w-md !text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconAlertTriangle className="w-8 h-8 !text-red-500" />
          </div>
          <h1 className="text-xl font-bold !text-slate-900 mb-2">{t.error}</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white  shadow-xl p-8 max-w-md !text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <IconCheck className="w-10 h-10 !text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold !text-slate-900 mb-2">
            {t.successTitle}
          </h1>
          <p className="text-slate-600 mb-6">
            {t.successMessage}
          </p>
          <div className="p-4 bg-slate-50  !text-left">
            <p className="text-sm !text-slate-500 mb-1">{t.contract}</p>
            <p className="font-medium !text-slate-900">{contract?.title}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!contract) return null;

  const { content } = contract;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-violet-50">
      {/* Sticky Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Contract info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-violet-100  flex-shrink-0">
                <IconFileText className="w-5 h-5 sm:w-6 sm:h-6 !text-violet-600" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold !text-slate-900 !text-sm sm:!text-base truncate">
                  {content.title}
                </h1>
                <p className="!text-xs sm:!text-sm !text-slate-500 truncate">
                  {t.from} {content.parties.provider.name}
                </p>
              </div>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 !text-slate-600 hover:!text-slate-900 hover:bg-slate-100  transition-colors"
                title={language === 'fr' ? 'Switch to English' : 'Passer en français'}
              >
                <IconLanguage className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="!text-xs sm:!text-sm font-medium uppercase">{language}</span>
              </button>
              
              {/* Sign Button */}
              {!showSignaturePad && (
                <button
                  onClick={() => setShowSignaturePad(true)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-violet-600 !text-white  hover:bg-violet-700 transition-colors !text-sm sm:!text-base font-medium whitespace-nowrap"
                >
                  <IconSignature className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">{t.signContract}</span>
                  <span className="sm:hidden">{t.sign}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Contract Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white  shadow-lg p-6 sm:p-8 mb-8">
          {/* Check if there's edited HTML content */}
          {cleanedHtml ? (
            /* Display cleaned HTML content */
            <div 
              className="contract-content prose prose-slate max-w-none 
                prose-headings:!text-slate-900 prose-headings:font-bold prose-headings:mt-8 prose-headings:mb-4
                prose-h1:!text-2xl prose-h1:!text-center prose-h1:uppercase prose-h1:tracking-wide prose-h1:mb-8
                prose-h2:!text-xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:!text-lg prose-h3:mt-8 prose-h3:mb-3
                prose-p:!text-slate-600 prose-p:leading-relaxed prose-p:mb-4
                prose-strong:!text-slate-900 prose-strong:font-semibold
                prose-ul:my-4 prose-li:my-1
                [&_hr]:my-8 [&_hr]:border-slate-200"
              dangerouslySetInnerHTML={{ __html: cleanedHtml }}
            />
          ) : (
            /* Display structured content */
            <>
              {/* Title */}
              <h2 className="text-xl sm:!text-2xl font-bold !text-center !text-slate-900 mb-8 pb-4 border-b-2 border-violet-200 uppercase tracking-wide">
                {content.title}
              </h2>

              {/* Parties */}
              <div className="mb-10">
                <h3 className="font-bold !text-slate-900 mb-4 !text-lg">{t.betweenParties}</h3>
                
                <div className="p-4 sm:p-5 bg-slate-50  mb-4">
                  <p className="font-semibold !text-slate-900 !text-base sm:!text-lg">{content.parties.provider.name}</p>
                  <p className="text-sm !text-slate-600 whitespace-pre-line mt-3 leading-relaxed">
                    {content.parties.provider.details}
                  </p>
                </div>
                
                <p className="text-center !text-slate-400 my-4 font-medium">{t.and}</p>
                
                <div className="p-4 sm:p-5 bg-violet-50  border-2 border-violet-200">
                  <p className="font-semibold !text-slate-900 !text-base sm:!text-lg">{content.parties.client.name}</p>
                  <p className="text-sm !text-slate-600 whitespace-pre-line mt-3 leading-relaxed">
                    {content.parties.client.details}
                  </p>
                  <p className="!text-xs !text-violet-600 mt-3 font-medium">{t.thatsYou}</p>
                </div>
              </div>

              {/* Preamble */}
              <div className="mb-10">
                <h3 className="font-bold !text-slate-900 mb-4 !text-lg">{t.preamble}</h3>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                  {content.preamble}
                </p>
              </div>

              {/* Articles */}
              <div className="mb-10">
                <h3 className="font-bold !text-slate-900 mb-6 !text-lg">{t.agreedTerms}</h3>
                
                <div className="space-y-8">
                  {content.articles.map((article: { number: number; title: string; content: string }) => (
                    <div key={article.number} className="border-l-4 border-violet-200 !pl-4 sm:pl-6">
                      <h4 className="font-semibold !text-slate-900 mb-3 !text-base">
                        {t.article} {article.number} - {article.title}
                      </h4>
                      <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                        {article.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Signatures Section - Always shown */}
          <div className="mt-12 pt-8 border-t-2 border-slate-200">
            <p className="text-center !text-slate-600 mb-8">
              {t.madeAt} {content.signatures?.location || contract.signature_location}, {t.on} {formatDate(content.signatures?.date || contract.signature_date, language)}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              {/* Provider Signature */}
              <div className="text-center">
                <p className="font-semibold !text-slate-900 mb-4">{t.provider}</p>
                {contract.provider_signature ? (
                  <div className="border border-slate-200  p-4 bg-slate-50">
                    <Image
                      src={contract.provider_signature}
                      alt="Provider signature"
                      width={200}
                      height={80}
                      className="max-h-20 mx-auto object-contain"
                    />
                    <p className="!text-xs !text-green-600 mt-3 font-medium">
                      ✓ {t.signedOn} {formatDate(contract.provider_signed_at || new Date().toISOString(), language)}
                    </p>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300  p-6 sm:p-8 !text-slate-400">
                    {t.pending}
                  </div>
                )}
              </div>

              {/* Client Signature */}
              <div className="text-center">
                <p className="font-semibold !text-slate-900 mb-4">{t.client}</p>
                {signatureData ? (
                  <div className="border-2 border-violet-200  p-4 bg-violet-50">
                    <Image
                      src={signatureData}
                      alt="Your signature"
                      width={200}
                      height={80}
                      className="max-h-20 mx-auto object-contain"
                    />
                    <p className="!text-xs !text-violet-600 mt-3 font-medium">{t.yourSignature}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSignaturePad(true)}
                    className="w-full border-2 border-dashed border-violet-300  p-6 sm:p-8 !text-violet-500 hover:border-violet-500 hover:bg-violet-50 transition-colors"
                  >
                    <IconSignature className="w-8 h-8 mx-auto mb-2" />
                    <span className="block">{t.clickToSign}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white  shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-5 sm:p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold !text-slate-900">
                {t.signContractModal}
              </h3>
              <p className="text-sm !text-slate-500 mt-1">
                {t.drawSignature}
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <div className="bg-white  border-2 border-slate-200 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={200}
                  className="w-full cursor-crosshair touch-none bg-slate-50"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>

              <div className="flex items-center justify-between mt-4 gap-2">
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 !text-slate-600 hover:!text-slate-900 !text-sm"
                >
                  <IconTrash className="w-4 h-4" />
                  {t.clear}
                </button>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowSignaturePad(false)}
                    className="px-3 sm:px-4 py-2 !text-slate-600 hover:!text-slate-900 !text-sm"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleSign}
                    disabled={signing}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-violet-600 !text-white  hover:bg-violet-700 disabled:opacity-50 transition-colors !text-sm sm:!text-base"
                  >
                    {signing ? (
                      <>
                        <IconLoader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">{t.signing}</span>
                      </>
                    ) : (
                      <>
                        <IconCheck className="w-4 h-4" />
                        {t.sign}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Legal notice */}
            <div className="p-4 bg-amber-50 border-t border-amber-200">
              <p className="!text-xs !text-amber-800">
                {t.legalNotice}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
