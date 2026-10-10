// require('dotenv').config();
// const mongoose = require('mongoose');
// const connectDB = require('../config/db');
// const Category = require('../models/Category');

// // Kept in sync with the frontend's src/data/categories.js
// const categories = [
//   { id: 'food', name: 'Food & Dining', icon: 'Utensils', count: 248, popular: true },
//   { id: 'retail', name: 'Retail', icon: 'ShoppingBag', count: 185, popular: true },
//   { id: 'medical', name: 'Medical & Healthcare', icon: 'Stethoscope', count: 142, popular: true },
//   { id: 'homeservices', name: 'Home Services', icon: 'Wrench', count: 310, popular: true },
//   { id: 'autocare', name: 'Auto Care', icon: 'Car', count: 96, popular: true },
//   { id: 'beauty', name: 'Beauty & Spa', icon: 'Scissors', count: 164, popular: true },
//   { id: 'fitness', name: 'Fitness & Gym', icon: 'Dumbbell', count: 78, popular: false },
//   { id: 'electronics', name: 'Electronics', icon: 'Smartphone', count: 120, popular: false },
//   { id: 'education', name: 'Education', icon: 'GraduationCap', count: 88, popular: false },
//   { id: 'supermarket', name: 'Supermarket', icon: 'ShoppingCart', count: 105, popular: false },
// ];

// const run = async () => {
//   await connectDB();
//   await Category.deleteMany({});
//   await Category.insertMany(categories);
//   console.log(`Seeded ${categories.length} categories.`);
//   await mongoose.connection.close();
//   process.exit(0);
// };

// run().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });




require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');

/* ------------------------------------------------------------------ */
/*  Slug helper — makes clean ids from names like                      */
/*  "Accounting & Auditing" -> "accounting-auditing"                   */
/*  "Artist / Art Works"    -> "artist-art-works"                      */
/* ------------------------------------------------------------------ */
const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/* ------------------------------------------------------------------ */
/*  Source list — name + Lucide icon + optional popular flag           */
/* ------------------------------------------------------------------ */
const RAW = [
  ['Accounting & Auditing', 'Calculator'],
  ['Alkaline Health', 'Droplets'],
  ['Ambulance Services', 'Ambulance'],
  ['Architecture & Building Design', 'Building2'],
  ['Artist / Art Works', 'Palette'],
  ['Automobile & Accessories', 'Car'],
  ['Bag & Luggage', 'Briefcase'],
  ['Bakery', 'CakeSlice', true],
  ['Battery Shop', 'BatteryCharging'],
  ['Beauty & Cosmetics', 'Sparkles', true],
  ['Books & Periodicals', 'BookOpen'],
  ['Boutique', 'Shirt'],
  ['Building Materials', 'Hammer'],
  ['Business Consulting', 'Briefcase'],
  ['Career Guidance & Placement', 'GraduationCap'],
  ['Carpentry Services', 'Hammer'],
  ['Catering Services', 'UtensilsCrossed'],
  ['CCTV & Security Systems', 'Camera'],
  ['Cement & Building Materials', 'Package'],
  ['Cleaning Services', 'Brush'],
  ['Computer & Mobile', 'Smartphone'],
  ['Courier Service', 'Truck'],
  ['Crockery & Glassware', 'Coffee'],
  ['Cycle Shop', 'Bike'],
  ['Diagnostic Centre', 'Activity'],
  ['Digital Marketing & SEO', 'Megaphone'],
  ['Doctor / Medical Clinic', 'Stethoscope', true],
  ['Driving Schools', 'Car'],
  ['Electricals', 'Zap'],
  ['Electronics', 'Smartphone'],
  ['Event Management', 'PartyPopper'],
  ['Family & Career Counseling', 'Heart'],
  ['Fancy Store', 'Sparkles'],
  ['Fast Food', 'Pizza'],
  ['Fish Market', 'Fish'],
  ['Flower Shop', 'Flower'],
  ['Footwear', 'Footprints'],
  ['Furniture', 'Sofa'],
  ['Gardening & Landscaping', 'TreePine'],
  ['Gift Shop', 'Gift'],
  ['Gold & Diamonds', 'Gem'],
  ['Graphic Designing', 'Palette'],
  ['Grocery', 'ShoppingBasket', true],
  ['Gym & Wellness', 'Dumbbell', true],
  ['Hardware', 'Wrench'],
  ['Home Appliance Repair', 'Wrench'],
  ['Home Appliances', 'Refrigerator'],
  ['Home Decor', 'Lamp'],
  ['Home Nursing / Caretaking', 'HeartHandshake'],
  ['Hypermarket', 'ShoppingCart'],
  ['Insurance Office', 'Shield'],
  ['Interior Design Gallery', 'Sofa'],
  ['Jewellery', 'Gem'],
  ['Juice & Cool Bar', 'CupSoda'],
  ['Kitchen Cabinets', 'Cabinet'],
  ['Laboratory & Diagnostics', 'FlaskConical'],
  ['Land Surveying', 'Ruler'],
  ['Landscaping & Nursery', 'TreePine'],
  ['Language Training', 'Languages'],
  ['Laundry & Dry Cleaning', 'Shirt'],
  ['Leather Goods', 'Briefcase'],
  ['Legal Services / Lawyer', 'Scale'],
  ['Masonry / Construction', 'HardHat'],
  ['Mattress Shop', 'Bed'],
  ['Meat Store', 'Beef'],
  ['Medical Clinic', 'Stethoscope'],
  ['Mental Health Counselling', 'Brain'],
  ['Mobile App Development', 'Smartphone'],
  ['Music & Dance Classes', 'Music'],
  ['Musical Instruments', 'Guitar'],
  ['Optical Shop', 'Glasses'],
  ['Painting Services', 'Paintbrush'],
  ['Packers and Movers', 'Truck'],
  ['Paints & Hardware', 'Paintbrush'],
  ['Pest Control', 'Bug'],
  ['Pet Care & Veterinary Services', 'PawPrint'],
  ['Pet Shop', 'PawPrint'],
  ['Pharmacy', 'Pill', true],
  ['Pharmacy / Home Delivery', 'Pill'],
  ['Physiotherapy', 'Activity'],
  ['Plastic Products', 'Package'],
  ['Plumbing', 'Wrench'],
  ['Plumbing & Electrical Services', 'Wrench'],
  ['Plywood & Glass', 'Layers'],
  ['Printing & Xerox', 'Printer'],
  ['Real Estate Agency', 'Home', true],
  ['Restaurant', 'Utensils', true],
  ['Sanitaryware', 'Bath'],
  ['Scrap Dealer', 'Recycle'],
  ['Security Services', 'ShieldCheck'],
  ['Services', 'Settings'],
  ['Skill Development Centers', 'Award'],
  ['Social Media Management', 'Share2'],
  ['Solar Systems', 'Sun'],
  ['Spa & Salon', 'Sparkles', true],
  ['Sports & Fitness', 'Trophy'],
  ['Stage Decoration & Lighting', 'Lightbulb'],
  ['Stationery', 'PenTool'],
  ['Steel & Iron', 'Hammer'],
  ['Studio & Photography', 'Camera'],
  ['Supermarket', 'ShoppingCart', true],
  ['Tailoring & Fashion Designing', 'Scissors'],
  ['Tailoring Shop', 'Scissors'],
  ['Tax & GST Consultancy', 'Receipt'],
  ['Taxi & Cab Services', 'Car'],
  ['Textile', 'Shirt'],
  ['Tiles & Sanitaryware', 'Grid3x3'],
  ['Toys', 'ToyBrick'],
  ['Travel Agency', 'Plane', true],
  ['Tuition & Academic Coaching', 'BookOpen'],
  ['Tyre Shop', 'CircleDot'],
  ['Uniforms', 'Shirt'],
  ['Upholstery & Curtains', 'Blinds'],
  ['Vegetable & Fruits', 'Apple'],
  ['Vehicle Rentals', 'Car'],
  ['Video Editing & Motion Graphics', 'Video'],
  ['Waste Management', 'Trash2'],
  ['Water treatment', 'Droplets'],
  ['Watch & Clock Shop', 'Watch'],
  ['Web Design & Development', 'Code', true],
  ['Yoga & Fitness Training', 'Flower2'],
];

const categories = RAW.map(([name, icon, popular = false]) => ({
  id: slugify(name),
  name,
  icon,
  count: 0,
  popular,
}));

/* ------------------------------------------------------------------ */
/*  Runner                                                             */
/* ------------------------------------------------------------------ */
const run = async () => {
  await connectDB();

  // Ensure no duplicate ids slip in
  const seen = new Set();
  for (const c of categories) {
    if (seen.has(c.id)) {
      throw new Error(`Duplicate category id: ${c.id} (${c.name})`);
    }
    seen.add(c.id);
  }

  await Category.deleteMany({});
  await Category.insertMany(categories);
  console.log(`Seeded ${categories.length} categories.`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});