export type AppMode =
  | "adopt_or_foster"
  | "pet_services"
  | "pet_events"
  | "stalls_and_shops"
  | "lost_and_found"
  // Split-out siblings of "pet_events" — the default tenant keeps browsing
  // them as one merged "pet_events" bucket (unchanged), but a non-default
  // tenant that has customised these three differently gets them as
  // independent cards instead of one generic merged card. See
  // lib/tenant-modes.ts.
  | "event"
  | "hike"
  | "petting_zoo_booking";

export interface Profile {
  id: string;
  name: string;
  type: "dog" | "member" | "service" | "event" | "stall";
  mode: AppMode;
  breed?: string;
  age?: number;
  location: string;
  distance?: number;
  description: string;
  images: string[];
  videoUrl?: string;
  price?: string;
  rating?: number;
  cardColor?: string;
  tileDescription?: string;
}

export const mockProfiles: Profile[] = [
  // --- Adopt & Foster ---
  {
    id: "1",
    name: "Max",
    type: "dog",
    mode: "adopt_or_foster",
    breed: "Golden Retriever",
    age: 3,
    location: "San Francisco, CA",
    distance: 2.5,
    description: "Friendly and energetic Golden Retriever who loves hiking and swimming. Great with other dogs and kids.",
    images: [
      "https://images.unsplash.com/photo-1633722715463-d30628519d00?w=400&h=500&fit=crop",
      "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&h=500&fit=crop",
    ],
  },
  {
    id: "2",
    name: "Luna",
    type: "dog",
    mode: "adopt_or_foster",
    breed: "Husky",
    age: 2,
    location: "Oakland, CA",
    distance: 5.2,
    description: "Beautiful Husky with striking blue eyes. Loves outdoor adventures and is very social.",
    images: [
      "https://images.unsplash.com/photo-1605025614411-a2a44f7e4b0b?w=400&h=500&fit=crop",
      "https://images.unsplash.com/photo-1600011689520-08ab6fd648b1?w=400&h=500&fit=crop",
    ],
  },
  {
    id: "4",
    name: "Charlie",
    type: "dog",
    mode: "adopt_or_foster",
    breed: "Labrador",
    age: 4,
    location: "Berkeley, CA",
    distance: 8.1,
    description: "Energetic Lab who loves fetch and swimming. Perfect hiking companion for all skill levels.",
    images: [
      "https://images.unsplash.com/photo-1633722715463-d30628519d00?w=400&h=500&fit=crop",
    ],
  },
  {
    id: "6",
    name: "Bella",
    type: "dog",
    mode: "adopt_or_foster",
    breed: "Dachshund",
    age: 5,
    location: "San Francisco, CA",
    distance: 3.0,
    description: "Cute and curious Dachshund. Loves short walks and socializing at dog parks.",
    images: [
      "https://images.unsplash.com/photo-1552053831-71594a27c62d?w=400&h=500&fit=crop",
    ],
  },
  {
    id: "8",
    name: "Rocky",
    type: "dog",
    mode: "adopt_or_foster",
    breed: "German Shepherd",
    age: 6,
    location: "Palo Alto, CA",
    distance: 12.5,
    description: "Loyal and intelligent German Shepherd. Enjoys training, hiking, and playing fetch.",
    images: [
      "https://images.unsplash.com/photo-1568572933382-74d440642117?w=400&h=500&fit=crop",
    ],
  },
  // --- Pet Services ---
  {
    id: "3",
    name: "Jenna's Pet Sitting",
    type: "service",
    mode: "pet_services",
    location: "San Francisco, CA",
    description: "Professional pet sitting and dog walking services. Experienced with all breeds and ages. Insured and bonded.",
    images: [
      "https://images.unsplash.com/photo-1552053831-71594a27c62d?w=400&h=500&fit=crop",
    ],
    price: "$25-40/walk",
    rating: 4.9,
  },
  {
    id: "5",
    name: "Sarah",
    type: "member",
    mode: "pet_services",
    location: "San Francisco, CA",
    distance: 1.2,
    description: "Dog lover and outdoor enthusiast. Available for in-home pet sitting and weekend stays. References available.",
    images: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop",
    ],
    price: "$40-60/night",
    rating: 4.7,
  },
  {
    id: "7",
    name: "Outdoor Adventures Co",
    type: "service",
    mode: "pet_services",
    location: "San Francisco, CA",
    description: "Group dog walking and day care. All fitness levels welcome. Scenic trails in the Bay Area.",
    images: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=500&fit=crop",
    ],
    price: "$15-30/session",
    rating: 4.8,
  },
  {
    id: "9",
    name: "Paws & Stay",
    type: "service",
    mode: "pet_services",
    location: "Berkeley, CA",
    distance: 6.3,
    description: "Boutique pet boarding for small to medium dogs. Your pet gets a home away from home with daily updates.",
    images: [
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=500&fit=crop",
    ],
    price: "$55-75/night",
    rating: 5.0,
  },
  // --- Pet Events ---
  {
    id: "10",
    name: "Bark in the Park",
    type: "event",
    mode: "pet_events",
    location: "Golden Gate Park, SF",
    distance: 1.5,
    description: "Monthly off-leash dog meetup at Chrissy Field. Bring your pup for playtime, socialisation, and community.",
    images: [
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=500&fit=crop",
    ],
    price: "Free",
  },
  {
    id: "11",
    name: "Dog Show & Parade",
    type: "event",
    mode: "pet_events",
    location: "Dolores Park, SF",
    distance: 3.2,
    description: "Annual dog show featuring costume contest, tricks showcase, and best in show. Prizes for all categories!",
    images: [
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=500&fit=crop",
    ],
    price: "$5 entry",
  },
  {
    id: "12",
    name: "Puppy Socialisation Class",
    type: "event",
    mode: "pet_events",
    location: "Oakland Dog Training Center",
    distance: 7.8,
    description: "Structured socialisation sessions for puppies aged 8–16 weeks. Build confidence and make new friends.",
    images: [
      "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=400&h=500&fit=crop",
    ],
    price: "$20/session",
  },
  // --- Stalls & Shops ---
  {
    id: "13",
    name: "Pawsome Treats Co.",
    type: "stall",
    mode: "stalls_and_shops",
    location: "Ferry Building Market, SF",
    distance: 2.1,
    description: "Artisan dog treats baked fresh weekly. Grain-free, all-natural ingredients. Dogs go crazy for our peanut butter bites.",
    images: [
      "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=400&h=500&fit=crop",
    ],
    price: "$8–15/bag",
    rating: 4.8,
  },
  {
    id: "14",
    name: "The Dog Boutique",
    type: "stall",
    mode: "stalls_and_shops",
    location: "Castro, SF",
    distance: 4.0,
    description: "Handmade collars, leashes, and accessories for stylish pups. Custom embroidery available. Sustainable materials.",
    images: [
      "https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=400&h=500&fit=crop",
    ],
    price: "$15–60",
    rating: 4.6,
  },
  {
    id: "15",
    name: "Holistic Hound Health",
    type: "service",
    mode: "stalls_and_shops",
    location: "Mission District, SF",
    distance: 3.5,
    description: "Natural supplements, raw food blends, and wellness products for dogs. Expert nutritional advice included.",
    images: [
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=500&fit=crop",
    ],
    price: "$12–80",
    rating: 4.9,
  },
  // --- Lost & Found ---
  {
    id: "16",
    name: "Lost: Milo the Beagle",
    type: "dog",
    mode: "lost_and_found",
    breed: "Beagle",
    age: 4,
    location: "Noe Valley, SF",
    distance: 0.8,
    description: "Missing since Tuesday evening. Brown, white & tan Beagle wearing a blue collar with tag. Very friendly. Please call if seen.",
    images: [
      "https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=400&h=500&fit=crop",
    ],
  },
  {
    id: "17",
    name: "Found: Female Tabby",
    type: "dog",
    mode: "lost_and_found",
    location: "Hayes Valley, SF",
    distance: 2.3,
    description: "Found a friendly orange tabby cat near Hayes St on Sunday. No collar. Currently being cared for. Owner please contact.",
    images: [
      "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400&h=500&fit=crop",
    ],
  },
  {
    id: "18",
    name: "Lost: Pepper the Poodle",
    type: "dog",
    mode: "lost_and_found",
    breed: "Toy Poodle",
    age: 7,
    location: "Sunset District, SF",
    distance: 5.1,
    description: "White toy poodle, recently groomed with a red bandana. Answers to Pepper. Lost near Ocean Beach. Reward offered.",
    images: [
      "https://images.unsplash.com/photo-1591769225440-811ad7d6eab3?w=400&h=500&fit=crop",
    ],
  },
];
