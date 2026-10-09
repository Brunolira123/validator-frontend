import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Upload, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { equipamentosApi } from '../api/equipamentos';
import { Button } from './Button';
import type{ ErroResponse } from '../types/api';

interface Props {
  equipamentoId: number;
  onUploadSuccess?: () => void;
}

/**
 * Redimensiona a imagem (lado maior 1920px) e comprime pra JPEG (~0.8).
 * Reduz foto de celular de 5-10MB pra ~1MB.
 */
async function comprimirImagem(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const MAX = 1920;
        let { width, height } = img;

        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const nome = file.name.replace(/\.\w+$/, '.jpg');
            resolve(new File([blob], nome, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export function UploadFoto({ equipamentoId, onUploadSuccess }: Props) {
  const queryClient = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [comprimindo, setComprimindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => equipamentosApi.uploadFoto(equipamentoId, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      await queryClient.invalidateQueries({ queryKey: ['equipamento', equipamentoId] });
      await queryClient.invalidateQueries({ queryKey: ['fotos', equipamentoId] });
      setPreview(null);
      setArquivo(null);
      setErro(null);
      onUploadSuccess?.();
    },
    onError: (e: AxiosError<ErroResponse>) => {
      const msg = e.response?.data?.mensagem;
      setErro(msg || 'Erro ao enviar foto');
    },
  });

  const handleFile = async (file: File) => {
    setErro(null);
    setComprimindo(true);

    try {
      const comprimido = await comprimirImagem(file);
      setArquivo(comprimido);

      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(comprimido);
    } catch {
      setErro('Falha ao processar a imagem');
    } finally {
      setComprimindo(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleUpload = () => {
    if (arquivo) uploadMutation.mutate(arquivo);
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setArquivo(null);
    if (cameraRef.current) cameraRef.current.value = '';
    if (galeriaRef.current) galeriaRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      <input
        ref={galeriaRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />

      {!preview && !comprimindo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-vr-500 hover:bg-vr-50 transition-colors"
          >
            <Camera size={24} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Tirar foto</span>
          </button>
          <button
            onClick={() => galeriaRef.current?.click()}
            className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-vr-500 hover:bg-vr-50 transition-colors"
          >
            <ImageIcon size={24} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Escolher da galeria</span>
          </button>
        </div>
      )}

      {comprimindo && (
        <div className="text-center py-6 text-slate-500 text-sm">
          Processando imagem...
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full rounded-lg border border-slate-200"
            />
            <button
              onClick={handleCancelPreview}
              className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md hover:bg-slate-50"
            >
              <X size={16} className="text-slate-700" />
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center">
            {arquivo && `${(arquivo.size / 1024 / 1024).toFixed(2)} MB`}
          </p>
          <Button
            onClick={handleUpload}
            loading={uploadMutation.isPending}
            className="w-full"
          >
            <Upload size={16} />
            Enviar foto
          </Button>
        </div>
      )}

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {erro}
        </div>
      )}
    </div>
  );
}