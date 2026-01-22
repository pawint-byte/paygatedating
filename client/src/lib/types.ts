export interface ProfileCompleteness {
  score: number;
  suggestions: string[];
  hasProfile: boolean;
  hasDisplayName: boolean;
  hasBio: boolean;
  hasPhotos: boolean;
  hasInterests: boolean;
  hasLocation: boolean;
  hasLookingFor: boolean;
  hasWishlistItems: boolean;
}
