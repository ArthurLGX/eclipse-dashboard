'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  IconLoader2,
  IconAlertTriangle,
  IconCheck,
  IconSignature,
  IconTrash,
  IconDownload,
  IconFileText,
} from '@tabler/icons-react';
import { fetchContractByToken, signContractAsClient, type Contract } from '@/lib/api';

export default function PublicContractSignPage() {
  const params = useParams();
  const token = params.token as string;

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

  // Fetch contract on mount
  useEffect(() => {
    const loadContract = async () => {
      if (!token) {
        setError('Token invalide');
        setLoading(false);
        return;
      }

      try {
        const data = await fetchContractByToken(token);
        if (!data) {
          setError('Contrat introuvable ou lien expiré');
        } else if (data.client_signature) {
          setSigned(true);
          setContract(data);
        } else {
          setContract(data);
        }
      } catch {
        setError('Erreur lors du chargement du contrat');
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [token]);

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
      setError('Erreur lors de la signature');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <IconLoader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement du contrat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconAlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Erreur</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <IconCheck className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Contrat signé avec succès !
          </h1>
          <p className="text-slate-600 mb-6">
            Merci d&apos;avoir signé ce contrat. Vous recevrez une copie par email sous peu.
          </p>
          <div className="p-4 bg-slate-50 rounded-xl text-left">
            <p className="text-sm text-slate-500 mb-1">Contrat</p>
            <p className="font-medium text-slate-900">{contract?.title}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!contract) return null;

  const { content } = contract;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-xl">
              <IconFileText className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">{content.title}</h1>
              <p className="text-sm text-slate-500">
                De la part de {content.parties.provider.name}
              </p>
            </div>
          </div>
          {!showSignaturePad && (
            <button
              onClick={() => setShowSignaturePad(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
            >
              <IconSignature className="w-5 h-5" />
              <span className="hidden sm:inline">Signer le contrat</span>
            </button>
          )}
        </div>
      </header>

      {/* Contract Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-8 pb-4 border-b-2 border-violet-200">
            {content.title}
          </h2>

          {/* Parties */}
          <div className="mb-8">
            <h3 className="font-bold text-slate-900 mb-4">ENTRE LES SOUSSIGNÉS :</h3>
            
            <div className="p-4 bg-slate-50 rounded-xl mb-4">
              <p className="font-semibold text-slate-900">{content.parties.provider.name}</p>
              <p className="text-sm text-slate-600 whitespace-pre-line mt-2">
                {content.parties.provider.details}
              </p>
            </div>
            
            <p className="text-center text-slate-500 my-4">ET</p>
            
            <div className="p-4 bg-violet-50 rounded-xl border-2 border-violet-200">
              <p className="font-semibold text-slate-900">{content.parties.client.name}</p>
              <p className="text-sm text-slate-600 whitespace-pre-line mt-2">
                {content.parties.client.details}
              </p>
              <p className="text-xs text-violet-600 mt-2 font-medium">← C&apos;est vous</p>
            </div>
          </div>

          {/* Preamble */}
          <div className="mb-8">
            <h3 className="font-bold text-slate-900 mb-3">PRÉAMBULE</h3>
            <p className="text-slate-600 whitespace-pre-line leading-relaxed">
              {content.preamble}
            </p>
          </div>

          {/* Articles */}
          <div className="mb-8">
            <h3 className="font-bold text-slate-900 mb-4">IL A ÉTÉ CONVENU CE QUI SUIT :</h3>
            
            <div className="space-y-6">
              {content.articles.map((article) => (
                <div key={article.number} className="border-l-4 border-violet-200 pl-4">
                  <h4 className="font-semibold text-slate-900 mb-2">
                    Article {article.number} - {article.title}
                  </h4>
                  <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                    {article.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Signatures Section */}
          <div className="mt-12 pt-8 border-t-2 border-slate-200">
            <p className="text-center text-slate-600 mb-8">
              Fait à {content.signatures.location}, le {content.signatures.date}
            </p>
            
            <div className="grid grid-cols-2 gap-8">
              {/* Provider Signature */}
              <div className="text-center">
                <p className="font-semibold text-slate-900 mb-4">Le Prestataire</p>
                {contract.provider_signature ? (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <Image
                      src={contract.provider_signature}
                      alt="Signature prestataire"
                      width={200}
                      height={80}
                      className="max-h-20 mx-auto object-contain"
                    />
                    <p className="text-xs text-slate-500 mt-2">✓ Signé</p>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-xl p-8 text-slate-400">
                    En attente
                  </div>
                )}
              </div>

              {/* Client Signature */}
              <div className="text-center">
                <p className="font-semibold text-slate-900 mb-4">Le Client</p>
                {signatureData ? (
                  <div className="border-2 border-violet-200 rounded-xl p-4 bg-violet-50">
                    <Image
                      src={signatureData}
                      alt="Votre signature"
                      width={200}
                      height={80}
                      className="max-h-20 mx-auto object-contain"
                    />
                    <p className="text-xs text-violet-600 mt-2">← Votre signature</p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSignaturePad(true)}
                    className="w-full border-2 border-dashed border-violet-300 rounded-xl p-8 text-violet-500 hover:border-violet-500 hover:bg-violet-50 transition-colors"
                  >
                    <IconSignature className="w-8 h-8 mx-auto mb-2" />
                    <span>Cliquer pour signer</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                Signez le contrat
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Dessinez votre signature ci-dessous
              </p>
            </div>

            <div className="p-6">
              <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
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

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900"
                >
                  <IconTrash className="w-4 h-4" />
                  Effacer
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSignaturePad(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSign}
                    disabled={signing}
                    className="flex items-center gap-2 px-6 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    {signing ? (
                      <>
                        <IconLoader2 className="w-4 h-4 animate-spin" />
                        Signature...
                      </>
                    ) : (
                      <>
                        <IconCheck className="w-4 h-4" />
                        Signer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Legal notice */}
            <div className="p-4 bg-amber-50 border-t border-amber-200">
              <p className="text-xs text-amber-800">
                ⚠️ En signant ce document, vous acceptez les termes du contrat ci-dessus.
                Cette signature électronique a valeur légale.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

