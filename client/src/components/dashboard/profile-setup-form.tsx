import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { 
  User, MapPin, Heart, Sparkles, FileText, Camera, Video, Phone, X, Upload, 
  ThumbsUp, ThumbsDown, Ruler, Dumbbell, Wine, Cigarette, Briefcase, 
  GraduationCap, DollarSign, Church, Vote, Globe, Baby, Star, Eye, Gift, 
  Lightbulb, ChevronDown, ChevronUp, Share2
} from "lucide-react";
import { SiInstagram, SiTiktok, SiX, SiSnapchat } from "react-icons/si";

import manPhoto1 from "@assets/stock_images/professional_headsho_c2f05730.jpg";
import manPhoto2 from "@assets/stock_images/professional_headsho_c85690d1.jpg";
import manPhoto3 from "@assets/stock_images/professional_headsho_b488eeda.jpg";
import womanPhoto1 from "@assets/stock_images/professional_headsho_9c70b8c6.jpg";
import womanPhoto2 from "@assets/stock_images/professional_headsho_28bbcf07.jpg";
import womanPhoto3 from "@assets/stock_images/professional_headsho_9aa97416.jpg";
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
  gender: z.string().optional(),
  location: z.string().max(100).optional(),
  tagline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  lookingFor: z.string().optional(),
  interests: z.string().optional(),
  hobbies: z.string().optional(),
  mustHaves: z.string().optional(),
  dealBreakers: z.string().optional(),
  facetimeAvailable: z.boolean().default(false),
  
  // Physical
  height: z.string().optional(),
  bodyType: z.string().optional(),
  eyeColor: z.string().optional(),
  hairColor: z.string().optional(),
  ethnicity: z.string().optional(),
  
  // Lifestyle
  smoking: z.string().optional(),
  drinking: z.string().optional(),
  exercise: z.string().optional(),
  diet: z.string().optional(),
  
  // Background
  education: z.string().optional(),
  occupation: z.string().optional(),
  income: z.string().optional(),
  religion: z.string().optional(),
  politics: z.string().optional(),
  languages: z.string().optional(),
  
  // Relationship
  relationshipStatus: z.string().optional(),
  hasKids: z.string().optional(),
  wantsKids: z.string().optional(),
  zodiacSign: z.string().optional(),
  
  // Social Media Links
  instagramUsername: z.string().max(100).optional(),
  tiktokUsername: z.string().max(100).optional(),
  twitterUsername: z.string().max(100).optional(),
  snapchatUsername: z.string().max(100).optional(),
  
  // Visibility Settings
  showPhotoPublicly: z.boolean().default(true),
  showLocationPublicly: z.boolean().default(true),
  showFirstNamePublicly: z.boolean().default(true),
  showAgePublicly: z.boolean().default(true),
  showRegistryPublicly: z.boolean().default(false),
  showInterestsPublicly: z.boolean().default(true),
  
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the Terms of Service and Privacy Policy",
  }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileSetupFormProps {
  onSubmit: (data: {
    displayName: string;
    age: number;
    gender?: string;
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
    height?: string;
    bodyType?: string;
    eyeColor?: string;
    hairColor?: string;
    ethnicity?: string;
    smoking?: string;
    drinking?: string;
    exercise?: string;
    diet?: string;
    education?: string;
    occupation?: string;
    income?: string;
    religion?: string;
    politics?: string;
    languages: string[];
    relationshipStatus?: string;
    hasKids?: string;
    wantsKids?: string;
    zodiacSign?: string;
    showPhotoPublicly: boolean;
    showLocationPublicly: boolean;
    showFirstNamePublicly: boolean;
    showAgePublicly: boolean;
    showRegistryPublicly: boolean;
    showInterestsPublicly: boolean;
    socialLinks?: {
      instagram?: string;
      tiktok?: string;
      twitter?: string;
      snapchat?: string;
    };
  }) => void;
  isPending?: boolean;
  defaultValues?: Partial<ProfileFormData & { photos?: string[]; videos?: string[] }>;
}

export function ProfileSetupForm({ onSubmit, isPending, defaultValues }: ProfileSetupFormProps) {
  const [photos, setPhotos] = useState<string[]>(defaultValues?.photos || []);
  const [videos, setVideos] = useState<string[]>(defaultValues?.videos || []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showDetailedSections, setShowDetailedSections] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: defaultValues?.displayName || "",
      age: defaultValues?.age || 25,
      gender: defaultValues?.gender || "",
      location: defaultValues?.location || "",
      tagline: defaultValues?.tagline || "",
      bio: defaultValues?.bio || "",
      lookingFor: defaultValues?.lookingFor || "",
      interests: defaultValues?.interests || "",
      hobbies: defaultValues?.hobbies || "",
      mustHaves: defaultValues?.mustHaves || "",
      dealBreakers: defaultValues?.dealBreakers || "",
      facetimeAvailable: defaultValues?.facetimeAvailable || false,
      height: defaultValues?.height || "",
      bodyType: defaultValues?.bodyType || "",
      eyeColor: defaultValues?.eyeColor || "",
      hairColor: defaultValues?.hairColor || "",
      ethnicity: defaultValues?.ethnicity || "",
      smoking: defaultValues?.smoking || "",
      drinking: defaultValues?.drinking || "",
      exercise: defaultValues?.exercise || "",
      diet: defaultValues?.diet || "",
      education: defaultValues?.education || "",
      occupation: defaultValues?.occupation || "",
      income: defaultValues?.income || "",
      religion: defaultValues?.religion || "",
      politics: defaultValues?.politics || "",
      languages: defaultValues?.languages || "",
      relationshipStatus: defaultValues?.relationshipStatus || "",
      hasKids: defaultValues?.hasKids || "",
      wantsKids: defaultValues?.wantsKids || "",
      zodiacSign: defaultValues?.zodiacSign || "",
      showPhotoPublicly: defaultValues?.showPhotoPublicly ?? true,
      showLocationPublicly: defaultValues?.showLocationPublicly ?? true,
      showFirstNamePublicly: defaultValues?.showFirstNamePublicly ?? true,
      showAgePublicly: defaultValues?.showAgePublicly ?? true,
      showRegistryPublicly: defaultValues?.showRegistryPublicly ?? false,
      showInterestsPublicly: defaultValues?.showInterestsPublicly ?? true,
      instagramUsername: defaultValues?.instagramUsername || "",
      tiktokUsername: defaultValues?.tiktokUsername || "",
      twitterUsername: defaultValues?.twitterUsername || "",
      snapchatUsername: defaultValues?.snapchatUsername || "",
      termsAccepted: false,
    },
  });

  const initialPhotosRef = useRef(defaultValues?.photos || []);
  const initialVideosRef = useRef(defaultValues?.videos || []);
  
  const hasUnsavedChanges = useMemo(() => {
    const formDirty = form.formState.isDirty;
    const photosChanged = JSON.stringify(photos) !== JSON.stringify(initialPhotosRef.current);
    const videosChanged = JSON.stringify(videos) !== JSON.stringify(initialVideosRef.current);
    return formDirty || photosChanged || videosChanged;
  }, [form.formState.isDirty, photos, videos]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

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
    const { 
      termsAccepted, 
      interests, 
      hobbies, 
      mustHaves, 
      dealBreakers, 
      languages,
      instagramUsername,
      tiktokUsername,
      twitterUsername,
      snapchatUsername,
      ...rest 
    } = data;
    
    const socialLinks = {
      instagram: instagramUsername || undefined,
      tiktok: tiktokUsername || undefined,
      twitter: twitterUsername || undefined,
      snapchat: snapchatUsername || undefined,
    };
    
    onSubmit({
      ...rest,
      interests: parseCommaSeparated(interests),
      hobbies: parseCommaSeparated(hobbies),
      mustHaves: parseCommaSeparated(mustHaves),
      dealBreakers: parseCommaSeparated(dealBreakers),
      languages: parseCommaSeparated(languages),
      photos,
      videos,
      socialLinks,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {hasUnsavedChanges && (
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-yellow-700 dark:text-yellow-400">
                You have unsaved changes. Scroll down and click "Save Profile" to keep them.
              </span>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="ml-4"
                data-testid="button-save-changes-banner"
              >
                {isPending ? "Saving..." : "Save Now"}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Basic Info Section */}
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

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-gender">
                        <SelectValue placeholder="Select your gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="man">Man</SelectItem>
                      <SelectItem value="woman">Woman</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
        </div>

        {/* About You Section */}
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

        {/* Physical Attributes Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Ruler className="w-5 h-5 text-primary" />
            <span>Physical Attributes</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-height">
                        <SelectValue placeholder="Select height" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="under-5">Under 5'0" (152 cm)</SelectItem>
                      <SelectItem value="5-0">5'0" (152 cm)</SelectItem>
                      <SelectItem value="5-1">5'1" (155 cm)</SelectItem>
                      <SelectItem value="5-2">5'2" (157 cm)</SelectItem>
                      <SelectItem value="5-3">5'3" (160 cm)</SelectItem>
                      <SelectItem value="5-4">5'4" (163 cm)</SelectItem>
                      <SelectItem value="5-5">5'5" (165 cm)</SelectItem>
                      <SelectItem value="5-6">5'6" (168 cm)</SelectItem>
                      <SelectItem value="5-7">5'7" (170 cm)</SelectItem>
                      <SelectItem value="5-8">5'8" (173 cm)</SelectItem>
                      <SelectItem value="5-9">5'9" (175 cm)</SelectItem>
                      <SelectItem value="5-10">5'10" (178 cm)</SelectItem>
                      <SelectItem value="5-11">5'11" (180 cm)</SelectItem>
                      <SelectItem value="6-0">6'0" (183 cm)</SelectItem>
                      <SelectItem value="6-1">6'1" (185 cm)</SelectItem>
                      <SelectItem value="6-2">6'2" (188 cm)</SelectItem>
                      <SelectItem value="6-3">6'3" (191 cm)</SelectItem>
                      <SelectItem value="6-4">6'4" (193 cm)</SelectItem>
                      <SelectItem value="over-6-4">Over 6'4" (193 cm)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bodyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-body-type">
                        <SelectValue placeholder="Select body type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="slim">Slim</SelectItem>
                      <SelectItem value="athletic">Athletic</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="curvy">Curvy</SelectItem>
                      <SelectItem value="muscular">Muscular</SelectItem>
                      <SelectItem value="full-figured">Full Figured</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="eyeColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Eye Color</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-eye-color">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="brown">Brown</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="hazel">Hazel</SelectItem>
                      <SelectItem value="gray">Gray</SelectItem>
                      <SelectItem value="black">Black</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hairColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hair Color</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-hair-color">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="black">Black</SelectItem>
                      <SelectItem value="brown">Brown</SelectItem>
                      <SelectItem value="blonde">Blonde</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="gray">Gray</SelectItem>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="bald">Bald</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ethnicity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ethnicity</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-ethnicity">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="asian">Asian</SelectItem>
                      <SelectItem value="black">Black / African</SelectItem>
                      <SelectItem value="hispanic">Hispanic / Latino</SelectItem>
                      <SelectItem value="indian">Indian</SelectItem>
                      <SelectItem value="middle-eastern">Middle Eastern</SelectItem>
                      <SelectItem value="native-american">Native American</SelectItem>
                      <SelectItem value="pacific-islander">Pacific Islander</SelectItem>
                      <SelectItem value="white">White / Caucasian</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Lifestyle Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Wine className="w-5 h-5 text-primary" />
            <span>Lifestyle</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="smoking"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Cigarette className="w-4 h-4" />
                    Smoking
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-smoking">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="socially">Socially</SelectItem>
                      <SelectItem value="regularly">Regularly</SelectItem>
                      <SelectItem value="trying-to-quit">Trying to quit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="drinking"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Wine className="w-4 h-4" />
                    Drinking
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-drinking">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="socially">Socially</SelectItem>
                      <SelectItem value="regularly">Regularly</SelectItem>
                      <SelectItem value="in-recovery">In recovery</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="exercise"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4" />
                    Exercise
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-exercise">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="sometimes">Sometimes</SelectItem>
                      <SelectItem value="regularly">Regularly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="diet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diet</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-diet">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="anything">Anything</SelectItem>
                      <SelectItem value="vegetarian">Vegetarian</SelectItem>
                      <SelectItem value="vegan">Vegan</SelectItem>
                      <SelectItem value="pescatarian">Pescatarian</SelectItem>
                      <SelectItem value="keto">Keto</SelectItem>
                      <SelectItem value="halal">Halal</SelectItem>
                      <SelectItem value="kosher">Kosher</SelectItem>
                      <SelectItem value="gluten-free">Gluten-free</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Background Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Briefcase className="w-5 h-5 text-primary" />
            <span>Background</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="education"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Education
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-education">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="high-school">High School</SelectItem>
                      <SelectItem value="some-college">Some College</SelectItem>
                      <SelectItem value="associates">Associate's Degree</SelectItem>
                      <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                      <SelectItem value="masters">Master's Degree</SelectItem>
                      <SelectItem value="doctorate">Doctorate</SelectItem>
                      <SelectItem value="trade-school">Trade School</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Occupation
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your job title"
                      {...field}
                      data-testid="input-occupation"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="income"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Income
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-income">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      <SelectItem value="under-25k">Under $25,000</SelectItem>
                      <SelectItem value="25k-50k">$25,000 - $50,000</SelectItem>
                      <SelectItem value="50k-75k">$50,000 - $75,000</SelectItem>
                      <SelectItem value="75k-100k">$75,000 - $100,000</SelectItem>
                      <SelectItem value="100k-150k">$100,000 - $150,000</SelectItem>
                      <SelectItem value="150k-250k">$150,000 - $250,000</SelectItem>
                      <SelectItem value="over-250k">Over $250,000</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="languages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Languages
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="English, Spanish, French..."
                      {...field}
                      data-testid="input-languages"
                    />
                  </FormControl>
                  <FormDescription>
                    Separate languages with commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="religion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Church className="w-4 h-4" />
                    Religion
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-religion">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="agnostic">Agnostic</SelectItem>
                      <SelectItem value="atheist">Atheist</SelectItem>
                      <SelectItem value="buddhist">Buddhist</SelectItem>
                      <SelectItem value="catholic">Catholic</SelectItem>
                      <SelectItem value="christian">Christian</SelectItem>
                      <SelectItem value="hindu">Hindu</SelectItem>
                      <SelectItem value="jewish">Jewish</SelectItem>
                      <SelectItem value="muslim">Muslim</SelectItem>
                      <SelectItem value="sikh">Sikh</SelectItem>
                      <SelectItem value="spiritual">Spiritual</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="politics"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Vote className="w-4 h-4" />
                    Politics
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-politics">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="liberal">Liberal</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="not-political">Not Political</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Relationship Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Heart className="w-5 h-5 text-primary" />
            <span>Relationship</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="relationshipStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-relationship-status">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="separated">Separated</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <SelectItem value="marriage">Marriage</SelectItem>
                      <SelectItem value="open">Open to anything</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="hasKids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Baby className="w-4 h-4" />
                    Has Kids
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-has-kids">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes-living-with-me">Yes, living with me</SelectItem>
                      <SelectItem value="yes-not-living-with-me">Yes, not living with me</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="wantsKids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wants Kids</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-wants-kids">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="definitely">Definitely</SelectItem>
                      <SelectItem value="open-to-it">Open to it</SelectItem>
                      <SelectItem value="not-sure">Not sure</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zodiacSign"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Zodiac Sign
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-zodiac">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="aries">Aries</SelectItem>
                      <SelectItem value="taurus">Taurus</SelectItem>
                      <SelectItem value="gemini">Gemini</SelectItem>
                      <SelectItem value="cancer">Cancer</SelectItem>
                      <SelectItem value="leo">Leo</SelectItem>
                      <SelectItem value="virgo">Virgo</SelectItem>
                      <SelectItem value="libra">Libra</SelectItem>
                      <SelectItem value="scorpio">Scorpio</SelectItem>
                      <SelectItem value="sagittarius">Sagittarius</SelectItem>
                      <SelectItem value="capricorn">Capricorn</SelectItem>
                      <SelectItem value="aquarius">Aquarius</SelectItem>
                      <SelectItem value="pisces">Pisces</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                    placeholder="Dishonesty, Smoker, Long distance..."
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

        {/* Photos & Videos Section */}
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

        {/* Social Media Links Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Share2 className="w-5 h-5 text-primary" />
            <span>Social Media Links</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Connect your social media profiles so others can find you. These are optional and visible on your profile.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="instagramUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <SiInstagram className="w-4 h-4 text-pink-500" />
                    Instagram
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="@username"
                      {...field}
                      data-testid="input-instagram"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tiktokUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <SiTiktok className="w-4 h-4" />
                    TikTok
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="@username"
                      {...field}
                      data-testid="input-tiktok"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="twitterUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <SiX className="w-4 h-4" />
                    X (Twitter)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="@username"
                      {...field}
                      data-testid="input-twitter"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="snapchatUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <SiSnapchat className="w-4 h-4 text-yellow-400" />
                    Snapchat
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="@username"
                      {...field}
                      data-testid="input-snapchat"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Privacy Controls Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Eye className="w-5 h-5 text-primary" />
            <span>Privacy Controls</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose what information is visible to others before they progress through the gates. 
            More details become visible as connections advance through each gate.
          </p>

          <div className="space-y-3">
            <FormField
              control={form.control}
              name="showPhotoPublicly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Show Photos
                    </FormLabel>
                    <FormDescription>
                      Display your photos before gate progression
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-show-photo"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showFirstNamePublicly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Show First Name
                    </FormLabel>
                    <FormDescription>
                      Display your name (otherwise shows initials)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-show-name"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showAgePublicly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Show Age</FormLabel>
                    <FormDescription>
                      Display your age on your public profile
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-show-age"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showLocationPublicly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Show Location
                    </FormLabel>
                    <FormDescription>
                      Display your city/area on your profile
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-show-location"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showInterestsPublicly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Show Interests
                    </FormLabel>
                    <FormDescription>
                      Display your interests and hobbies publicly
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-show-interests"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showRegistryPublicly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      Show Gift Registry
                    </FormLabel>
                    <FormDescription>
                      Allow others to see your wishlist before connecting
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-show-registry"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Terms & Privacy Section */}
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
