import { useState } from 'react';
import { GiftDeliveryModal, getPriceTier } from '@/components/3d/GiftDeliveryModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Sparkles, Crown, Heart } from 'lucide-react';

const demoGifts = [
  {
    id: 1,
    title: 'Artisan Jewelry Set',
    senderName: 'Alex',
    price: 45,
    description: 'A thoughtful starter gift',
  },
  {
    id: 2,
    title: 'Wine Tasting Experience',
    senderName: 'Jordan',
    price: 89,
    description: 'An impressive experience gift',
  },
  {
    id: 3,
    title: 'Designer Sunglasses',
    senderName: 'Taylor',
    price: 195,
    description: 'A VIP luxury gift',
  },
];

export default function GiftDemo() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState<{
    title: string;
    senderName: string;
    tier: 'starter' | 'impressive' | 'vip';
    price?: number;
  } | null>(null);

  const handleOpenGift = (gift: typeof demoGifts[0]) => {
    setSelectedGift({
      title: gift.title,
      senderName: gift.senderName,
      tier: getPriceTier(gift.price),
      price: gift.price,
    });
    setModalOpen(true);
  };

  const getTierIcon = (price: number) => {
    const tier = getPriceTier(price);
    switch (tier) {
      case 'vip':
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 'impressive':
        return <Sparkles className="h-5 w-5 text-purple-500" />;
      default:
        return <Heart className="h-5 w-5 text-pink-500" />;
    }
  };

  const getTierBadge = (price: number) => {
    const tier = getPriceTier(price);
    const styles = {
      starter: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
      impressive: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      vip: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[tier]}`}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">3D Gift Delivery Experience</h1>
          <p className="text-muted-foreground">
            Experience the magic of receiving gifts in immersive 3D
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {demoGifts.map((gift) => (
            <Card key={gift.id} className="hover-elevate cursor-pointer" onClick={() => handleOpenGift(gift)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {getTierIcon(gift.price)}
                  {getTierBadge(gift.price)}
                </div>
                <CardTitle className="mt-2">{gift.title}</CardTitle>
                <CardDescription>{gift.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    From <span className="font-medium text-foreground">{gift.senderName}</span>
                  </span>
                  <span className="font-semibold">${gift.price}</span>
                </div>
                <Button 
                  className="w-full mt-4" 
                  data-testid={`button-open-gift-${gift.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenGift(gift);
                  }}
                >
                  <Gift className="mr-2 h-4 w-4" />
                  Open Gift
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="p-4 rounded-lg bg-muted">
              <Heart className="h-8 w-8 mx-auto mb-2 text-pink-500" />
              <p className="font-medium">Starter Tier</p>
              <p className="text-muted-foreground">Under $50 - Soft pink animation</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="font-medium">Impressive Tier</p>
              <p className="text-muted-foreground">$50-$99 - Purple sparkle effects</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <Crown className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="font-medium">VIP Tier</p>
              <p className="text-muted-foreground">$100+ - Golden luxury experience</p>
            </div>
          </div>
        </div>
      </div>

      <GiftDeliveryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        gift={selectedGift}
      />
    </div>
  );
}
