import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, MapPin, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileSetupFormProps {
  onSubmit: (data: ProfileFormData & { interests: string[] }) => void;
  isPending?: boolean;
  defaultValues?: Partial<ProfileFormData>;
}

export function ProfileSetupForm({ onSubmit, isPending, defaultValues }: ProfileSetupFormProps) {
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
    },
  });

  const handleSubmit = (data: ProfileFormData) => {
    const interests = data.interests
      ? data.interests.split(",").map((i) => i.trim()).filter(Boolean)
      : [];
    onSubmit({ ...data, interests });
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
