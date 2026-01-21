import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ShieldX, ShieldAlert, Camera, Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { Profile } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/auth-utils";

type VerificationStatus = {
  status: "none" | "pending" | "verified" | "rejected";
  verifiedAt: string | null;
  attemptsRemaining: number;
  rejectionReason: string | null;
};

export default function Verification() {
  const { toast } = useToast();
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: verificationStatus, isLoading: statusLoading } = useQuery<VerificationStatus>({
    queryKey: ["/api/profile/verification-status"],
  });

  const verifyMutation = useMutation({
    mutationFn: async (verificationPhoto: string) => {
      return await apiRequest("POST", "/api/profile/verify", { verificationPhoto });
    },
    onSuccess: (data: any) => {
      if (data.verified) {
        toast({
          title: "Verification Successful!",
          description: "Your profile now has a verified badge.",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: data.message || "Please try again with a clearer photo.",
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/profile/verification-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setUploadedPhoto(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Verification failed. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startCamera = async () => {
    // Show loading state while requesting camera permission
    setIsCameraLoading(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      
      // Now show the capturing UI
      setIsCapturing(true);
      setIsCameraLoading(false);
      
      // Wait a tick for the video element to be rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Explicitly play the video for mobile browsers
          videoRef.current.play().catch((err) => {
            console.error("Error playing video:", err);
          });
        }
      }, 100);
    } catch (error) {
      setIsCapturing(false);
      setIsCameraLoading(false);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to take a verification selfie.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Check if video is ready
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast({
          title: "Camera Not Ready",
          description: "Please wait for the camera to load and try again.",
          variant: "destructive",
        });
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setUploadedPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please upload an image file.",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitVerification = () => {
    if (uploadedPhoto) {
      verifyMutation.mutate(uploadedPhoto);
    }
  };

  const isLoading = profileLoading || statusLoading;
  const hasProfilePhoto = profile?.photos && profile.photos.length > 0;

  const getStatusBadge = () => {
    if (!verificationStatus) return null;
    
    switch (verificationStatus.status) {
      case "verified":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
            <ShieldCheck className="w-3 h-3" />
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1">
            <ShieldAlert className="w-3 h-3" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
            <ShieldX className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <ShieldAlert className="w-3 h-3" />
            Not Verified
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">ID Verification</h1>
        <p className="text-muted-foreground">
          Verify your identity to get a trusted badge on your profile
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : verificationStatus?.status === "verified" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-green-600">You're Verified!</CardTitle>
                <CardDescription>
                  Your profile displays a verified badge that shows other users you're authentic.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Verified on: {verificationStatus.verifiedAt 
                  ? new Date(verificationStatus.verifiedAt).toLocaleDateString() 
                  : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle>Verification Status</CardTitle>
                  <CardDescription>
                    Build trust with other users by verifying your identity
                  </CardDescription>
                </div>
                {getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Why verify?</p>
                    <p className="text-sm text-muted-foreground">
                      Verified profiles get more matches and show others you're a real person, not a catfish.
                    </p>
                  </div>
                </div>

                {verificationStatus?.status === "rejected" && verificationStatus.rejectionReason && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-600">Verification Failed</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {verificationStatus.rejectionReason}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Attempts remaining: {verificationStatus.attemptsRemaining}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!hasProfilePhoto && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-600">Profile Photo Required</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Please upload at least one profile photo before verification. 
                          We'll compare your selfie to your profile photos.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {hasProfilePhoto && (
            <Card>
              <CardHeader>
                <CardTitle>Take a Verification Selfie</CardTitle>
                <CardDescription>
                  Take a clear photo of your face. We'll compare it to your profile photos using AI.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!uploadedPhoto && !isCapturing && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        onClick={startCamera} 
                        className="flex-1 gap-2" 
                        disabled={isCameraLoading}
                        data-testid="button-start-camera"
                      >
                        {isCameraLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Starting Camera...
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4" />
                            Take Selfie
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex-1 gap-2"
                        data-testid="button-upload-photo"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Photo
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        data-testid="input-file-upload"
                      />
                    </div>
                  )}

                  {isCapturing && (
                    <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                          data-testid="video-camera"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={capturePhoto} className="flex-1 gap-2" data-testid="button-capture">
                          <Camera className="h-4 w-4" />
                          Capture
                        </Button>
                        <Button variant="outline" onClick={stopCamera} data-testid="button-cancel-camera">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {uploadedPhoto && (
                    <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                        <img 
                          src={uploadedPhoto} 
                          alt="Verification selfie" 
                          className="w-full h-full object-cover"
                          data-testid="img-preview"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          onClick={submitVerification} 
                          disabled={verifyMutation.isPending}
                          className="flex-1 gap-2"
                          data-testid="button-submit-verification"
                        >
                          {verifyMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-4 w-4" />
                              Submit for Verification
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setUploadedPhoto(null)}
                          disabled={verifyMutation.isPending}
                          data-testid="button-retake"
                        >
                          Retake
                        </Button>
                      </div>
                    </div>
                  )}

                  <canvas ref={canvasRef} className="hidden" />

                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">Tips for successful verification:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Face the camera directly with good lighting</li>
                      <li>Remove sunglasses, hats, or anything covering your face</li>
                      <li>Make sure your face is clearly visible</li>
                      <li>Match the angle/expression to your profile photo if possible</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
