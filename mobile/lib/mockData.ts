export interface Profile {
  id: string;
  name: string;
  type: "dog" | "member" | "service";
  breed?: string;
  age?: number;
  location: string;
  distance?: number;
  description: string;
  images: string[];
  price?: string;
  rating?: number;
}

export const mockProfiles: Profile[] = [
  {
    id: "1",
    name: "Max",
    type: "dog",
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
    id: "3",
    name: "Jenna's Pet Sitting",
    type: "service",
    location: "San Francisco, CA",
    description: "Professional pet sitting and dog walking services. Experienced with all breeds and ages. Insured and bonded.",
    images: [
      "https://images.unsplash.com/photo-1552053831-71594a27c62d?w=400&h=500&fit=crop",
    ],
    price: "$25-40/walk",
    rating: 4.9,
  },
  {
    id: "4",
    name: "Charlie",
    type: "dog",
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
    id: "5",
    name: "Sarah",
    type: "member",
    location: "San Francisco, CA",
    distance: 1.2,
    description: "Dog lover and outdoor enthusiast. Organizing weekly hiking groups for dogs and their owners.",
    images: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop",
    ],
  },
  {
    id: "6",
    name: "Bella",
    type: "dog",
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
    id: "7",
    name: "Outdoor Adventures Co",
    type: "service",
    location: "San Francisco, CA",
    description: "Group hiking events for dogs and owners. All fitness levels welcome. Scenic trails in the Bay Area.",
    images: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=500&fit=crop",
    ],
    price: "$15-30/event",
    rating: 4.8,
  },
  {
    id: "8",
    name: "Rocky",
    type: "dog",
    breed: "German Shepherd",
    age: 6,
    location: "Palo Alto, CA",
    distance: 12.5,
    description: "Loyal and intelligent German Shepherd. Enjoys training, hiking, and playing fetch.",
    images: [
      "https://images.unsplash.com/photo-1633722715463-d30628519d00?w=400&h=500&fit=crop",
    ],
  },
];
