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
      tagline: "Start a new chapter before Feb 14th",
      offer: "Join free -- your love story starts here",
      cta: "Start Your Story"
    },
    hero: {
      subtitle: "The Most Romantic Chapter",
      headline: "Write Your Love Story",
      highlightText: "Before Feb 14th",
      description: "This Valentine's Day, don't just swipe -- start a real story with someone. Five chapters. Two people. One connection worth writing."
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
      title: "Spring Into a New Chapter",
      tagline: "Fresh stories and new connections await",
      offer: "First chapter free on your first match",
      cta: "Start Fresh"
    },
    hero: {
      subtitle: "A Season for New Stories",
      headline: "Fresh Chapters",
      highlightText: "Await This Spring",
      description: "Spring is the perfect time to start writing something new. Find someone whose story complements yours and begin your first chapter together."
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
      title: "Summer Story Season",
      tagline: "Find your adventure co-author",
      offer: "Beach-ready profiles get 30% more matches",
      cta: "Write Your Summer Chapter"
    },
    hero: {
      subtitle: "The Adventure Chapter",
      headline: "Co-Author Your",
      highlightText: "Summer Story",
      description: "Beach walks, concerts, road trips -- the best summer stories are written with two people. Find your co-author and start Chapter 1."
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
      title: "Cuffing Season Chapters",
      tagline: "Find someone to write cozy chapters with",
      offer: "Join free and find your cozy co-author",
      cta: "Get Cozy"
    },
    hero: {
      subtitle: "The Cozy Chapter",
      headline: "Find Someone To",
      highlightText: "Write With All Winter",
      description: "As the leaves change, so can your story. Find someone to share sweater weather, pumpkin lattes, and the kind of chapters you'll read back on fondly."
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
      title: "Holiday Chapter Special",
      tagline: "The best gift is a story worth sharing",
      offer: "Send a gift to start a new chapter",
      cta: "Unwrap Your Story"
    },
    hero: {
      subtitle: "The Most Magical Chapter",
      headline: "Someone Special",
      highlightText: "Under the Mistletoe",
      description: "This holiday season, give yourself the gift of a story worth telling. Five chapters with the right person is all it takes."
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
      title: "New Year, New Chapters",
      tagline: "Make 2026 the year your story gets good",
      offer: "New year, new stories -- join free",
      cta: "Start Your Chapter"
    },
    hero: {
      subtitle: "A Brand New Story",
      headline: "Make This Year",
      highlightText: "Your Best Chapter Yet",
      description: "New year resolutions are better when you're writing them into someone else's story too. Start your first chapter today."
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
      title: "Warm Up Your Story",
      tagline: "Find someone to share the cold nights with",
      offer: "Indoor date ideas for every chapter",
      cta: "Find Your Warmth"
    },
    hero: {
      subtitle: "The Warmth Chapter",
      headline: "Find Your",
      highlightText: "Perfect Co-Author",
      description: "Winter nights are better shared. Find someone to binge-watch shows, try new recipes, and write the kind of cozy chapters that make this season unforgettable."
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
      title: "Find Your Co-Author",
      tagline: "More than dating -- find someone worth the story",
      offer: "Join 10K+ people writing real stories",
      cta: "Start Your Story"
    },
    hero: {
      subtitle: "Five Chapters. Two People. One Story.",
      headline: "Connections Worth",
      highlightText: "Writing About",
      description: "PayGate turns dating into a story you co-author together. Five chapters. Both people show up. Every page you turn is proof this one's worth it."
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
      if (theme.startMonth === theme.endMonth) {
        return month === theme.startMonth && day >= theme.startDay && day <= theme.endDay;
      }
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
