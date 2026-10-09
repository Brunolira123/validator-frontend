import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Upload, Loader2, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { equipamentosApi } from '../api/equipamentos';
import { Button } from './Button';
import type { ErroResponse } from '../types/api';

interface Props {
  equipamentoId: number;
}

export function UploadFoto({ equipamentoId }: Props) {
  const queryClient = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => equipamentosApi.uploadFoto(equipamentoId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      queryClient.invalidateQueries({ queryKey: ['equipamento', equipamentoId] });
      setPreview(null);
      setArquivo(null);
      setErro(null);
    },
    onError: (e: AxiosError<ErroResponse>) => {
      setErro(e.response?.data?.mensagem || 'Erro ao enviar foto');
    },
  });

  const handleFile = (file: File) => {
    setErro(null);
    setArquivo(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
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

      {!preview && (
        <div className="grid grid-cols-2 gap-3">
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