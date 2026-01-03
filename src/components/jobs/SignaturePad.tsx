import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SignaturePadProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignatureComplete?: () => void;
}

export function SignaturePad({ jobId, open, onOpenChange, onSignatureComplete }: SignaturePadProps) {
  const { user } = useAuth();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [signerName, setSignerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast.error('Please provide a signature');
      return;
    }

    if (!signerName.trim()) {
      toast.error('Please enter the signer\'s name');
      return;
    }

    if (!user) return;

    setIsSaving(true);
    try {
      // Get signature as data URL
      const dataUrl = sigCanvas.current.toDataURL('image/png');
      
      // Convert to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Upload to storage
      const fileName = `${user.id}/${jobId}/signature_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('job-signatures')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('job-signatures')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('job_signatures')
        .insert({
          job_id: jobId,
          signature_url: publicUrl,
          signer_name: signerName.trim(),
        });

      if (dbError) throw dbError;

      toast.success('Signature saved successfully');
      onOpenChange(false);
      onSignatureComplete?.();
    } catch (error: any) {
      console.error('Signature save error:', error);
      toast.error(error.message || 'Failed to save signature');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customer Signature</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="signer-name">Customer Name</Label>
            <Input
              id="signer-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Enter customer name"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Signature</Label>
            <div className="mt-1 border rounded-lg bg-white overflow-hidden">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: 'w-full h-40',
                  style: { width: '100%', height: '160px' },
                }}
                backgroundColor="white"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="mt-2 gap-2"
            >
              <Eraser className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Signature
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SignatureDisplayProps {
  signature: {
    signature_url: string;
    signer_name: string;
    signed_at: string;
  } | null;
}

export function SignatureDisplay({ signature }: SignatureDisplayProps) {
  if (!signature) return null;

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-start gap-4">
        <img
          src={signature.signature_url}
          alt="Customer signature"
          className="w-32 h-20 object-contain bg-white rounded border"
        />
        <div>
          <p className="font-medium">{signature.signer_name}</p>
          <p className="text-xs text-muted-foreground">
            Signed {new Date(signature.signed_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
