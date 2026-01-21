import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useRef } from "react";
import { Link } from "wouter";
import { User, MapPin, Heart, Sparkles, FileText, Camera, Video, Phone, X, Upload, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const profileSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters").max(100),
  age: z.coerce.number().min(18, "Must be 18 or older").max(120),
  location: z.string().max(100).optional(),
  tagline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  lookingFor: z.string().optional(),
  interests: z.string().optional(),
  hobbies: z.string().optional(),
  mustHaves: z.string().optional(),
  dealBreakers: z.string().optional(),
  facetimeAvailable: z.boolean().default(false),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the Terms of Service and Privacy Policy",
  }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileSetupFormProps {
  onSubmit: (data: {
    displayName: string;
    age: number;
    location?: string;
    tagline?: string;
    bio?: string;
    lookingFor?: string;
    interests: string[];
    hobbies: string[];
    mustHaves: string[];
    dealBreakers: string[];
    photos: string[];
    videos: string[];
    facetimeAvailable: boolean;
  }) => void;
  isPending?: boolean;
  defaultValues?: Partial<ProfileFormData & { photos?: string[]; videos?: string[] }>;
}

export function ProfileSetupForm({ onSubmit, isPending, defaultValues }: ProfileSetupFormProps) {
  const [photos, setPhotos] = useState<string[]>(defaultValues?.photos || []);
  const [videos, setVideos] = useState<string[]>(defaultValues?.videos || []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: defaultValues?.displayName || "",
      age: defaultValues?.age || 25,
      location: defaultValues?.location || "",
      tagline: defaultValues?.tagline || "",
      bio: defaultValues?.bio || "",
      lookingFor: defaultValues?.lookingFor || "",
      interests: defaultValues?.interests || "",
      hobbies: defaultValues?.hobbies || "",
      mustHaves: defaultValues?.mustHaves || "",
      dealBreakers: defaultValues?.dealBreakers || "",
      facetimeAvailable: defaultValues?.facetimeAvailable || false,
      termsAccepted: false,
    },
  });

  const parseCommaSeparated = (value: string | undefined): string[] => {
    return value ? value.split(",").map((i) => i.trim()).filter(Boolean) : [];
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 6 - photos.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    if (filesToUpload.length === 0) return;

    setUploadingPhoto(true);
    let completed = 0;

    for (const file of filesToUpload) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPhotos(prev => {
          if (prev.length >= 6) return prev;
          return [...prev, dataUrl];
        });
        completed++;
        if (completed >= filesToUpload.length) {
          setUploadingPhoto(false);
        }
      };
      reader.onerror = () => {
        completed++;
        if (completed >= filesToUpload.length) {
          setUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 2 - videos.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    if (filesToUpload.length === 0) return;

    setUploadingVideo(true);
    let completed = 0;

    for (const file of filesToUpload) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setVideos(prev => {
          if (prev.length >= 2) return prev;
          return [...prev, dataUrl];
        });
        completed++;
        if (completed >= filesToUpload.length) {
          setUploadingVideo(false);
        }
      };
      reader.onerror = () => {
        completed++;
        if (completed >= filesToUpload.length) {
          setUploadingVideo(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (data: ProfileFormData) => {
    const { termsAccepted, interests, hobbies, mustHaves, dealBreakers, ...rest } = data;
    onSubmit({
      ...rest,
      interests: parseCommaSeparated(interests),
      hobbies: parseCommaSeparated(hobbies),
      mustHaves: parseCommaSeparated(mustHaves),
      dealBreakers: parseCommaSeparated(dealBreakers),
      photos,
      videos,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <User className="w-5 h-5 text-primary" />
            <span>Basic Info</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your name"
                      {...field}
                      data-testid="input-display-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={18}
                      max={120}
                      {...field}
                      data-testid="input-age"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="City, State"
                      className="pl-9"
                      {...field}
                      data-testid="input-location"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>About You</span>
          </div>

          <FormField
            control={form.control}
            name="tagline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tagline</FormLabel>
                <FormControl>
                  <Input
                    placeholder="A short intro about yourself"
                    {...field}
                    data-testid="input-tagline"
                  />
                </FormControl>
                <FormDescription>
                  This appears on your profile card (max 200 chars)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell others about yourself..."
                    className="min-h-[120px] resize-none"
                    {...field}
                    data-testid="input-bio"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interests"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interests</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Travel, Reading, Cooking, Music..."
                    {...field}
                    data-testid="input-interests"
                  />
                </FormControl>
                <FormDescription>
                  Separate interests with commas
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hobbies"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hobbies</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Hiking, Gaming, Photography, Yoga..."
                    {...field}
                    data-testid="input-hobbies"
                  />
                </FormControl>
                <FormDescription>
                  Separate hobbies with commas
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Camera className="w-5 h-5 text-primary" />
            <span>Photos & Videos</span>
          </div>

          <div className="space-y-4">
            <div>
              <FormLabel>Profile Photos</FormLabel>
              <FormDescription className="mb-3">
                Add up to 6 photos to your profile
              </FormDescription>
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removePhoto(index)}
                      data-testid={`button-remove-photo-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {photos.length < 6 && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-border hover-elevate flex flex-col items-center justify-center gap-2 text-muted-foreground"
                    data-testid="button-add-photo"
                  >
                    {uploadingPhoto ? (
                      <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span className="text-xs">Add Photo</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
                data-testid="input-photo-upload"
              />
            </div>

            <div>
              <FormLabel>Profile Videos</FormLabel>
              <FormDescription className="mb-3">
                Add up to 2 short intro videos
              </FormDescription>
              <div className="grid grid-cols-2 gap-3">
                {videos.map((video, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-border">
                    <video src={video} className="w-full h-full object-cover" controls />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeVideo(index)}
                      data-testid={`button-remove-video-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {videos.length < 2 && (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="aspect-video rounded-lg border-2 border-dashed border-border hover-elevate flex flex-col items-center justify-center gap-2 text-muted-foreground"
                    data-testid="button-add-video"
                  >
                    {uploadingVideo ? (
                      <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Video className="w-5 h-5" />
                        <span className="text-xs">Add Video</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={handleVideoUpload}
                data-testid="input-video-upload"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Heart className="w-5 h-5 text-primary" />
            <span>What You're Looking For</span>
          </div>

          <FormField
            control={form.control}
            name="lookingFor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Looking For</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-looking-for">
                      <SelectValue placeholder="Select what you're looking for" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="relationship">Long-term relationship</SelectItem>
                    <SelectItem value="dating">Dating / Getting to know someone</SelectItem>
                    <SelectItem value="friendship">Friendship first</SelectItem>
                    <SelectItem value="open">Open to anything</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mustHaves"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-green-500" />
                  Must Haves
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Honest, Kind, Good sense of humor, Ambitious..."
                    className="min-h-[80px] resize-none"
                    {...field}
                    data-testid="input-must-haves"
                  />
                </FormControl>
                <FormDescription>
                  Qualities your ideal partner must have (separate with commas)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dealBreakers"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <ThumbsDown className="w-4 h-4 text-destructive" />
                  Deal Breakers
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Smoker, Not interested in kids, Long distance..."
                    className="min-h-[80px] resize-none"
                    {...field}
                    data-testid="input-deal-breakers"
                  />
                </FormControl>
                <FormDescription>
                  Things you absolutely cannot accept (separate with commas)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="facetimeAvailable"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    FaceTime / Video Calls
                  </FormLabel>
                  <FormDescription>
                    Let others know you're open to video calls
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-facetime"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <FileText className="w-5 h-5 text-primary" />
            <span>Terms & Privacy</span>
          </div>

          <FormField
            control={form.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-terms-accepted"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-normal cursor-pointer">
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="text-primary underline hover:text-primary/80"
                      target="_blank"
                      data-testid="link-terms-in-form"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="text-primary underline hover:text-primary/80"
                      target="_blank"
                      data-testid="link-privacy-in-form"
                    >
                      Privacy Policy
                    </Link>
                  </FormLabel>
                  <FormDescription>
                    You must accept our terms to create your profile
                  </FormDescription>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isPending}
          data-testid="button-save-profile"
        >
          {isPending ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </Form>
  );
}
