export interface SeasonalTheme {
  id: string;
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  priority: number;
  banner: {
    gradient: string;
    icon: string;
    title: string;
    tagline: string;
    offer: string;
    cta: string;
  };
  hero: {
    subtitle: string;
    headline: string;
    highlightText: string;
    description: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const seasonalThemes: SeasonalTheme[] = [
  {
    id: "valentines",
    name: "Valentine's Day",
    startMonth: 2,
    startDay: 1,
    endMonth: 2,
    endDay: 14,
    priority: 10,
    banner: {
      gradient: "from-rose-500 via-pink-500 to-red-500",
      icon: "heart",
      title: "Valentine's Day Special",
      tagline: "Find your perfect match before Feb 14th",
      offer: "Join free — pay only when you connect",
      cta: "Start Free Today"
    },
    hero: {
      subtitle: "Love is in the Air",
      headline: "Find Your Valentine",
      highlightText: "Before Feb 14th",
      description: "This Valentine's Day, invest in meaningful connections. Join thousands finding real love through our 5-gate progression system."
    },
    colors: {
      primary: "rose",
      secondary: "pink",
      accent: "red"
    }
  },
  {
    id: "spring",
    name: "Spring Fling",
    startMonth: 3,
    startDay: 20,
    endMonth: 5,
    endDay: 31,
    priority: 3,
    banner: {
      gradient: "from-green-400 via-emerald-500 to-teal-500",
      icon: "flower",
      title: "Spring Into Love",
      tagline: "Fresh starts and new connections await",
      offer: "First gate free on your first match",
      cta: "Bloom Today"
    },
    hero: {
      subtitle: "Season of New Beginnings",
      headline: "Fresh Connections",
      highlightText: "Await This Spring",
      description: "Spring is the perfect time for new beginnings. Let PayGate help you plant the seeds of lasting relationships."
    },
    colors: {
      primary: "emerald",
      secondary: "green",
      accent: "teal"
    }
  },
  {
    id: "summer",
    name: "Summer Romance",
    startMonth: 6,
    startDay: 1,
    endMonth: 8,
    endDay: 31,
    priority: 3,
    banner: {
      gradient: "from-amber-400 via-orange-500 to-yellow-500",
      icon: "sun",
      title: "Hot Summer Connections",
      tagline: "Find your summer adventure partner",
      offer: "Beach-ready profiles get 30% more matches",
      cta: "Heat Up Your Summer"
    },
    hero: {
      subtitle: "Summer Love Awaits",
      headline: "Adventure Partners",
      highlightText: "For Every Moment",
      description: "Whether it's beach walks, concerts, or road trips - find someone who shares your love for summer adventures."
    },
    colors: {
      primary: "orange",
      secondary: "amber",
      accent: "yellow"
    }
  },
  {
    id: "fall",
    name: "Cuffing Season",
    startMonth: 9,
    startDay: 22,
    endMonth: 11,
    endDay: 20,
    priority: 3,
    banner: {
      gradient: "from-orange-600 via-amber-600 to-yellow-600",
      icon: "leaf",
      title: "Cuffing Season is Here",
      tagline: "Find your cozy companion",
      offer: "Join free and find your cozy companion",
      cta: "Get Cozy Today"
    },
    hero: {
      subtitle: "Cuffing Season Special",
      headline: "Find Your Person",
      highlightText: "Before Winter Arrives",
      description: "As the leaves change, so can your relationship status. Find someone to share sweater weather and pumpkin lattes."
    },
    colors: {
      primary: "amber",
      secondary: "orange",
      accent: "yellow"
    }
  },
  {
    id: "christmas",
    name: "Holiday Love",
    startMonth: 12,
    startDay: 1,
    endMonth: 12,
    endDay: 25,
    priority: 9,
    banner: {
      gradient: "from-red-600 via-green-600 to-red-600",
      icon: "gift",
      title: "Holiday Romance Special",
      tagline: "The best gift is finding someone special",
      offer: "Send a gift to someone special",
      cta: "Unwrap Love"
    },
    hero: {
      subtitle: "Holiday Magic Awaits",
      headline: "Someone Special",
      highlightText: "Under the Mistletoe",
      description: "This holiday season, give yourself the gift of meaningful connection. No more lonely holiday parties."
    },
    colors: {
      primary: "red",
      secondary: "green",
      accent: "gold"
    }
  },
  {
    id: "newyear",
    name: "New Year, New Love",
    startMonth: 12,
    startDay: 26,
    endMonth: 1,
    endDay: 15,
    priority: 8,
    banner: {
      gradient: "from-violet-500 via-purple-500 to-indigo-500",
      icon: "sparkles",
      title: "New Year, New Connections",
      tagline: "Make 2026 your year of love",
      offer: "New year, new connections — join free",
      cta: "Start Fresh"
    },
    hero: {
      subtitle: "A Fresh Start",
      headline: "Make This Year",
      highlightText: "Your Year of Love",
      description: "New year resolutions are better with someone by your side. Start your love journey today."
    },
    colors: {
      primary: "violet",
      secondary: "purple",
      accent: "indigo"
    }
  },
  {
    id: "winter",
    name: "Winter Warmth",
    startMonth: 1,
    startDay: 16,
    endMonth: 3,
    endDay: 19,
    priority: 2,
    banner: {
      gradient: "from-sky-400 via-blue-500 to-indigo-500",
      icon: "snowflake",
      title: "Warm Up This Winter",
      tagline: "Find someone to share the cold nights with",
      offer: "Indoor date ideas for matches",
      cta: "Find Your Warmth"
    },
    hero: {
      subtitle: "Cold Outside, Warm Inside",
      headline: "Find Your",
      highlightText: "Perfect Plus One",
      description: "Winter nights are better shared. Find someone to binge-watch shows, try new recipes, and stay cozy with."
    },
    colors: {
      primary: "sky",
      secondary: "blue",
      accent: "indigo"
    }
  },
  {
    id: "companion",
    name: "Activity Partners",
    startMonth: 1,
    startDay: 1,
    endMonth: 12,
    endDay: 31,
    priority: 1,
    banner: {
      gradient: "from-primary via-primary to-primary",
      icon: "users",
      title: "Find Your Activity Partner",
      tagline: "More than dating - find your adventure companion",
      offer: "Join 10K+ members finding real connections",
      cta: "Start Matching"
    },
    hero: {
      subtitle: "Dating With Intent",
      headline: "Meaningful Connections",
      highlightText: "Worth Investing In",
      description: "PayGate transforms dating into a deliberate, invested journey. Our 5-gate progression system ensures every connection is genuine."
    },
    colors: {
      primary: "purple",
      secondary: "violet",
      accent: "fuchsia"
    }
  }
];

export function getCurrentTheme(): SeasonalTheme {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  const applicableThemes = seasonalThemes.filter(theme => {
    if (theme.startMonth <= theme.endMonth) {
      if (month > theme.startMonth && month < theme.endMonth) return true;
      if (month === theme.startMonth && day >= theme.startDay) return true;
      if (month === theme.endMonth && day <= theme.endDay) return true;
      return false;
    } else {
      if (month > theme.startMonth || month < theme.endMonth) return true;
      if (month === theme.startMonth && day >= theme.startDay) return true;
      if (month === theme.endMonth && day <= theme.endDay) return true;
      return false;
    }
  });
  
  if (applicableThemes.length === 0) {
    return seasonalThemes.find(t => t.id === "companion")!;
  }
  
  return applicableThemes.reduce((highest, current) => 
    current.priority > highest.priority ? current : highest
  );
}

export function getThemeById(id: string): SeasonalTheme | undefined {
  return seasonalThemes.find(t => t.id === id);
}
